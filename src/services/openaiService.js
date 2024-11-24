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
