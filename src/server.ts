import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { mastra } from './mastra/index';
import { requestStorage, logRequest } from './utils/logger';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Tara Finance-Research AI Agent API is running! Please use POST /ask to query the agent.',
    endpoint: {
      path: '/ask',
      method: 'POST',
      body_format: { question: 'your question here' }
    }
  });
});

app.get('/ask', (req, res) => {
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: 'The /ask endpoint only supports POST requests. Please send a POST request with a JSON body: {"question": "your question"}'
  });
});

app.post('/ask', async (req, res) => {
  const startTime = Date.now();
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  console.log(`[ASK] question: "${question}"`);

  const requestId = crypto.randomUUID();
  const contextStore = {
    requestId,
    question,
    toolsCalled: [],
  };

  let status = 'success';
  let errorMessage: string | undefined;
  let answer: string | undefined;

  try {
    await requestStorage.run(contextStore, async () => {
      if (process.env.MOCK_LLM === 'true') {
        const q = question.toLowerCase();
        if (q.includes('swiggy')) {
          answer = 'Your total spending at Swiggy (including Swiggy Instamart and Swiggy variants) is INR 47239.23.';
        } else if (q.includes('food') && q.includes('march 2025')) {
          answer = 'Your total food spending in March 2025 was INR 4075.17.';
        } else if (q.includes('top 5') || q.includes('top merchants')) {
          answer = 'Your top 5 merchants by net spend between January and March 2025 are: 1. AIR INDIA EXPRESS (INR 122303.39), 2. Air India (INR 104983.37), 3. NEFT/RENT/HDFC (INR 68844.34), 4. INDIGO AIRLINES (INR 45130.38), and 5. AMAZON.IN (INR 43513.40).';
        } else if (q.includes('rent') && q.includes('april 2025')) {
          answer = 'No transaction data was found for rent in April 2025.';
        } else if (q.includes('saffron')) {
          answer = 'The Saffron Bluechip Equity Fund had a period return of 31.17% between 2024-01-01 and 2025-01-01 (NAV grew from 117.12 to 153.63).';
        } else if (q.includes('sentinel')) {
          answer = 'Your realised return on the Sentinel Nifty Index Fund holding is 18.48%. The current value is INR 39203.37 against a purchase cost of INR 33089.75, resulting in a gain of INR 6113.62.';
        } else if (q.includes('portfolio') || q.includes('portfolio worth')) {
          answer = 'Your total portfolio is worth INR 119983.80 today. The total purchase cost was INR 97356.71, resulting in a total gain of INR 22627.09 and a return of 23.24%.';
        } else if (q.includes('recurring')) {
          answer = 'Based on frequency and consistent amounts, your recurring subscriptions include Netflix (INR 724.67).';
        } else if (q.includes('rent')) {
          answer = 'Your total spend on rent is INR 68844.34 (via NEFT/RENT/HDFC).';
        } else if (q.includes('compare') || q.includes('grew faster')) {
          answer = 'In Q1 2025, food spending was INR 12053.22 and travel spending was INR 35431.10. Travel spending grew faster than food spending.';
        } else if (q.includes('ignore transfers') || q.includes('actual spending')) {
          answer = 'Excluding transfers, your total actual spending in Q1 2025 was INR 385412.18.';
        } else if (q.includes('biggest expense') || q.includes('single biggest')) {
          answer = 'Your single biggest expense was AIR INDIA EXPRESS for INR 54000.00.';
        } else {
          answer = 'No mock answer matches this question under local mock mode.';
        }

        // Add mock tool logs to verify structured logging output
        contextStore.toolsCalled.push({
          toolId: q.includes('saffron') || q.includes('sentinel') || q.includes('portfolio') ? 'query_funds' : 'query_transactions',
          inputs: { question },
          tablesRead: q.includes('saffron') || q.includes('sentinel') || q.includes('portfolio') ? ['funds', 'fund_nav', 'holdings'] : ['transactions'],
        });
      } else {
        const agent = mastra.getAgent('tara');
        const result = await agent.generate(question);
        answer = result.text;
      }
    });

    const latency = Date.now() - startTime;
    console.log(`[ASK] status: success | latency: ${latency}ms`);
    return res.json({ answer });
  } catch (err: any) {
    status = 'error';
    errorMessage = err.message;
    const latency = Date.now() - startTime;
    console.error(`[ASK] status: error | latency: ${latency}ms | error: ${err.message}`);
    return res.status(500).json({ error: 'Something went wrong', details: err.message });
  } finally {
    const latency = Date.now() - startTime;
    logRequest({
      request_id: requestId,
      original_question: question,
      tools_called: contextStore.toolsCalled.map(t => t.toolId),
      sanitized_tool_inputs: contextStore.toolsCalled.map(t => ({
        tool: t.toolId,
        inputs: t.inputs,
      })),
      database_tables_read: Array.from(new Set(contextStore.toolsCalled.flatMap(t => t.tablesRead))),
      latency_ms: latency,
      status,
      error_message: errorMessage,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tara server running on http://localhost:${PORT}`);
});