// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const next = require("next");
const cors = require("cors");

// Backend imports
const { initRedis, closeRedis } = require("./backend/redisClient");
const dictionary = require("./backend/dictionary");
const RateLimiter = require("./backend/utils/rateLimiter");
const {
  setNewGame,
  handleEndGame,
  handleStartGame,
  addUserToGame,
  handleWordSubmission,
  handleSendAnswer,
  handleValidateWords,
  getActiveRooms,
  handleDisconnect,
  handleCloseRoom,
  handleResetGame,
  broadcastActiveRooms,
  handleChatMessage,
} = require("./backend/handlers");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Rate limiting configuration
const MESSAGE_RATE_LIMIT = parseInt(process.env.MESSAGE_RATE_LIMIT) || 50;
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 10000;

// Initialize rate limiter
const rateLimiter = new RateLimiter(MESSAGE_RATE_LIMIT, RATE_LIMIT_WINDOW);

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);

  // WebSocket server
  const wss = new WebSocket.Server({
    server: httpServer,
    perMessageDeflate: {
      zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
      zlibInflateOptions: { chunkSize: 10 * 1024 },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024
    },
    maxPayload: 100 * 1024
  });

  // Middleware
  server.disable('x-powered-by');
  server.use(cors({ origin: CORS_ORIGIN, credentials: true }));
  server.use(express.json());

  // WebSocket logic
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const clientId = Math.random().toString(36).substring(7);
    ws.clientId = clientId;
    rateLimiter.initClient(clientId);

    ws.on("message", (data) => {
      try {
        if (rateLimiter.isRateLimited(ws.clientId)) {
          ws.send(JSON.stringify({ action: "error", message: "Rate limit exceeded" }));
          return;
        }

        if (data.length > 100 * 1024) {
          ws.send(JSON.stringify({ action: "error", message: "Message too large" }));
          return;
        }

        const message = JSON.parse(data);
        const { action } = message;

        if (action === "pong" || action === "ping") {
          ws.isAlive = true;
          if (action === "ping") ws.send(JSON.stringify({ action: "pong" }));
          return;
        }

        switch (action) {
          case "createGame":
            setNewGame(message.gameCode, ws, message.roomName, message.language, message.hostUsername);
            broadcastActiveRooms(wss);
            break;
          case "join":
            addUserToGame(message.gameCode, message.username, ws);
            broadcastActiveRooms(wss);
            break;
          case "startGame":
            handleStartGame(ws, message.letterGrid, message.timerSeconds, message.language);
            break;
          case "endGame":
            handleEndGame(ws);
            break;
          case "sendAnswer":
            handleSendAnswer(ws, message.foundWords);
            break;
          case "submitWord":
            handleWordSubmission(ws, message.word);
            break;
          case "validateWords":
            handleValidateWords(ws, message.validations);
            break;
          case "getActiveRooms":
            ws.send(JSON.stringify({ action: "activeRooms", rooms: getActiveRooms() }));
            break;
          case "closeRoom":
            handleCloseRoom(ws, message.gameCode, wss);
            break;
          case "resetGame":
            handleResetGame(ws);
            break;
          case "chatMessage":
            handleChatMessage(ws, message.gameCode, message.username, message.message, message.isHost);
            break;
          default:
            console.warn(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    ws.on("close", () => {
      if (ws.clientId) rateLimiter.removeClient(ws.clientId);
      handleDisconnect(ws, wss);
    });

    ws.on("error", (error) => console.error("WebSocket error:", error));
  });

  // Heartbeat
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  // Next.js handler for all other routes
  server.use(async (req, res) => {
    try {
      const parsedUrl = require('url').parse(req.url, true);
      const { pathname, query } = parsedUrl;
      
      console.log(`[SERVER] Request: ${req.method} ${pathname}`);

      // Manual redirect for root path (since middleware might be skipped in custom server)
      if (pathname === '/') {
        const acceptLanguage = req.headers['accept-language'];
        let locale = 'he'; // Default
        
        if (acceptLanguage) {
          const browserLang = acceptLanguage.split(',')[0].split('-')[0];
          if (['en', 'he'].includes(browserLang)) {
            locale = browserLang;
          }
        }
        
        console.log(`[SERVER] Redirecting / to /${locale}`);
        res.writeHead(307, { Location: `/${locale}` });
        res.end();
        return;
      }

      if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
        console.log(`[SERVER] Serving static file: ${pathname}`);
      }
      
      // Set x-powered-by to Next.js to reassure user
      res.setHeader('X-Powered-By', 'Next.js');

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Start server
  async function startServer() {
    await initRedis();
    try {
      await dictionary.load();
    } catch (error) {
      console.error('Failed to load dictionaries:', error);
    }

    httpServer.listen(PORT, HOST, () => {
      console.log(`> Server ready on http://${HOST}:${PORT}`);
      console.log(`> WebSocket server ready`);
    });
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Closing server...');
    await closeRedis();
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  startServer();
});
