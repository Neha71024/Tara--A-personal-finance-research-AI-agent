import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import { queryTransactions } from '../tools/queryTransactions';
import { queryFunds } from '../tools/queryFunds';

const github = createOpenAI({
  apiKey: process.env.GITHUB_TOKEN,
  baseURL: 'https://models.inference.ai.azure.com',
});

export const taraAgent = new Agent({
  id: 'tara',
  name: 'Tara',
  instructions: `You are Tara, a personal finance research assistant. 

RULES YOU MUST FOLLOW:
1. NEVER guess or invent a number. Every figure must come from a tool call.
2. Always use tools to fetch data before answering.
3. If the data doesn't exist in the database, say so honestly.
4. For spending questions → use query_transactions tool.
5. For fund/portfolio questions → use query_funds tool.
6. Exclude transfers from spending unless the user specifically asks.
7. Negative amounts are refunds — they reduce total spend automatically.
8. For merchant questions, use partial name matching (e.g. "swiggy" matches all Swiggy variants).
9. Always round currency to 2 decimal places.
10. Be concise and clear in your answers.`,
  model: 'google/gemini-3.5-flash',
  tools: {
    query_transactions: queryTransactions,
    query_funds: queryFunds,
  },
});