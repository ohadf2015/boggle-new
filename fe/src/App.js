import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HostView from "./host/HostView";
import PlayerView from "./player/PlayerView";
import JoinView from "./main/JoinView";
import CreateGameView from "./main/CreateGameView"
import JoinGameView from "main/JoinGameView";

import { WebSocketContext } from "utils/WebSocketContext";
const ws = new WebSocket("ws://localhost:3001");

function App() {
  const [gameCode, setGameCode] = useState("");
  const [username, setUsername] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeGames, setActiveGames] = useState([]);

  useEffect(() => {
    ws.onmessage = (event) => {
      const { action, users, isHost, activeGames } = JSON.parse(event.data);
      if (action === "updateUsers") {
        setUsers(users);
      }
      if (action === "joined") {
        setIsHost(isHost);
        setIsActive(true);

      }
      if (action === "activeGames") {
        // Handle the list of active games received from the server
        console.log("Active Games:", activeGames);
        // Update your component's state with the list of active games
        setActiveGames(activeGames);
      }
    };
  }, []);

  const handleJoin = () => {
    ws.send(JSON.stringify({ action: "join", gameCode, username }));
  };

  return (
    <WebSocketContext.Provider value={ws}>

      <>
        <Routes>
          <Route path="/" element={<Navigate replace to="/join-view" />} />
          <Route path="/join-view" element={<JoinView />} />
          <Route path="/create-game" element={<CreateGameView handleJoin={handleJoin} gameCode={gameCode} username={username} setGameCode={setGameCode} setUsername={setUsername} />} />
          <Route path="/join-game" element={<JoinGameView />} />
          <Route path="/host-game/:gameCode/:username" element={<HostView gameCode={gameCode} users={users} />} />
          <Route path="/play-game/:gameCode/:username" element={<PlayerView handleJoin={handleJoin} gameCode={gameCode} username={username} setGameCode={setGameCode} setUsername={setUsername} />} />
        </Routes>
      </>
    </WebSocketContext.Provider>
  );
}

export default App;
