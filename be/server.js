// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const {
  setNewGame,
  handleEndGame,
  handleStartGame,
  addUserToGame,
} = require("./handlers");

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const message = JSON.parse(message);
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
      }

      case "startGame": {
        handleStartGame(ws);
        break;
      }

      case "endGame": {
        handleEndGame(ws);
        break;
      }

      case "sendAnswer": {
        const { foundWords } = message;
        handleSendAnswer(ws, foundWords);
      }
    }
  });
});

server.listen(3001, () => {
  console.log("Server started on http://localhost:3001/");
});
