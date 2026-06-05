import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const models = [
  'gemini-3.5-flash',
  'gemini-pro-latest',
  'gemini-2.5-pro',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

async function test() {
  console.log('API Key:', apiKey ? 'Present' : 'Missing');
  if (!apiKey) return;

  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hello',
                  },
                ],
              },
            ],
          }),
        }
      );

      const json = await response.json();
      if (response.ok) {
        console.log(`✅ Success with ${model}:`, JSON.stringify(json.candidates?.[0]?.content?.parts?.[0]?.text));
      } else {
        console.error(`❌ Failed with ${model}:`, json.error?.message);
      }
    } catch (err) {
      console.error(`❌ Error with ${model}:`, err.message);
    }
  }
}

test();
