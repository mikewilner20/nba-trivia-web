import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { saveScore } from './gameService';

const GUEST_SCORES_KEY = 'guestScores';

// Save guest score to local storage
export const saveGuestScore = (score, questionScores, players = null) => {
  const date = new Date().toISOString().split('T')[0];
  const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
  
  const scoreData = {
    score,
    questionScores,
    date,
    createdAt: new Date().toISOString()
  };

  // Only save player data if it exists
  if (players) {
    scoreData.players = players.map(p => ({
      name: p.name,
      id: p.id
    }));
  }
  
  guestScores[date] = scoreData;
  localStorage.setItem(GUEST_SCORES_KEY, JSON.stringify(guestScores));
};

// Get guest score for today
export const getGuestTodayScore = () => {
  const date = new Date().toISOString().split('T')[0];
  const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
  return guestScores[date];
};

// Get all guest scores
export const getGuestScores = () => {
  const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
  return Object.values(guestScores);
};

// Transfer guest scores to user account
export const transferGuestScores = async (userId) => {
  const guestScores = getGuestScores();
  if (!guestScores || guestScores.length === 0) return;

  try {
    // Transfer each score to the user's account
    for (const score of guestScores) {
      const scoreId = `${userId}_${score.date}`;
      const scoreRef = doc(db, 'scores', scoreId);
      const scoreData = {
        ...score,
        userId,
        createdAt: new Date().toISOString()
      };
      await setDoc(scoreRef, scoreData);
    }

    // Clear guest scores after successful transfer
    localStorage.removeItem(GUEST_SCORES_KEY);
  } catch (error) {
    console.error('Error transferring guest scores:', error);
    throw error;
  }
};
