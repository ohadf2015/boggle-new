// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

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
} = require("./handlers");

// Heartbeat mechanism to keep connections alive
const heartbeatInterval = 30000; // 30 seconds
const connectionTimeout = 60000; // 60 seconds

wss.on("connection", (ws) => {
  // Set up heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      const { action } = message;

      // Handle pong responses
      if (action === "pong") {
        ws.isAlive = true;
        return;
      }

      switch (action) {
        case "createGame": {
          const { gameCode, username } = message;
          setNewGame(gameCode, ws, username);
          break;
        }
        case "join": {
          const { gameCode, username } = message;
          addUserToGame(gameCode, username, ws);
          break;
        }
        case "startGame": {
          const { letterGrid, timerSeconds } = message;
          handleStartGame(ws, letterGrid, timerSeconds);
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

server.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}/`);
  console.log(`WebSocket server running on ws://${HOST}:${PORT}/`);
  console.log(`Heartbeat interval: ${heartbeatInterval}ms`);
});
