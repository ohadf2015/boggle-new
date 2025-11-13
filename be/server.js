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

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const message = JSON.parse(data);
    const { action } = message;

    switch (action) {
      case "createGame": {
        const { gameCode } = message;
        setNewGame(gameCode, ws);
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
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    handleDisconnect(ws);
  });
});

// Catch-all route for React SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../fe/build/index.html"));
});

server.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}/`);
  console.log(`WebSocket server running on ws://${HOST}:${PORT}/`);
});
