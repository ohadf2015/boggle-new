import React, { useState, useEffect, useContext } from "react";
import { Button, Typography, Box, Paper, TextField } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import GameList from "components/GameList";
import { WebSocketContext } from "utils/WebSocketContext";


const JoinGameView = () => {
    const navigate = useNavigate();
    const { gameCode } = useParams();
    const [username, setUsername] = useState("");
    const [activeGamesData, setActiveGamesData] = useState([]);
    const [selectedGame, setSelectedGame] = useState("");

    const ws = useContext(WebSocketContext);


    useEffect(() => {
        const fetchData = async () => {
            // Wait for the WebSocket connection to be established
            await new Promise((resolve) => {
                if (ws.readyState === WebSocket.OPEN) {
                    resolve();
                } else {
                    // Listen for the WebSocket's "open" event to know when it's ready
                    ws.addEventListener("open", () => {
                        resolve();
                    });
                }
            });

            ws.send(JSON.stringify({ action: "getActiveGames" }));

            // Listen for messages from the server
            ws.onmessage = (event) => {
                const { action, activeGames } = JSON.parse(event.data);
                if (action === "activeGames") {
                    setActiveGamesData((activeGames) => {
                        // // Merge the new data with the previous state
                        // return [...prevActiveGamesData, ...activeGames];
                    });
                }
                console.log(activeGamesData, 'active');
            };
        };

        fetchData();
    }, [ws]);


    const handleSelectGame = (game) => {
        setSelectedGame(game);
    };

    const handleStartGame = () => {
        if (username && selectedGame) {
            navigate(`/play-game/${selectedGame}/${username}`);
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
                <Typography variant="h6" align="center" gutterBottom>
                    Choose a Game to Join:
                </Typography>
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
