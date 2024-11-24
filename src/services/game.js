import { players } from '../data/players';
import { getCurrentUser, USER_STATS_COLLECTION } from './auth';
import { formatDate } from '../utils/dateUtils';
import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  arrayUnion,
  orderBy,
  runTransaction,
  limit
} from 'firebase/firestore';

// Collection names
const SCORES_COLLECTION = 'scores';
const DAILY_PLAYERS_COLLECTION = 'dailyPlayers';

// Get all player names for autocomplete
export const getAllPlayerNames = () => {
  return players.map(player => player.name);
};

// Get random players for daily challenge
export const getDailyPlayers = async () => {
  const today = new Date().toISOString().split('T')[0];
  const dailyPlayersRef = doc(db, DAILY_PLAYERS_COLLECTION, today);
  
  try {
    // Check if we already have today's players
    const dailyPlayersDoc = await getDoc(dailyPlayersRef);
    if (dailyPlayersDoc.exists()) {
      const data = dailyPlayersDoc.data();
      if (!data || !data.players || !Array.isArray(data.players)) {
        throw new Error('Invalid daily players data format');
      }
      return data.players;
    }

    // If we can't get today's players from the database, generate them locally
    console.log('Generating local players as fallback');
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const selectedPlayers = shuffled.slice(0, 5);
    
    // Try to store in Firestore, but don't block on it
    setDoc(dailyPlayersRef, { 
      players: selectedPlayers,
      createdAt: new Date().toISOString()
    }).catch(error => {
      console.warn('Failed to save players to database:', error);
      // Continue with local players even if save fails
    });

    return selectedPlayers;
  } catch (error) {
    console.error('Error getting daily players:', error);
    // Fallback to local-only mode if database fails
    console.log('Falling back to local-only mode');
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }
};

// Get player details for hints
export const getPlayerDetails = (playerId) => {
  const player = players.find(p => p.id === playerId);
  if (!player) return null;
  
  return {
    college: player.college,
    teams: player.teams,
    seasons: player.seasons,
  };
};

// Check if guess is correct
export const checkGuess = (player, guessName) => {
  if (!player) return false;
  return player.name.toLowerCase() === guessName.toLowerCase();
};

// Save daily score with per-question performance
export const saveDailyScore = async (score, questionScores) => {
  const today = formatDate(new Date());
  const user = getCurrentUser();
  const scoreKey = `score_${today}`;

  // Always save to local storage first as backup
  localStorage.setItem(scoreKey, JSON.stringify({
    totalScore: score,
    questionScores,
    timestamp: new Date().toISOString()
  }));

  if (!user) {
    console.log('No authenticated user, saving to local storage only');
    return { success: false, needsAuth: true };
  }

  try {
    console.log('Saving score for user:', user.uid, 'Score:', score, 'QuestionScores:', questionScores);
    
    // Create the score document
    const scoreRef = doc(db, SCORES_COLLECTION, `${user.uid}_${today}`);
    const scoreDoc = await getDoc(scoreRef);
    
    // Don't overwrite existing score for today
    if (scoreDoc.exists()) {
      console.log('Score already exists for today');
      return { success: true };
    }

    // Save score document
    const scoreData = {
      userId: user.uid,
      email: user.email,
      score,
      questionScores,
      date: today,
      timestamp: new Date().toISOString()
    };
    
    console.log('Attempting to save score document:', scoreData);
    await setDoc(scoreRef, scoreData);
    console.log('Score document saved successfully');

    // Update user stats
    const userStatsRef = doc(db, USER_STATS_COLLECTION, user.uid);
    const userStatsDoc = await getDoc(userStatsRef);
    
    if (userStatsDoc.exists()) {
      const userData = userStatsDoc.data();
      await updateDoc(userStatsRef, {
        totalGamesPlayed: (userData.totalGamesPlayed || 0) + 1,
        totalScore: (userData.totalScore || 0) + score,
        lastPlayed: today,
        highScore: Math.max(userData.highScore || 0, score)
      });
    } else {
      await setDoc(userStatsRef, {
        userId: user.uid,
        email: user.email,
        totalGamesPlayed: 1,
        totalScore: score,
        lastPlayed: today,
        highScore: score,
        createdAt: new Date().toISOString()
      });
    }

    // Clear local storage since we saved successfully
    localStorage.removeItem(scoreKey);
    console.log('Score and stats saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving score:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Score is already in local storage as backup
    return { 
      success: false, 
      error: error.message, 
      fallbackToLocal: true 
    };
  }
};

// Get daily score with per-question performance
export const getDailyScore = async () => {
  const today = formatDate(new Date());
  const user = getCurrentUser();
  const scoreKey = `score_${today}`;

  try {
    if (user) {
      console.log('Getting score for user:', user.uid);
      const scoreDoc = await getDoc(doc(db, SCORES_COLLECTION, `${user.uid}_${today}`));
      if (scoreDoc.exists()) {
        const data = scoreDoc.data();
        console.log('Found score in database:', data);
        return {
          score: data.score,
          questionScores: data.questionScores || []
        };
      }
      console.log('No score found in database');
    }
    
    // Try local storage as fallback
    const localScoreStr = localStorage.getItem(scoreKey);
    if (localScoreStr) {
      console.log('Found score in local storage');
      const localScore = JSON.parse(localScoreStr);
      return {
        score: localScore.totalScore,
        questionScores: localScore.questionScores || []
      };
    }
    console.log('No score found in local storage');
    return null;
  } catch (error) {
    console.error('Error getting daily score:', error);
    // Log more details about the error
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    
    // Fallback to local storage
    const localScoreStr = localStorage.getItem(scoreKey);
    if (localScoreStr) {
      const localScore = JSON.parse(localScoreStr);
      return {
        score: localScore.totalScore,
        questionScores: localScore.questionScores || []
      };
    }
    return null;
  }
};

// Get user stats
export const getStats = async (userId) => {
  try {
    console.log('Fetching stats for user:', userId);
    const statsDoc = await getDoc(doc(db, USER_STATS_COLLECTION, userId));
    
    if (!statsDoc.exists()) {
      console.log('No stats found for user');
      return {
        totalGamesPlayed: 0,
        totalScore: 0,
        highScore: 0,
        lastPlayed: null
      };
    }
    
    const statsData = statsDoc.data();
    console.log('Found stats:', statsData);
    
    return statsData;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

// Get user's historical scores
export const getUserScores = async (userId) => {
  try {
    console.log('Fetching scores for user:', userId);
    const scoresRef = collection(db, SCORES_COLLECTION);
    const q = query(
      scoresRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const scores = [];
    
    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Found scores:', scores.length, 'scores');
    return scores;
  } catch (error) {
    console.error('Error fetching user scores:', error);
    throw error;
  }
};

// Transfer guest score to user account
export const transferGuestScore = async () => {
  const user = getCurrentUser();
  if (!user) return;

  const guestScore = localStorage.getItem('guest_score');
  if (guestScore) {
    const { score, date } = JSON.parse(guestScore);
    
    try {
      // Save the score under the user's account
      const userScoreRef = doc(db, SCORES_COLLECTION, `${user.uid}_${date}`);
      await setDoc(userScoreRef, {
        userId: user.uid,
        email: user.email,
        score,
        date,
        timestamp: new Date().toISOString()
      });

      // Update user stats
      const userStatsRef = doc(db, USER_STATS_COLLECTION, user.uid);
      const userStatsDoc = await getDoc(userStatsRef);
      
      if (userStatsDoc.exists()) {
        await updateDoc(userStatsRef, {
          gamesPlayed: arrayUnion(date),
          totalScore: userStatsDoc.data().totalScore + score
        });
      } else {
        await setDoc(userStatsRef, {
          userId: user.uid,
          email: user.email,
          gamesPlayed: [date],
          totalScore: score
        });
      }

      // Clear guest score
      localStorage.removeItem('guest_score');
    } catch (error) {
      console.error('Error transferring guest score:', error);
    }
  }
};
