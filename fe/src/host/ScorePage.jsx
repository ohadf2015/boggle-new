import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa';

const ScorePage = ({ scores }) => {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.h2
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-5xl font-bold my-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400"
      >
        🏆 תוצאות המשחק
      </motion.h2>

      <Card className="w-full max-w-2xl bg-slate-800/90 backdrop-blur-md shadow-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
        <CardHeader className="bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white rounded-t-lg border-b border-yellow-400/30">
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
                  flex items-center justify-between p-4 rounded-lg transition-all duration-300 border
                  ${index === 0 ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white scale-105 shadow-xl border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' :
                    index === 1 ? 'bg-gradient-to-r from-gray-400/80 to-gray-500/80 text-white shadow-lg border-gray-400/50' :
                    index === 2 ? 'bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white shadow-lg border-orange-400/50' :
                    'bg-slate-700/50 hover:bg-slate-700 text-white shadow-md border-slate-600/50'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold min-w-[40px] text-center">
                    {index === 0 ? <FaTrophy className="text-yellow-200" /> :
                     index === 1 ? <FaMedal className="text-gray-200" /> :
                     index === 2 ? <FaMedal className="text-orange-200" /> :
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
                    index === 0 ? 'bg-yellow-300/90 text-yellow-900' :
                    index === 1 ? 'bg-gray-300/90 text-gray-800' :
                    index === 2 ? 'bg-orange-300/90 text-orange-900' :
                    'bg-slate-600 text-white'
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
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-2xl font-bold">
            מזל טוב {scores[0]?.username}!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ScorePage;
