import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaUsers, FaTrophy, FaClock, FaStar } from 'react-icons/fa';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const HowToPlay = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-4"
    >
      <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-indigo-700 flex items-center justify-center gap-3">
          <FaGamepad className="text-4xl" />
          איך משחקים בוגל?
        </h2>

        {/* Main Description */}
        <div className="mb-8 text-center">
          <p className="text-lg text-gray-700 leading-relaxed">
            <strong>בוגל</strong> הוא משחק מילים רב משתתפים חוויתי בעברית, מושלם למשפחות וחברים!
            <br />
            מצאו כמה שיותר מילים בזמן המוגבל וצברו נקודות להשגת המקום הראשון! 🏆
          </p>
        </div>

        {/* Game Steps */}
        <div className="space-y-6 mb-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaUsers className="text-indigo-600" />
                צרו או הצטרפו למשחק
              </h3>
              <p className="text-gray-600 leading-relaxed">
                המארח יוצר חדר משחק חדש ושולח את קוד החדר לשחקנים.
                שחקנים מצטרפים באמצעות הקוד או סריקת QR.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaClock className="text-indigo-600" />
                המארח מתחיל את המשחק
              </h3>
              <p className="text-gray-600 leading-relaxed">
                המארח בוחר רמת קושי (גודל הלוח) ומגדיר את משך המשחק.
                לחיצה על "התחל משחק" מתחילה את הספירה לאחור!
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
              3
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaStar className="text-indigo-600" />
                מצאו מילים על הלוח
              </h3>
              <p className="text-gray-600 leading-relaxed">
                חפשו מילים בעברית על לוח האותיות.
                מילים צריכות להיות רצופות (אופקית, אנכית או אלכסונית).
                <br />
                <strong className="text-indigo-700">שימו לב:</strong> לא ניתן להשתמש באותה משבצת פעמיים באותה מילה!
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
              4
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaTrophy className="text-indigo-600" />
                צברו נקודות והשיגו הישגים
              </h3>
              <p className="text-gray-600 leading-relaxed">
                מילים ארוכות יותר = יותר נקודות!
                <br />
                השיגו הישגים מיוחדים במהלך המשחק ותראו אותם בזמן אמת.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Scoring System */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-indigo-700">
            מערכת ניקוד 🎯
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-gray-400 to-gray-500 text-white">
              2-3 אותיות: 1 נקודה
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-blue-400 to-blue-500 text-white">
              4 אותיות: 2 נקודות
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-green-400 to-green-500 text-white">
              5 אותיות: 3 נקודות
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
              6 אותיות: 5 נקודות
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-orange-400 to-orange-500 text-white">
              7 אותיות: 7 נקודות
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-red-400 to-red-500 text-white">
              8 אותיות: 10 נקודות
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-purple-400 to-purple-500 text-white col-span-2">
              9+ אותיות: 10+ נקודות
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            ⚠️ <strong>שימו לב:</strong> מילים כפולות (שמצאו כמה שחקנים) לא מקבלות נקודות!
          </p>
        </div>

        {/* Achievements */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 mb-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-orange-700">
            הישגים מיוחדים 🏆
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span><strong>דם ראשון:</strong> ראשון למצוא מילה</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span><strong>שד המהירות:</strong> 10 מילים ב-2 דקות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <span><strong>אדון המילים:</strong> מילה בת 7+ אותיות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span><strong>מלך הקומבו:</strong> 5 מילים ברצף</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span><strong>פרפקציוניסט:</strong> כל המילים תקינות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span><strong>צייד אוצרות:</strong> מילה בת 8+ אותיות</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-green-700">
            טיפים למשחק מנצח 💡
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>התחילו עם מילים קצרות כדי לצבור מהר נקודות ראשונות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>חפשו מילים ארוכות - הן שוות הרבה יותר נקודות!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>שימו לב לאותיות נדירות כמו ט, ץ, ע - יכולות ליצור מילים ייחודיות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>אל תפחדו לנסות - מילים שגויות לא מורידות נקודות</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>עקבו אחרי הרמזים על שחקנים אחרים כדי לדעת מה המצב</span>
            </li>
          </ul>
        </div>

        {/* Ready to Play */}
        <div className="mt-8 text-center">
          <p className="text-xl font-bold text-indigo-700 mb-2">
            מוכנים? בואו נתחיל לשחק! 🎮
          </p>
          <p className="text-gray-600">
            משחק חוויתי ומהנה לכל המשפחה - חינמי לחלוטין!
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default HowToPlay;
