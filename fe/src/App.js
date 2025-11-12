import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import HostView from "./host/HostView";
import PlayerView from "./player/PlayerView";
import JoinView from "./JoinView";
import ScorePage from './host/ScorePage';

import { WebSocketContext } from "utils/WebSocketContext";
const ws = new WebSocket("ws://localhost:3001");

function App() {
  const [gameCode, setGameCode] = useState("");
  const [username, setUsername] = useState("");
  const [isActive, setIsActive] = useState(false);

  const [isHost, setIsHost] = useState(false);

  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState([]);

  useEffect(() => {
    ws.onmessage = (event) => {
      const { action, users, isHost, rooms } = JSON.parse(event.data);

      if (action === "updateUsers") {
        setUsers(users);
      }

      if (action === "joined") {
        setIsHost(isHost);
        setIsActive(true);
        setError("");
      }

      if (action === "gameDoesNotExist") {
        setError("Game code does not exist. Please check and try again.");
        setIsActive(false);
      }

      if (action === "usernameTaken") {
        setError("Username is already taken in this game. Please choose another.");
        setIsActive(false);
      }

      if (action === "gameExists") {
        setError("Game code already exists. Please choose a different code.");
        setIsActive(false);
        setIsHost(false);
      }

      if (action === "activeRooms") {
        setActiveRooms(rooms || []);
      }
    };

    // Request active rooms when app loads
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "getActiveRooms" }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "getActiveRooms" }));
    }
  }, []);

  const handleJoin = (isHostMode) => {
    setError(""); // Clear any previous errors

    if (isHostMode) {
      ws.send(JSON.stringify({ action: "createGame", gameCode }));
      // Don't set state here - wait for server confirmation
    } else {
      ws.send(JSON.stringify({ action: "join", gameCode, username }));
      // Don't set state here - wait for server confirmation
    }
  };

  const refreshRooms = () => {
    ws.send(JSON.stringify({ action: "getActiveRooms" }));
  };

  // Sample scores data
  const scores = [
    { username: 'Alice', points: 100 },
    { username: 'Bob', points: 90 },
    { username: 'Charlie', points: 85 },
  ];
  return (
    <WebSocketContext.Provider value={ws}>
      {(!isActive) ? (
        <JoinView
          handleJoin={handleJoin}
          gameCode={gameCode}
          username={username}
          setGameCode={setGameCode}
          setUsername={setUsername}
          error={error}
          activeRooms={activeRooms}
          refreshRooms={refreshRooms}
        />
      ) :
        isHost ? (<HostView gameCode={gameCode} users={users} />) :
        (
          <PlayerView
            handleJoin={handleJoin}
            gameCode={gameCode}
            username={username}
            setGameCode={setGameCode}
            setUsername={setUsername}
          />
        )
      }
    </WebSocketContext.Provider>
  );
}

export default App;
