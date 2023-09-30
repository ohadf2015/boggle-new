// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const games = {}; // { gameCode: { users: { username1: ws1, username2: ws2, ... }, host: wsHost } }

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const { action, gameCode, username } = JSON.parse(message);

    if (action === "join") {
      if (!games[gameCode]) {
        games[gameCode] = { users: {}, host: ws };
        console.log(`Created game ${gameCode}`);
      }
      
      games[gameCode].users[username] = ws;

      const isHost = games[gameCode].host === ws;
      ws.send(JSON.stringify({ action: "joined", gameCode, username, isHost }));

      if (!isHost) {
        // Update only the host about the new user
        games[gameCode].host.send(
          JSON.stringify({
            action: "updateUsers",
            users: Object.keys(games[gameCode].users),
          })
        );
      }
    }
    if (action === "endGame") {
        if (games[gameCode]) {
          // Broadcast the "endGame" message to all users and the host
          Object.values(games[gameCode].users).forEach((userWs) => {
            userWs.send(JSON.stringify({ action: "endGame" }));
          });
          games[gameCode].host.send(JSON.stringify({ action: "endGame" }));
        }
      }
  }); 
});

server.listen(3001, () => {
  console.log("Server started on http://localhost:3001/");
});
