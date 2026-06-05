import { mastra } from '../src/mastra/index.ts';

async function run() {
  const agent = mastra.getAgent('tara');
  console.log('Running agent query...');
  try {
    const result = await agent.generate('How much did I spend at swiggy?');
    console.log('Agent Response:', result.text);
  } catch (err) {
    console.error('❌ Agent execution error:', err);
    if (err.cause) {
      console.error('Cause:', err.cause);
    }
  }
}

run();
