// GameList.js
import React from "react";
import { List, ListItem, Button } from "@mui/material";

const GameList = ({ games, selectedGame, onSelectGame }) => {

    return (
        <div>
            <h2>Choose a Game to Join:</h2>
            <List>
                {(games || []).map((game, index) => (
                    <ListItem key={index}>
                        <Button variant={selectedGame === game ? "contained" : "outlined"} onClick={() => onSelectGame(game)}>
                            {game}
                        </Button>
                    </ListItem>
                ))}
            </List>
        </div>
    );
};

export default GameList;
