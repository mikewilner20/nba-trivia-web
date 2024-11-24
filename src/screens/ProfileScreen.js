import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress
} from '@mui/material';
import { getUserStats, getUserScores } from '../services/gameService';

function ProfileScreen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch stats and scores in parallel
        const [userStats, userScores] = await Promise.all([
          getUserStats(user.uid),
          getUserScores(user.uid)
        ]);

        setStats(userStats || {
          totalGamesPlayed: 0,
          totalScore: 0,
          highScore: 0,
          lastPlayed: null
        });
        setScores(userScores || []);
      } catch (err) {
        console.error('Error loading user data:', err);
        if (err.code === 'permission-denied') {
          setError('Permission denied. Please try logging out and back in.');
        } else {
          setError('Failed to load user data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, navigate]);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, borderBottom: '1px solid #ccc' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Profile
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ mr: 2 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              <ArrowBack />
            </IconButton>
          </Box>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToApp />
          </IconButton>
        </Box>
      </Box>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Stats
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Games Played
              </Typography>
              <Typography variant="h6">
                {stats?.totalGamesPlayed || 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Score
              </Typography>
              <Typography variant="h6">
                {stats?.totalScore || 0}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                High Score
              </Typography>
              <Typography variant="h6">
                {stats?.highScore || 0}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Recent Games
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      No games played yet
                    </TableCell>
                  </TableRow>
                ) : (
                  scores.map((score, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(score.date).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{score.score}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
}

export default ProfileScreen;
