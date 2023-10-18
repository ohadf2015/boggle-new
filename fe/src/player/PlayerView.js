import React, { useState } from 'react';
import { Typography, Button, TextField, List, ListItem, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import '../style/animation.scss';

import { useWebSocket } from "../utils/WebSocketContext";


const PlayerView = () => {

  const ws = useWebSocket();
  const [word, setWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);

  const gameCode = window.location.pathname.split("/")[2];
  const username = window.location.pathname.split("/")[3];

  ws.onmessage = (event) => {
    const { action } = JSON.parse(event.data);
    if (action === "endGame") {
      ws.send(JSON.stringify({ action: "sendAnswer", foundWords, gameCode, username }));
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
