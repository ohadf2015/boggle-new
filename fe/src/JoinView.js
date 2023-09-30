import React from "react";
import { TextField, Button, Typography } from "@mui/material";

const JoinView = ({ handleJoin, gameCode, username, setGameCode, setUsername }) => {
  return (
    <>
      <Typography variant="h4">טקסט</Typography>
      <TextField label="Game Code" variant="outlined" value={gameCode} onChange={(e) => setGameCode(e.target.value)} />
      <TextField label="Username" variant="outlined" value={username} onChange={(e) => setUsername(e.target.value)} />
      <Button variant="contained" color="primary" onClick={handleJoin}>Join</Button>
    </>
  );
};

export default JoinView;
