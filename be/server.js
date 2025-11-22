// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const { initRedis, closeRedis } = require("./redisClient");
const dictionary = require("./dictionary");

const app = express();
const server = http.createServer(app);

// WebSocket server with compression and configuration
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024 // Only compress messages > 1KB
  },
  maxPayload: 100 * 1024 // 100KB max message size
});

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Rate limiting configuration
const MESSAGE_RATE_LIMIT = parseInt(process.env.MESSAGE_RATE_LIMIT) || 50; // messages per interval
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 10000; // 10 seconds

// Initialize rate limiter
const rateLimiter = new RateLimiter(MESSAGE_RATE_LIMIT, RATE_LIMIT_WINDOW);

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../fe/build")));

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
} = require("./handlers");
const RateLimiter = require("./utils/rateLimiter");

// Heartbeat mechanism to keep connections alive
const heartbeatInterval = 30000; // 30 seconds
const connectionTimeout = 60000; // 60 seconds

wss.on("connection", (ws) => {
  // Set up heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Initialize rate limiting for this connection
  const clientId = Math.random().toString(36).substring(7);
  ws.clientId = clientId;
  rateLimiter.initClient(clientId);

  ws.on("message", (data) => {
    try {
      // Rate limiting check
      if (rateLimiter.isRateLimited(ws.clientId)) {
        ws.send(JSON.stringify({
          action: "error",
          message: "Rate limit exceeded. Please slow down."
        }));
        return;
      }

      // Validate message size (should be caught by maxPayload, but double check)
      if (data.length > 100 * 1024) {
        console.warn(`[WS] Message too large: ${data.length} bytes`);
        ws.send(JSON.stringify({
          action: "error",
          message: "Message too large"
        }));
        return;
      }

      const message = JSON.parse(data);
      const { action } = message;

      // Handle ping/pong responses
      if (action === "pong" || action === "ping") {
        ws.isAlive = true;
        // Respond to ping with pong
        if (action === "ping") {
          ws.send(JSON.stringify({ action: "pong" }));
        }
        return;
      }

      switch (action) {
        case "createGame": {
          const { gameCode, roomName, language } = message;
          setNewGame(gameCode, ws, roomName, language);
          break;
        }
        case "join": {
          const { gameCode, username } = message;
          addUserToGame(gameCode, username, ws);
          break;
        }
        case "startGame": {
          const { letterGrid, timerSeconds, language } = message;
          handleStartGame(ws, letterGrid, timerSeconds, language);
          break;
        }
        case "endGame": {
          handleEndGame(ws);
          break;
        }
        case "sendAnswer": {
          const { foundWords } = message;
          handleSendAnswer(ws, foundWords);
          break;
        }
        case "submitWord": {
          const { word } = message;
          handleWordSubmission(ws, word);
          break;
        }
        case "validateWords": {
          const { validations } = message;
          handleValidateWords(ws, validations);
          break;
        }
        case "getActiveRooms": {
          const rooms = getActiveRooms();
          ws.send(JSON.stringify({ action: "activeRooms", rooms }));
          break;
        }
        case "closeRoom": {
          const { gameCode } = message;
          handleCloseRoom(ws, gameCode);
          break;
        }
        case "resetGame": {
          handleResetGame(ws);
          break;
        }
        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      console.error("Message data:", data.toString());
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // Clean up rate limiting
    if (ws.clientId) {
      rateLimiter.removeClient(ws.clientId);
    }
    handleDisconnect(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Heartbeat ping interval to keep connections alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log("Client connection timeout, terminating...");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, heartbeatInterval);

wss.on('close', () => {
  clearInterval(pingInterval);
});

// Catch-all route for React SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../fe/build/index.html"));
});

// Initialize Redis and start server
async function startServer() {
  // Try to initialize Redis (non-blocking)
  await initRedis();

  // Load dictionaries (non-blocking)
  try {
    await dictionary.load();
  } catch (error) {
    console.error('Failed to load dictionaries, continuing without dictionary validation:', error);
  }

  server.listen(PORT, HOST, () => {
    console.log(`Server started on http://${HOST}:${PORT}/`);
    console.log(`WebSocket server running on ws://${HOST}:${PORT}/`);
    console.log(`Heartbeat interval: ${heartbeatInterval}ms`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');
  await closeRedis();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
