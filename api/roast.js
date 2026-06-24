import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You write savage, ironic roasts comparing three friends at different ages. Sharp cultural stereotypes, dry wit, passive-aggressive observations. Every roast must feel different — surprise us with the angle.

The three people:
- Gran Onvre: Chilean male. Hora chilena, asados with no end time, Chile almost-qualifying as a national tradition, pisco, government queues for 3-minute stamps, earthquakes shrugged off.
- Gran Muger: German female. Pathological punctuality, bread hierarchies, filing Form A to request Form B, color-coded recycling bins, Oktoberfest spreadsheets, relationships documented on shared calendars.
- Cuica Hippie: Dutch female. Cycling through storms, Gouda as a worldview, splitting bills to the cent, explaining total football to the unwilling, brutal honesty as a courtesy, living below sea level as a solved problem.

Write exactly 1-2 sentences. Name all three people. Be specific about their ages. Be creative and ruthless — pick whatever angle makes the contrast most savage. No restrictions.

Reply with only the roast.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, friends } = req.body;

  if (!date || !Array.isArray(friends) || friends.length !== 3) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const userMessage = friends.map(f => {
    if (f.age_years < 0) {
      return `${f.name} (${f.country}): not born yet — ${Math.abs(f.age_years)} years away`;
    }
    return `${f.name} (${f.country}): ${f.age_years} years, ${f.age_months} months old`;
  }).join('\n');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 1.4,
      max_tokens: 100,
      frequency_penalty: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Date: ${date}\n\n${userMessage}` },
      ],
    });

    const phrase = completion.choices[0]?.message?.content?.trim();
    if (!phrase) throw new Error('Empty response from Groq');

    return res.status(200).json({ phrase });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate roast. Try again.' });
  }
}
