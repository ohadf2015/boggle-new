import React, { useState, useEffect } from "react";
import { Typography, List, ListItem, Button, TextField } from "@mui/material";
import '../style/animation.scss'; 
import { generateRandomTable } from "../utils/utils"

const HostScreen = ({ gameCode, users }) => {
  const [tableData, setTableData] = useState(generateRandomTable());
  const [timerValue, setTimerValue] = useState('');
  const [remainingTime, setRemainingTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    let timer;
    if (remainingTime !== null && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prevTime) => Math.max(prevTime - 1, 0));
      }, 1000);
    } else if (remainingTime === 0) {
      // Emit a message to end the game through WebSocket
      // For example: socket.emit("endGame");
      clearInterval(timer);
      // Show a popup and then navigate to the score page
      alert("Game Over! Navigating to score page...");
      // Navigate to the score page (assuming the route is '/score')
      // history.push('/score');
    }
  
    return () => clearInterval(timer);
  }, [remainingTime]);

  const startGame = () => {
    setTableData(generateRandomTable());
    setRemainingTime(timerValue * 60);
    setGameStarted(true);
  };

  const stopGame = () => {
    setRemainingTime(null);
    setGameStarted(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#f2f2f2" }}>
           <div className="animated-title">  
      <span className="text">Boggle</span>
    </div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: 'wrap' }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "16px", marginRight: "16px" }}>
          <Typography variant="h6">Game Code: {gameCode}</Typography>
          <Typography variant="h6">Players in Room:</Typography>
          <List>
            {users.map((user, index) => (
              <ListItem key={index}>{user}</ListItem>
            ))}
          </List>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#ffffff", borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 70px)", gap: "20px", borderRadius: "12px"}}>
            {tableData.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  style={{
                    width: "70px",
                    height: "70px",
                    border: "1px solid black",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "28px",
                    backgroundColor: "white",
                    borderRadius: "12px",
                  }}
                >
                  {cell}
                </div>
              ))
            )}
          </div>
          {remainingTime !== null && <Typography variant="h6">Time Remaining: {Math.floor(remainingTime / 60)}:{remainingTime % 60}</Typography>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: "16px" }}>
          {!gameStarted ? (
            <>
              <TextField 
                label="Timer (min)" 
                variant="outlined" 
                type="number" 
                value={timerValue}
                onChange={(e) => setTimerValue(e.target.value)}
              />
              <Button 
                variant="contained" 
                color="primary" 
                disabled={!timerValue} 
                onClick={startGame}
                style={{ marginTop: "16px" }}
              >
                Start Game
              </Button>
            </>
          ) : (
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={stopGame}
              style={{ marginTop: "16px" }}
            >
              Stop Game
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostScreen;
