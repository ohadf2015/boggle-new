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
  handleWordSubmission,
  handleSendAnswer,
  handleValidateWords,
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
        const { letterGrid } = message;
        handleStartGame(ws, letterGrid);
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
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(3001, () => {
  console.log("Server started on http://localhost:3001/");
});
