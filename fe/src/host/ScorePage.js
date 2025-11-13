import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const ScorePage = ({ scores }) => {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h2 className="text-4xl font-bold my-5">Game Scores</h2>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {scores.map((score, index) => (
              <li key={index} className="text-lg">
                {`${score.username}: ${score.points} Points`}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScorePage;
