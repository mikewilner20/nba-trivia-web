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
  Autocomplete,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
} from '@mui/material';
import { AccountCircle, ExitToApp, Check, Close } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../hooks/useGame';
import { players } from '../data/players';

const getStepColor = (score) => {
  if (score === 2) return 'success.main';
  if (score === 1) return 'warning.main';
  return 'error.main';
};

const getStepIcon = (score) => {
  if (score === 2) return <Check style={{ color: 'success.main' }} />;
  if (score === 1) return <Check style={{ color: 'warning.main' }} />;
  if (score === 0) return <Close style={{ color: 'error.main' }} />;
  return null;
};

function GameScreen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [guess, setGuess] = useState('');
  const {
    currentPlayer,
    currentHint,
    score,
    questionScores,
    completed,
    loading,
    error,
    attemptsLeft,
    checkGuess,
    guessHistory,
    message,
    showHint,
    currentIndex,
    players: gamePlayers,
  } = useGame();

  const handleGuess = () => {
    if (!guess.trim()) return;
    checkGuess(guess);
    setGuess('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !completed) {
      handleGuess();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NBA Trivia
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Score: {score}
          </Typography>
          {user ? (
            <>
              <IconButton
                color="inherit"
                onClick={() => navigate('/profile')}
                sx={{ mr: 1 }}
              >
                <AccountCircle />
              </IconButton>
              <IconButton color="inherit" onClick={handleLogout}>
                <ExitToApp />
              </IconButton>
            </>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        {!completed && currentIndex === 0 && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
            <Typography variant="h6" gutterBottom>
              How to Play
            </Typography>
            <Typography variant="body1" paragraph>
              • You have 2 attempts to guess each NBA player
            </Typography>
            <Typography variant="body1" paragraph>
              • 2 points for correct guess on first try
            </Typography>
            <Typography variant="body1" paragraph>
              • 1 point for correct guess on second try
            </Typography>
            <Typography variant="body1" paragraph>
              • Get a helpful hint after your first attempt!
            </Typography>
            <Typography variant="body1">
              • Try to get all 10 points across 5 players
            </Typography>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          {/* Progress Stepper */}
          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={completed ? questionScores.length : currentIndex} alternativeLabel>
              {questionScores.map((stepScore, index) => {
                const labelProps = {};
                const isCompleted = completed || index < currentIndex;
                const player = gamePlayers?.[index];
                
                if (isCompleted && player) {
                  labelProps.icon = getStepIcon(stepScore);
                  labelProps.error = stepScore === 0;
                }

                return (
                  <Step key={index} completed={isCompleted}>
                    <Tooltip 
                      title={isCompleted && player ? `${player.name} (${stepScore} points)` : `Question ${index + 1}`}
                      arrow
                    >
                      <StepLabel 
                        {...labelProps}
                        sx={{
                          '& .MuiStepLabel-label': {
                            color: isCompleted ? getStepColor(stepScore) : 'inherit'
                          }
                        }}
                      >
                        {isCompleted && player ? player.name : `Q${index + 1}`}
                      </StepLabel>
                    </Tooltip>
                  </Step>
                );
              })}
            </Stepper>
          </Box>

          {completed ? (
            <>
              <Typography variant="h5" gutterBottom>
                Game Complete!
              </Typography>
              <Typography variant="h6" gutterBottom>
                Final Score: {score}
              </Typography>
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Score Breakdown:
                </Typography>
                {questionScores.map((qs, index) => {
                  const player = gamePlayers?.[index];
                  if (!player) return null;
                  
                  return (
                    <Typography key={index} sx={{ 
                      color: qs === 2 ? 'success.main' : qs === 1 ? 'warning.main' : 'error.main',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1
                    }}>
                      <span>{player.name}</span>
                      <span>{qs} {qs === 1 ? 'point' : 'points'}</span>
                    </Typography>
                  );
                })}
              </Box>
              {!user && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="white" gutterBottom>
                    Save Your Progress!
                  </Typography>
                  <Typography color="white" paragraph>
                    Create an account to:
                  </Typography>
                  <Typography color="white" component="div" sx={{ ml: 2, mb: 2 }}>
                    • Save today's score of {score} points
                    <br />
                    • Track your progress over time
                    <br />
                    • Compete with other players
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate('/signup')}
                    sx={{ mr: 1 }}
                  >
                    Create Account
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => navigate('/login')}
                    sx={{ color: 'white', borderColor: 'white' }}
                  >
                    Sign In
                  </Button>
                </Box>
              )}
            </>
          ) : (
            currentPlayer && (
              <>
                <Typography variant="h6" gutterBottom>
                  Question {currentIndex + 1} of {questionScores.length}
                </Typography>

                {/* Player Hints */}
                <Box sx={{ my: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    College: {currentPlayer.college}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Teams: {currentPlayer.teams.join(', ')}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    Career PPG by Season:
                  </Typography>
                  <Box sx={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    pr: 1,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#888',
                      borderRadius: '4px',
                      '&:hover': {
                        backgroundColor: '#555',
                      },
                    },
                  }}>
                    {currentPlayer.seasons.map((season) => (
                      <Typography key={season.year} variant="body2" sx={{ 
                        ml: 2,
                        mb: 0.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        pr: 2
                      }}>
                        <span>{season.year}:</span>
                        <span>{season.ppg.toFixed(1)} PPG</span>
                      </Typography>
                    ))}
                  </Box>
                </Box>

                {message && (
                  <Typography 
                    color={message.includes('Correct') ? 'success.main' : 'error.main'} 
                    gutterBottom
                    sx={{ textAlign: 'center', mb: 2 }}
                  >
                    {message}
                  </Typography>
                )}

                {/* AI-Generated Hint */}
                {showHint && currentHint && (
                  <Box sx={{ my: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                    <Typography variant="body1" color="white">
                      🤔 Hint: {currentHint}
                    </Typography>
                  </Box>
                )}

                {/* Guess Attempts Display */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: attemptsLeft === 2 ? 'primary.main' : 
                                guessHistory[0] ? 'error.main' : 'grey.500',
                      borderRadius: 1,
                      bgcolor: attemptsLeft === 2 ? 'primary.main' : 'transparent',
                      color: attemptsLeft === 2 ? 'white' : 
                            guessHistory[0] ? 'error.main' : 'grey.500',
                      flex: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography>
                      Guess 1 {guessHistory[0] && `(${guessHistory[0]})`}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: attemptsLeft === 1 ? 'primary.main' : 
                                guessHistory[1] ? 'error.main' : 'grey.500',
                      borderRadius: 1,
                      bgcolor: attemptsLeft === 1 ? 'primary.main' : 'transparent',
                      color: attemptsLeft === 1 ? 'white' : 
                            guessHistory[1] ? 'error.main' : 'grey.500',
                      flex: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography>
                      Guess 2 {guessHistory[1] && `(${guessHistory[1]})`}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Autocomplete
                    value={guess}
                    onChange={(event, newValue) => setGuess(newValue || '')}
                    options={players.map(p => p.name)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Guess the player"
                        onKeyPress={handleKeyPress}
                        error={guess && !players.some(p => p.name.toLowerCase() === guess.toLowerCase())}
                        helperText={guess && !players.some(p => p.name.toLowerCase() === guess.toLowerCase()) 
                          ? "Please select a valid player name" 
                          : ""}
                      />
                    )}
                    onInputChange={(event, newInputValue) => {
                      setGuess(newInputValue);
                    }}
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue) return [];
                      const inputValueLower = inputValue.toLowerCase();
                      return options.filter(option =>
                        option.toLowerCase().includes(inputValueLower)
                      ).slice(0, 5); // Limit to 5 suggestions
                    }}
                    noOptionsText="No matching players"
                    blurOnSelect
                    clearOnBlur={false}
                    selectOnFocus
                    handleHomeEndKeys
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGuess}
                    sx={{ mt: 2 }}
                    fullWidth
                    disabled={!guess || !players.some(p => p.name.toLowerCase() === guess.toLowerCase())}
                  >
                    Submit Guess
                  </Button>
                </Box>
              </>
            )
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default GameScreen;
