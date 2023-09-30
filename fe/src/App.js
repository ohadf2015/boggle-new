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

  useEffect(() => {
    ws.onmessage = (event) => {
      const { action, users, isHost } = JSON.parse(event.data);
      if (action === "updateUsers") {
        setUsers(users);
      }
      if (action === "joined") {
        setIsHost(isHost);
        setIsActive(true);
        
      }
    };
  }, []);

  const handleJoin = () => {
    ws.send(JSON.stringify({ action: "join", gameCode, username }));
  };

  // Sample scores data
  const scores = [
    { username: 'Alice', points: 100 },
    { username: 'Bob', points: 90 },
    { username: 'Charlie', points: 85 },
  ];
  return (
    <WebSocketContext.Provider value={ws}>

    <Container>

      {
        (!isActive) ? (
          <JoinView
            handleJoin={handleJoin}
            gameCode={gameCode}
            username={username}
            setGameCode={setGameCode}
            setUsername={setUsername}
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
            )}
            <ScorePage scores={scores} />
    </Container>
    </WebSocketContext.Provider>
  );
}

export default App;
