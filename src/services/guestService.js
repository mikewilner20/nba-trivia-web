import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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

// Transfer guest scores to user account
export const transferGuestScores = async (userId) => {
  const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
  
  // Transfer each score
  const transfers = Object.values(guestScores).map(async (scoreData) => {
    const scoreRef = doc(db, 'scores', `${userId}_${scoreData.date}`);
    const exists = (await getDoc(scoreRef)).exists();
    
    if (!exists) {
      await saveScore(
        userId, 
        scoreData.score, 
        scoreData.questionScores,
        scoreData.players || null
      );
    }
  });
  
  await Promise.all(transfers);
  
  // Clear guest scores after transfer
  localStorage.removeItem(GUEST_SCORES_KEY);
};
