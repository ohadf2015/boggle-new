import React from 'react';
import { Typography, List, ListItem } from '@mui/material';

const ScorePage = ({ scores }) => {   return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', backgroundColor: '#f2f2f2' }}>
      <Typography variant="h2" style={{ margin: '20px 0' }}>Game Scores</Typography>
      <List>
        {scores.map((score, index) => (
          <ListItem key={index}>
            <Typography variant="h6">{`${score.username}: ${score.points} Points`}</Typography>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default ScorePage;
