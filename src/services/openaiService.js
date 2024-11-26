import axios from 'axios';

const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const generatePlayerHint = async (player) => {
  try {
    console.log('Generating hint for player:', player.name);
    
    // Get chronologically ordered teams from seasons
    const chronologicalTeams = [...new Set(
      player.seasons
        .sort((a, b) => a.year.localeCompare(b.year))
        .map(season => season.team)
    )];
    
    const prompt = `You are an expert NBA historian helping create hints for an NBA player guessing game. 
    Generate a creative, challenging but fair hint about ${player.name}. 

    Player career path: ${chronologicalTeams.join(' → ')}

    Guidelines:
    1. NEVER mention the player's name or initials
    2. NEVER directly state their team names
    3. Focus on unique aspects like:
       - Notable achievements or records
       - Playing style or signature moves
       - Memorable moments or rivalries
       - Nicknames (without giving away the name)
       - Draft position or college if relevant
       - Career milestones
       - Interesting off-court facts
    4. Make it challenging but solvable
    5. Keep it to one sentence
    6. Be creative and engaging
    7. Avoid obvious statistics
    8. If referencing their career journey, use the correct chronological order of teams

    Example good hints:
    - "This crafty point guard's 'Showtime' legacy in the 80s revolutionized the fast break."
    - "Known for his 'Dream Shake', this African-born center dominated the paint throughout the 90s."
    - "Before becoming a 6-time champion in the 90s, this shooting guard scored 63 points against the Celtics in a playoff game."

    Response format: Just the hint, nothing else.`;

    const response = await axios.post(
      OPENAI_API_ENDPOINT,
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert NBA historian generating creative trivia hints. Respond with only the hint, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('OpenAI response:', response.data);
    const hint = response.data.choices[0].message.content.trim();
    console.log('Generated hint:', hint);
    return hint;
  } catch (error) {
    console.error('Error generating hint:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    return `This legendary player made their mark in NBA history.`; // Fallback hint
  }
};

export const answerPlayerQuestion = async (player, question) => {
  try {
    const prompt = `You are an NBA expert assistant helping with a player guessing game. 
    The current mystery player is ${player.name}. 
    
    Player data:
    - Name: ${player.name}
    - Teams: ${player.seasons.map(s => `${s.team} (${s.year})`).join(', ')}
    - Position: ${player.position}
    - College: ${player.college || 'N/A'}
    
    The user has asked this question: "${question}"
    
    Guidelines for determining if this is a valid yes/no question:
    1. The question should be answerable with ONLY "Yes" or "No"
    2. Questions about player characteristics (position, teams, years played, etc.) are valid
    3. Questions comparing the player to others ("Did they play with X?") are valid
    4. Questions about career achievements ("Did they win MVP?") are valid
    5. Questions about player background ("Did they go to college?") are valid
    
    If the question follows these guidelines, answer with ONLY "Yes." or "No."
    If the question cannot be answered with a simple yes or no, respond with "Invalid question. Please ask a question that can be answered with yes or no."
    
    Examples of valid questions:
    - "Are they a guard?" -> "Yes." or "No."
    - "Did they play in the Eastern Conference?" -> "Yes." or "No."
    - "Did they win a championship?" -> "Yes." or "No."
    
    Examples of invalid questions:
    - "What position do they play?"
    - "How many championships did they win?"
    - "Which teams did they play for?"`;

    const response = await axios.post(
      OPENAI_API_ENDPOINT,
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an NBA expert assistant. Only respond with "Yes.", "No.", or "Invalid question. Please ask a question that can be answered with yes or no."'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error answering player question:', error);
    throw new Error('Failed to answer question');
  }
};
