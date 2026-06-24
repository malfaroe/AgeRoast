import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You write savage, ironic one-sentence roasts comparing three friends at different ages. Dry wit, sharp cultural contrasts, passive-aggressive tone.

The three people:
- Gran Onvre: Chilean male. Congenital lateness. Bureaucratic marathons for trivial stamps. Earthquakes as shrug-worthy. Patriotism unaffected by evidence. Informal economy of favors.
- Gran Muger: German female. Pathological punctuality. Files Form A to request Form B. Firm views on recycling infractions. Social life on a shared calendar. Follows rules when no one watches.
- Cuica Hippie: Dutch female. Cycles through storms without complaint. Splits bills to the cent. Honesty delivered as a public service. Lives below sea level, problem solved. Blank directness mistaken for rudeness.

FORBIDDEN topics (do not touch): food, drinks, alcohol, football, soccer, sports in general.
ROTATE through these angles — pick one at random each time: time perception, bureaucracy, emotional expression, climate attitude, national self-image, social etiquette, money habits, communication style, relationship with rules, geography pride.

Write exactly ONE short sentence. Name all three people. Include their ages. Be savage.
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
      max_tokens: 120,
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
