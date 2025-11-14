import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa';

const ScorePage = ({ scores }) => {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <motion.h2
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-5xl font-bold my-8 text-white drop-shadow-lg"
      >
        🏆 תוצאות המשחק
      </motion.h2>

      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-lg shadow-2xl border-none">
        <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-center gap-3 text-2xl">
            <FaTrophy className="text-3xl" />
            טבלת המובילים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ul className="space-y-4">
            {scores.map((score, index) => (
              <motion.li
                key={index}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className={`
                  flex items-center justify-between p-4 rounded-lg transition-all duration-300
                  ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white scale-105 shadow-xl' :
                    index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 shadow-lg' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg' :
                    'bg-gray-100 hover:bg-gray-200 shadow-md'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold min-w-[40px] text-center">
                    {index === 0 ? <FaTrophy className="text-yellow-200" /> :
                     index === 1 ? <FaMedal className="text-gray-600" /> :
                     index === 2 ? <FaMedal className="text-orange-300" /> :
                     `#${index + 1}`}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{score.username}</div>
                    <div className="text-sm opacity-80 flex items-center gap-2">
                      <FaStar className="text-yellow-300" />
                      {score.points} נקודות
                    </div>
                  </div>
                </div>
                <Badge
                  variant={index < 3 ? "default" : "secondary"}
                  className={`text-lg px-4 py-2 ${
                    index === 0 ? 'bg-yellow-200 text-yellow-900' :
                    index === 1 ? 'bg-gray-200 text-gray-800' :
                    index === 2 ? 'bg-orange-200 text-orange-900' :
                    ''
                  }`}
                >
                  {score.points}
                </Badge>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Confetti effect for winner */}
      {scores.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-white text-2xl font-bold drop-shadow-lg">
            🎉 מזל טוב {scores[0]?.username}! 🎉
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ScorePage;
