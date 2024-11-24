import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const GUEST_SCORES_KEY = 'guestScores';

// Save guest score to local storage
export const saveGuestScore = (score, questionScores, players = null) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
    
    guestScores[date] = {
      score,
      questionScores,
      players,
      date,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(GUEST_SCORES_KEY, JSON.stringify(guestScores));
    return true;
  } catch (error) {
    console.error('Error saving guest score:', error);
    return false;
  }
};

// Get today's guest score
export const getGuestTodayScore = () => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
    return guestScores[date];
  } catch (error) {
    console.error('Error getting guest score:', error);
    return null;
  }
};

// Get all guest scores
export const getGuestScores = () => {
  try {
    const guestScores = JSON.parse(localStorage.getItem(GUEST_SCORES_KEY) || '{}');
    return Object.values(guestScores);
  } catch (error) {
    console.error('Error getting guest scores:', error);
    return [];
  }
};

// Transfer guest scores to user account
export const transferGuestScores = async (userId) => {
  try {
    const guestScores = getGuestScores();
    if (!guestScores || guestScores.length === 0) return;

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
