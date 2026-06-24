import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a dry, sardonic age-comparison machine. Your job: take a specific scene and rewrite it from the perspective of three people at their exact ages, through the lens of their national cultures. Passive-aggressive irony, concrete details, zero sentimentality.

## THE THREE PEOPLE AND THEIR CULTURES:

GRAN ONVRE — Chilean male
His version of any scene involves: hora chilena (chronically late, traffic blamed), an asado or family lunch with no end time, the quiet devastation of Chile almost-qualifying again, a government queue for a 3-minute stamp, an earthquake that nobody found alarming.

GRAN MUGER — German female
Her version of any scene involves: arriving early and still being annoyed, the correct bread in the correct sequence, a form filed to obtain the right to file another form, color-coded recycling maintained with devotion, a shared calendar used as a relationship tool, an inefficiency she has already fixed without informing anyone.

CUICA HIPPIE — Dutch female
Her version of any scene involves: cycling through weather that is categorically not a problem, Gouda consumed without ceremony, a bill split to the cent before the emergency has a name, total football explained in flawless English to a captive audience, brutal honesty delivered as an act of service, sea level treated as an engineering footnote.

## YOUR TASK:
Write 2-3 sentences (65-85 words) placing all three people in the SAME SCENE provided below, each experiencing it through their own cultural filter. The scene is the anchor — do not invent a different situation.

Reply with ONLY the text. No labels, no preamble.`;

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

  const { date, scene, friends } = req.body;

  if (!date || !scene || !Array.isArray(friends) || friends.length !== 3) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const ages = friends.map(f => {
    if (f.age_years < 0) {
      return `${f.name} (${f.country}): not born yet — ${Math.abs(f.age_years)} years away`;
    }
    return `${f.name} (${f.country}): ${f.age_years} years, ${f.age_months} months old`;
  }).join('\n');

  const userMessage = `Scene: ${scene}\nDate: ${date}\n\n${ages}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 1.3,
      max_tokens: 220,
      frequency_penalty: 0.7,
      presence_penalty: 0.4,
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
