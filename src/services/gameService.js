import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  updateDoc,
  limit as limitQuery
} from 'firebase/firestore';

const COLLECTIONS = {
  SCORES: 'scores',
  USER_STATS: 'userStats',
  DAILY_PLAYERS: 'dailyPlayers',
};

// Format date consistently to match security rules: YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Save score for authenticated user
export const saveScore = async (userId, score, questionScores, players) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const date = formatDate(new Date());
  console.log(`Attempting to save score for user ${userId} on ${date}`);

  try {
    // Save the score document with the exact format required by security rules: userId_YYYY-MM-DD
    const scoreId = `${userId}_${date}`;
    console.log('Creating score with ID:', scoreId);
    const scoreRef = doc(db, COLLECTIONS.SCORES, scoreId);
    
    const scoreExists = (await getDoc(scoreRef)).exists();
    if (scoreExists) {
      console.log('Score already exists for today');
      return { success: true, alreadyExists: true };
    }

    // Save new score with players data
    const scoreData = {
      userId,
      score,
      questionScores,
      players: players.map(p => ({ 
        name: p.name,
        id: p.id
      })),
      date,
      createdAt: new Date().toISOString()
    };
    console.log('Saving score data:', scoreData);
    await setDoc(scoreRef, scoreData);
    console.log('Score saved successfully');

    // Update or create user stats
    const statsRef = doc(db, COLLECTIONS.USER_STATS, userId);
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      const stats = statsDoc.data();
      await updateDoc(statsRef, {
        totalGamesPlayed: (stats.totalGamesPlayed || 0) + 1,
        totalScore: (stats.totalScore || 0) + score,
        highScore: Math.max(stats.highScore || 0, score),
        lastPlayed: date
      });
      console.log('Updated existing user stats');
    } else {
      // Initialize stats if they don't exist
      await setDoc(statsRef, {
        totalGamesPlayed: 1,
        totalScore: score,
        highScore: score,
        lastPlayed: date,
        createdAt: new Date().toISOString()
      });
      console.log('Created new user stats');
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving score:', error);
    console.error('Error details:', error.code, error.message);
    throw error;
  }
};

// Get user's score for today
export const getTodayScore = async (userId) => {
  if (!userId) return null;

  const date = formatDate(new Date());
  const scoreId = `${userId}_${date}`;
  const scoreRef = doc(db, COLLECTIONS.SCORES, scoreId);

  try {
    const scoreDoc = await getDoc(scoreRef);
    return scoreDoc.exists() ? scoreDoc.data() : null;
  } catch (error) {
    console.error('Error getting today\'s score:', error);
    return null;
  }
};

// Get user's historical scores
export const getUserScores = async (userId, maxScores = 10) => {
  if (!userId) return [];

  try {
    console.log(`Fetching up to ${maxScores} scores for user ${userId}`);
    const scoresRef = collection(db, COLLECTIONS.SCORES);
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc'),
      limitQuery(maxScores)
    );
    
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map(doc => doc.data());
    console.log(`Found ${scores.length} scores for user ${userId}`);
    return scores;
  } catch (error) {
    console.error('Error getting user scores:', error);
    console.error('Error details:', error.code, error.message);
    return [];
  }
};

// Get user stats
export const getUserStats = async (userId) => {
  if (!userId) return null;

  try {
    // Get all user scores first
    const scoresRef = collection(db, COLLECTIONS.SCORES);
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map(doc => doc.data());
    
    // Calculate stats from scores
    const stats = {
      totalGamesPlayed: scores.length,
      totalScore: scores.reduce((total, game) => total + game.score, 0),
      highScore: scores.reduce((max, game) => Math.max(max, game.score), 0),
      lastPlayed: scores.length > 0 ? scores[0].date : null,
      createdAt: new Date().toISOString()
    };

    // Update the stats document
    const statsRef = doc(db, COLLECTIONS.USER_STATS, userId);
    await setDoc(statsRef, stats);
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    console.error('Error details:', error.code, error.message);
    return null;
  }
};
