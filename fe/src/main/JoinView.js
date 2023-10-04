import React from "react";
import { Button, Typography, Box, Paper } from "@mui/material";
import { Link } from "react-router-dom"; // Import Link from React Router

const JoinView = () => {
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
          Welcome to the Game
        </Typography>
        <Link to="/create-game" style={{ textDecoration: "none" }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
          >
            Create Game
          </Button>
        </Link>
        <Link to="/join-game" style={{ textDecoration: "none" }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            style={{ marginTop: "10px" }}
          >
            Join Game
          </Button>

        </Link>

      </Paper>
    </Box>
  );
};

export default JoinView;
