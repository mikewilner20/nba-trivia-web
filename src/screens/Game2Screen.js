import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { AccountCircle, ExitToApp } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../hooks/useGame';
import { answerPlayerQuestion } from '../services/openaiService';
import { players } from '../data/players';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const DAILY_PLAYERS_COLLECTION = 'dailyPlayers';

function Game2Screen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [incorrectGuesses, setIncorrectGuesses] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const [questionHistory, setQuestionHistory] = useState([]);
  
  const {
    currentPlayer,
    score,
    questionScores,
    completed,
    loading: gameLoading,
    error: gameError,
    checkGuess,
    nextQuestion,
  } = useGame();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await answerPlayerQuestion(currentPlayer, question);
      setAnswer(response);
      // Only increment question count if it's not an invalid question
      if (!response.startsWith('Invalid question')) {
        setQuestionCount(prev => prev + 1);
        // Add to question history
        setQuestionHistory(prev => [...prev, { question: question.trim(), answer: response }]);
      }
      setQuestion('');
    } catch (error) {
      setError('Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    if (!guess.trim()) return;

    const isCorrect = await checkGuess(guess);
    if (!isCorrect) {
      setIncorrectGuesses(prev => prev + 1);
    }
    setGuess('');
  };

  const getCurrentScore = () => {
    const maxPoints = 10;
    const pointsLost = questionCount + incorrectGuesses;
    return Math.max(0, maxPoints - pointsLost);
  };

  const generateShareText = async () => {
    const dailyPlayersRef = collection(db, DAILY_PLAYERS_COLLECTION);
    const snapshot = await getDocs(dailyPlayersRef);
    const dayNumber = snapshot.size;
    
    const score = getCurrentScore();
    const currentUrl = window.location.origin;
    
    return `NBA Trivia 2.0 ${dayNumber}: ${score}/10\n\nQuestions asked: ${questionCount}\nIncorrect guesses: ${incorrectGuesses}\n\nPlay at: ${currentUrl}/game2`;
  };

  const handleShare = async () => {
    try {
      const shareText = await generateShareText();
      
      if (navigator.share) {
        try {
          await navigator.share({ text: shareText });
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        navigator.clipboard.writeText(shareText);
        setShareMessage('Results copied to clipboard!');
        setTimeout(() => setShareMessage(''), 2000);
      }
    } catch (error) {
      console.error('Error generating share text:', error);
      setShareMessage('Error sharing results');
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  if (gameLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (gameError) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{gameError}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NBA Trivia 2.0
          </Typography>
          {user && (
            <>
              <IconButton color="inherit" onClick={() => navigate('/profile')}>
                <AccountCircle />
              </IconButton>
              <IconButton color="inherit" onClick={handleSignOut}>
                <ExitToApp />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          {!completed ? (
            <>
              <Typography variant="h6" gutterBottom>
                Current Score: {getCurrentScore()}/10
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Questions Asked: {questionCount} | Incorrect Guesses: {incorrectGuesses}
              </Typography>
              
              <Box component="form" onSubmit={handleQuestionSubmit} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Ask a yes/no question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || !question.trim()}
                >
                  Ask Question
                </Button>
              </Box>

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {answer && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {answer}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Question History
              </Typography>
              {questionHistory.length > 0 ? (
                <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                  {questionHistory.map((item, index) => (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        bgcolor: 'grey.100',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant="body2" sx={{ mr: 2 }}>
                        Q: {item.question}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: item.answer === 'Yes.' ? 'success.main' : 
                                 item.answer === 'No.' ? 'error.main' : 
                                 'text.secondary'
                        }}
                      >
                        A: {item.answer}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No questions asked yet
                </Typography>
              )}

              <Divider sx={{ my: 3 }} />

              <Box component="form" onSubmit={handleGuessSubmit} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Guess the player"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={!guess.trim()}
                >
                  Submit Guess
                </Button>
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="h5" gutterBottom>
                Game Complete!
              </Typography>
              <Typography variant="h6" gutterBottom>
                Final Score: {getCurrentScore()}/10
              </Typography>
              <Typography variant="body1" gutterBottom>
                Questions Asked: {questionCount}
                <br />
                Incorrect Guesses: {incorrectGuesses}
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleShare}
                sx={{ mt: 2 }}
                fullWidth
              >
                Share Results
              </Button>
              
              {shareMessage && (
                <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
                  {shareMessage}
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default Game2Screen;
