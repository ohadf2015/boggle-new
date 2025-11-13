import React, { useState, useEffect } from "react";
import HostView from "./host/HostView";
import PlayerView from "./player/PlayerView";
import JoinView from "./JoinView";
import ResultsPage from './ResultsPage';

import { WebSocketContext } from "utils/WebSocketContext";

// Dynamically determine WebSocket URL based on environment
const getWebSocketURL = () => {
  // If REACT_APP_WS_URL is set, use it
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // Development mode: connect to backend on port 3001
  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:3001';
  }

  // Production: construct URL based on current location
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}`;
};

const ws = new WebSocket(getWebSocketURL());

function App() {
  // Check for room code in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const roomFromUrl = urlParams.get('room');

  // Load saved username from localStorage
  const savedUsername = localStorage.getItem('boggle_username') || "";

  const [gameCode, setGameCode] = useState(roomFromUrl || "");
  const [username, setUsername] = useState(savedUsername);
  const [isActive, setIsActive] = useState(false);

  const [isHost, setIsHost] = useState(false);

  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [activeRooms, setActiveRooms] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState(null);

  const sendMessage = (message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => {
        ws.send(JSON.stringify(message));
        ws.removeEventListener('open', onOpen);
      };
      ws.addEventListener('open', onOpen);
    }
  };

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
        // Save username to localStorage on successful join
        localStorage.setItem('boggle_username', username);
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
      sendMessage({ action: "getActiveRooms" });
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendMessage({ action: "getActiveRooms" });
    }
  }, []);

  const handleJoin = (isHostMode) => {
    setError("");

    if (isHostMode) {
      sendMessage({ action: "createGame", gameCode, username });
    } else {
      sendMessage({ action: "join", gameCode, username });
    }
  };

  const refreshRooms = () => {
    sendMessage({ action: "getActiveRooms" });
  };

  const handleReturnToRoom = () => {
    setShowResults(false);
    setResultsData(null);
  };

  return (
    <WebSocketContext.Provider value={ws}>
      {showResults ? (
        <ResultsPage
          finalScores={resultsData?.scores}
          letterGrid={resultsData?.letterGrid}
          gameCode={gameCode}
          onReturnToRoom={handleReturnToRoom}
        />
      ) : (!isActive) ? (
        <JoinView
          handleJoin={handleJoin}
          gameCode={gameCode}
          username={username}
          setGameCode={setGameCode}
          setUsername={setUsername}
          error={error}
          activeRooms={activeRooms}
          refreshRooms={refreshRooms}
          prefilledRoom={roomFromUrl}
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
            onShowResults={(data) => {
              setResultsData(data);
              setShowResults(true);
            }}
          />
        )
      }
    </WebSocketContext.Provider>
  );
}

export default App;
