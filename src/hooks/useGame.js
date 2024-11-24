import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveScore, getTodayScore } from '../services/gameService';
import { saveGuestScore, getGuestTodayScore } from '../services/guestService';
import { generatePlayerHint } from '../services/openaiService';
import { players } from '../data/players';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ATTEMPTS_PER_QUESTION = 2;
const DAILY_PLAYERS_COLLECTION = 'dailyPlayers';

export const useGame = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState({
    currentIndex: 0,
    score: 0,
    questionScores: [],
    attempts: 0,
    completed: false,
    loading: true,
    error: null,
    players: [],
    hints: [],
    guessHistory: ['', ''],
    message: '',
    showHint: false
  });

  // Get or create daily players
  const getDailyPlayers = async () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyPlayersRef = doc(db, DAILY_PLAYERS_COLLECTION, today);
    
    try {
      console.log('Attempting to get daily players for:', today);
      const dailyPlayersDoc = await getDoc(dailyPlayersRef);
      
      if (dailyPlayersDoc.exists()) {
        console.log('Found existing daily players');
        const data = dailyPlayersDoc.data();
        return {
          players: data.players,
          hints: data.hints || []
        };
      } else {
        console.log('No existing daily players, selecting new ones');
        // Select new random players for today
        const selectedPlayers = players
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        
        console.log('Generating hints for players...');
        const hints = await Promise.all(
          selectedPlayers.map(async player => {
            console.log('Generating hint for:', player.name);
            const hint = await generatePlayerHint(player);
            console.log('Generated hint:', hint);
            return hint;
          })
        );
        console.log('All hints generated:', hints);
        
        console.log('Saving new daily players and hints to Firestore');
        // Save to Firebase
        await setDoc(dailyPlayersRef, {
          players: selectedPlayers,
          hints: hints,
          date: today,
          createdAt: new Date().toISOString()
        });
        
        return { players: selectedPlayers, hints };
      }
    } catch (error) {
      console.error('Error getting daily players:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      throw error;
    }
  };

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Get daily players first (we need this regardless of existing score)
        const { players: dailyPlayers, hints } = await getDailyPlayers();
        
        if (!dailyPlayers || dailyPlayers.length === 0) {
          throw new Error('Failed to load or generate players');
        }

        // Check for existing score
        const existingScore = user
          ? await getTodayScore(user.uid)
          : await getGuestTodayScore();

        if (existingScore) {
          setGameState(prev => ({
            ...prev,
            ...existingScore,
            players: dailyPlayers, // Include the players array
            hints: hints || [],
            loading: false,
            completed: true
          }));
          return;
        }

        // Initialize new game
        setGameState(prev => ({
          ...prev,
          players: dailyPlayers,
          hints: hints || [],
          questionScores: new Array(5).fill(0),
          loading: false
        }));
      } catch (error) {
        console.error('Error initializing game:', error);
        setGameState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize game. Please try refreshing the page.'
        }));
      }
    };

    initializeGame();
  }, [user]);

  const checkGuess = async (guess) => {
    if (gameState.completed || gameState.loading) return;
    
    const currentPlayer = gameState.players[gameState.currentIndex];
    const isCorrect = currentPlayer.name.toLowerCase() === guess.toLowerCase();
    const newGuessHistory = [...gameState.guessHistory];
    newGuessHistory[2 - gameState.attempts] = guess;

    if (isCorrect) {
      const points = gameState.attempts === 0 ? 2 : 1;
      const newQuestionScores = [...gameState.questionScores];
      newQuestionScores[gameState.currentIndex] = points;
      const newScore = gameState.score + points;
      const isLastQuestion = gameState.currentIndex === 4;

      if (isLastQuestion) {
        // Save score with players data
        if (user) {
          await saveScore(user.uid, newScore, newQuestionScores, gameState.players);
        } else {
          await saveGuestScore(newScore, newQuestionScores, gameState.players);
        }
      }

      setGameState(prev => ({
        ...prev,
        score: newScore,
        questionScores: newQuestionScores,
        currentIndex: prev.currentIndex + 1,
        attempts: 0,
        completed: isLastQuestion,
        guessHistory: ['', ''],
        message: `Correct! ${points} points`,
        showHint: false
      }));
    } else {
      // Wrong guess
      if (gameState.attempts === 0) {
        // First wrong attempt - show hint
        setGameState(prev => ({
          ...prev,
          attempts: prev.attempts + 1,
          message: 'Wrong guess. Here\'s a hint:',
          guessHistory: newGuessHistory,
          showHint: true
        }));
      } else {
        // Second wrong attempt - move to next question
        const isLastQuestion = gameState.currentIndex === gameState.players.length - 1;

        if (isLastQuestion) {
          // Game completed
          try {
            console.log('Saving final score...');
            if (user) {
              await saveScore(user.uid, gameState.score, gameState.questionScores, gameState.players);
            } else {
              await saveGuestScore(gameState.score, gameState.questionScores, gameState.players);
            }
            console.log('Final score saved');
            setGameState(prev => ({
              ...prev,
              completed: true,
              message: `Wrong! The correct answer was ${currentPlayer.name}. Game Complete! Final Score: ${gameState.score}`,
              guessHistory: newGuessHistory,
            }));
          } catch (error) {
            console.error('Error saving score:', error);
            setGameState(prev => ({
              ...prev,
              error: 'Failed to save score. Please try again.',
              guessHistory: newGuessHistory,
            }));
          }
        } else {
          // Move to next question
          setGameState(prev => ({
            ...prev,
            currentIndex: prev.currentIndex + 1,
            attempts: 0,
            message: `Wrong! The correct answer was ${currentPlayer.name}`,
            guessHistory: ['', ''],
            showHint: false
          }));
        }
      }
    }
  };

  return {
    ...gameState,
    checkGuess,
    currentPlayer: gameState.players[gameState.currentIndex],
    currentHint: gameState.showHint ? gameState.hints[gameState.currentIndex] : null
  };
};
