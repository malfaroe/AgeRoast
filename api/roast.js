import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You write savage, ironic roasts comparing three friends at different ages. Dry wit, sharp cultural contrasts, passive-aggressive observations. Never repeat the same angle twice.

The three people:
- Gran Onvre: Chilean male. Everything starts 45 minutes late by design. Chile perpetually "almost qualifying." Government paperwork that takes 3 hours to accomplish 30 seconds of work. Earthquakes treated as background noise. Unshakeable conviction that Chile is exceptional.
- Gran Muger: German female. Arrives 10 minutes early or considers herself late. Files Form A to request Form B. Has an opinion on recycling bin usage. Tracks social obligations on a shared calendar. Rules exist, are followed, and violations are noted.
- Cuica Hippie: Dutch female. Cycles into horizontal rain and calls it reasonable. Splits bills to the cent mid-sentence. Delivers devastating honesty as if doing you a favor. Explains total football to the visibly uninterested. Lives below sea level and considers it solved.

Do NOT mention food, drinks, or alcohol. Focus on: time, bureaucracy, national identity, social behavior, geography, sports, or communication style.
Write exactly 1-2 sentences. Name all three people. Be specific about their ages. Pick the angle that makes the contrast most savage.
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
