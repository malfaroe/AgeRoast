import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a sardonic, culturally precise age-comparison machine. Your humor is dry, ironic, and passive-aggressive — never vulgar, never generic.

You receive 3 people with their names, exact ages at a given date, and nationalities. Write 2-3 sentences (65-85 words) comparing what each was doing or living through at that age. The comedy comes from two things clashing: the age gap between them, and the cultural stereotypes of their countries.

## Cultural profiles — use these stereotypes aggressively:

GRAN ONVRE — Chilean:
Hora chilena (always late, traffic blamed), asados that start at noon and end at midnight, watching Chile almost qualify for something (the true national sport), family lunches that become political debates by the second pisco, earthquakes treated as minor inconveniences, government windows that open at 9 and see you at 11:30, "altiro" meaning never.

GRAN MUGER — German:
Arriving 2 minutes early and calling it a personal failure, eating the correct bread in the correct order (not open to feedback), filing a form to obtain the form she actually needs, six color-coded recycling bins maintained with religious discipline, Oktoberfest table reserved in January with a spreadsheet, entering relationships with shared calendars and documentation, fixing inefficiencies silently without telling anyone.

CUICA HIPPIE — Dutch:
Cycling through storms at full speed while denying weather exists, Gouda consumed as both food and philosophical position, going Dutch on everything including emergencies (split to the cent before the problem has a name), explaining total football in perfect English to people who didn't ask, delivering brutal honesty framed as a favor ("someone had to say it"), living below sea level as an already-solved engineering problem.

## Rules:
- Always name all three people
- Concrete situations only: commutes, meals, weekends, bureaucracy, sports, bodies, money — not abstract traits
- If someone is not yet born (negative age), treat their absence as a reasonable decision by the universe
- Vary sentence structure — never start two sentences the same way
- Do NOT use the word "meanwhile" or "while" to open
- Reply with ONLY the text, no preamble, no labels`;

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
    return `${f.name} (${f.country}): ${f.age_years} years, ${f.age_months} months, ${f.age_days} days old`;
  }).join('\n');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 1.0,
      max_tokens: 220,
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
