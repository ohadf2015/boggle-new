import React, { useState, useEffect } from 'react';
import { Typography, Button, TextField, List, ListItem, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import '../style/animation.scss';

import { useWebSocket } from "../utils/WebSocketContext";


const PlayerView = () => {

  const ws = useWebSocket();
  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);

  ws.onmessage = (event) => {
    const { action } = JSON.parse(event.data);
    if (action === "endGame") {
      ws.send(JSON.stringify({ action: "sendAnswer", foundWords }));
    }
  };

  const addWord = () => {
    if (word) {
      setFoundWords((prevWords) => [...prevWords, word]);
      setWord('');
    }
  };

  const removeWord = (index) => {
    setFoundWords((prevWords) => prevWords.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addWord();
    }
  };
  // Add this in a useEffect in your PlayerView.js
  useEffect(() => {

    // Listen for the 'endGame' message from the server


    // Listen for the 'endGame' message from the server
    // Replace the alert with your logic to navigate to the score page
    const handleEndGame = () => {
      alert("Game Over! Navigating to score page...");
      // Navigate to the score page (assuming the route is '/score')
      // history.push('/score');
    };

    // Simulate receiving the 'endGame' event (you can replace this with your actual WebSocket code)
    // For example: socket.on("endGame", handleEndGame);

    // Cleanup by removing the event listener when the component unmounts
    // Replace this with your actual WebSocket cleanup logic
    // return () => socket.off("endGame", handleEndGame);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', backgroundColor: '#f2f2f2' }}>
      <div className="animated-title" style={{ marginTop: '20px' }}>
        <span className="text">Boggle</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', flexGrow: 1 }}>
        <div style={{ maxHeight: '500px', overflowY: 'auto', marginRight: '16px' }}> {/* Scrollable List */}
          <Typography variant="h6">Found Words:</Typography>
          <List>
            {foundWords.map((foundWord, index) => (
              <ListItem style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }} key={index}>
                {foundWord}
                <IconButton edge="end" aria-label="delete" onClick={() => removeWord(index)}>
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <TextField
            label="Enter word"
            variant="outlined"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button variant="contained" color="primary" onClick={addWord} style={{ marginTop: '16px' }}>
            Add Word
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlayerView;
