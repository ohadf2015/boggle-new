import React, { useState } from "react";
import { Button, Typography, TextField, Box, Paper, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../utils/WebSocketContext";


const CreateGameView = ({ gameCode, setGameCode }) => {

    const ws = useWebSocket();

    const [timer, setTimer] = useState(5);
    const [numPlayers, setNumPlayers] = useState("");
    const hostUsername = "host";

    const navigate = useNavigate();

    const generateGameCode = () => {
        // Generate a random alphanumeric code (e.g., AAA123)
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setGameCode(code);
    };

    const handleCreate = () => {
        // Validate game code and other settings if needed
        if (gameCode && timer > 0) {
            // Navigate to the HostView page with the appropriate URL
            navigate(`/host-game/${gameCode}/${hostUsername}`);

            ws.send(JSON.stringify({ action: "createGame", gameCode }));

        } else {
            alert("Please fill in all required fields.");
        }
    };

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
        >
            <Paper elevation={3} style={{ padding: "20px", maxWidth: "300px" }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Create Game
                </Typography>
                <TextField
                    label="Game Code"
                    variant="outlined"
                    fullWidth
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={generateGameCode}
                    style={{ marginTop: "10px" }}
                >
                    Generate Code
                </Button>
                <TextField
                    label="Timer (minutes)"
                    variant="outlined"
                    fullWidth
                    type="number"
                    value={timer}
                    onChange={(e) => setTimer(Math.max(0, parseInt(e.target.value)))}
                    style={{ marginTop: "10px" }}
                />
                <FormControl fullWidth style={{ marginTop: "10px" }}>
                    <InputLabel>Number of Players (Optional)</InputLabel>
                    <Select
                        value={numPlayers}
                        onChange={(e) => setNumPlayers(e.target.value)}
                    >
                        <MenuItem value="">Not Specified</MenuItem>
                        <MenuItem value={2}>2 Players</MenuItem>
                        <MenuItem value={3}>3 Players</MenuItem>
                        <MenuItem value={4}>4 Players</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleCreate}
                    style={{ marginTop: "20px" }}
                >
                    Create Game
                </Button>
            </Paper>
        </Box>
    );
};

export default CreateGameView;
