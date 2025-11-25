import React from 'react';
import { motion } from 'framer-motion';
import { FaGamepad, FaUsers, FaTrophy, FaClock, FaStar } from 'react-icons/fa';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';

const HowToPlay = () => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-2 sm:p-3 md:p-4"
    >
      <Card className="p-4 sm:p-5 md:p-6 bg-white/95 backdrop-blur-sm shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-indigo-700 flex items-center justify-center gap-3">
          <FaGamepad className="text-4xl" />
          {t('howToPlay.title')}
        </h2>

        {/* Main Description */}
        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
          <p className="text-lg text-gray-700 leading-relaxed">
            {t('howToPlay.description')}
            <br />
            <span className="text-sm text-gray-600 mt-2 block">{t('howToPlay.descriptionNote')}</span>
          </p>
        </div>

        {/* Game Steps */}
        <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-4 sm:mb-6 md:mb-8">
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
                {t('howToPlay.createOrJoinTitle')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('howToPlay.createOrJoinDesc')}
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
                {t('howToPlay.hostStartsTitle')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('howToPlay.hostStartsDesc')}
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
                {t('howToPlay.findWordsTitle')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('howToPlay.findWordsDesc')}
                <br />
                {t('howToPlay.findWordsNote')}
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
                {t('howToPlay.earnPointsTitle')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('howToPlay.earnPointsDesc')}
                <br />
                {t('howToPlay.earnPointsNote')}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Scoring System */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-indigo-700">
            {t('howToPlay.scoringSystemTitle')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-gray-400 to-gray-500 text-white">
              {t('howToPlay.scoringTable.letters2')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-blue-400 to-blue-500 text-white">
              {t('howToPlay.scoringTable.letters3')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-green-400 to-green-500 text-white">
              {t('howToPlay.scoringTable.letters4')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
              {t('howToPlay.scoringTable.letters5')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-orange-400 to-orange-500 text-white">
              {t('howToPlay.scoringTable.letters6')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-red-400 to-red-500 text-white">
              {t('howToPlay.scoringTable.letters7')}
            </Badge>
            <Badge className="py-3 px-4 text-center bg-gradient-to-r from-purple-400 to-purple-500 text-white col-span-2">
              {t('howToPlay.scoringTable.letters8plus')}
            </Badge>
          </div>
          <p className="text-sm text-indigo-700 font-semibold mt-4 text-center">
            {t('howToPlay.scoringTable.formula')}
          </p>
          <p className="text-sm text-gray-600 mt-2 text-center">
            {t('howToPlay.duplicateWarning')}
          </p>
        </div>

        {/* Achievements */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-orange-700">
            {t('howToPlay.achievementsTitle')}
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.speedDemon')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.wordWizard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.vocabularyKing')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.longWordMaster')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.perfectionist')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-medium">{t('howToPlay.achievements.earlyBird')}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 sm:p-5 md:p-6">
          <h3 className="text-2xl font-bold text-center mb-4 text-green-700">
            {t('howToPlay.tipsTitle')}
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{t('howToPlay.tips.tip1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{t('howToPlay.tips.tip2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{t('howToPlay.tips.tip3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{t('howToPlay.tips.tip4')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{t('howToPlay.tips.tip5')}</span>
            </li>
          </ul>
        </div>

        {/* Ready to Play */}
        <div className="mt-8 text-center">
          <p className="text-xl font-bold text-indigo-700 mb-2">
            {t('howToPlay.readyToPlay')}
          </p>
          <p className="text-gray-600">
            {t('howToPlay.funForFamily')}
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default HowToPlay;
