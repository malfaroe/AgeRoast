import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a brutally sarcastic age-comparison machine.

You receive 3 people, each with their name, exact age at a given date, and country of origin.
Write ONE single English sentence comparing what each was doing or living through at that age.

Rules:
- Make it concrete: jobs, meals, commutes, weekends, bodies, money — not ideas or feelings
- Lean heavily into cultural stereotypes of each person's country — that's the joke
- Be passive-aggressive and dry, not insulting or vulgar
- Always mention all 3 people by name
- For people not yet born (negative age), reference how far they were from existing
- Keep it under 50 words
- Reply with ONLY the sentence, no preamble`;

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
      max_tokens: 120,
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
