import React, { useState, useContext, useEffect } from "react";
import { Button, Typography, Box, Paper, TextField } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import GameList from "components/GameList";
import { WebSocketContext } from "utils/WebSocketContext";


const JoinGameView = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [activeGamesData, setActiveGamesData] = useState([]);
    const [selectedGame, setSelectedGame] = useState("");

    const ws = useContext(WebSocketContext);
    

    useEffect(() => {
        const handleOpen = () => {
            ws.send(JSON.stringify({ action: "getActiveGames" }));
            ws.onmessage = (event) => {
                const { action, activeGames } = JSON.parse(event.data);
                if (action === "activeGames") {
                    setActiveGamesData(activeGames);
                }
            };
        };
    
        if (ws.readyState === WebSocket.OPEN) {
            handleOpen();
        } else {
            ws.onopen = handleOpen;
        }
    }, [ws]);
    
  

    const handleSelectGame = (game) => {
        setSelectedGame(game);
    };

    const handleStartGame = () => {
        if (username && selectedGame) {
            navigate(`/play-game/${selectedGame}/${username}`);
            ws.send(JSON.stringify({ action: "join", gameCode: selectedGame, username }));
        } else {
            alert("Please enter your name and select a game.");
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
                    Enter Your Name
                </Typography>
                <TextField
                    label="Username"
                    variant="outlined"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                {/* Use the GameList component to display active games */}
                <GameList games={activeGamesData} selectedGame={selectedGame} onSelectGame={handleSelectGame} />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleStartGame}
                    style={{ marginTop: "10px" }}
                >
                    Start Game
                </Button>
            </Paper>
        </Box>
    );
};

export default JoinGameView;
