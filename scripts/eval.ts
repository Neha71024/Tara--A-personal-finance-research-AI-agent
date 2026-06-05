import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface TestCase {
  id: number;
  category: string;
  question: string;
  validate: (answer: string) => boolean;
  expectedDescription: string;
}

const testCases: TestCase[] = [
  {
    id: 1,
    category: 'Single Lookup',
    question: 'How much did I spend on food in March 2025?',
    validate: (ans) => ans.includes('4075.17'),
    expectedDescription: 'Contains "4075.17" (food spend)',
  },
  {
    id: 2,
    category: 'Date Filtering',
    question: 'How much did I spend at Swiggy?',
    validate: (ans) => ans.includes('47239.23'),
    expectedDescription: 'Contains "47239.23" (Swiggy total)',
  },
  {
    id: 3,
    category: 'Refunds',
    question: 'How much did I spend on food in March 2025 after refunds?',
    validate: (ans) => ans.includes('4075.17'),
    expectedDescription: 'Contains "4075.17" (food spend after refunds)',
  },
  {
    id: 4,
    category: 'Merchant Aliases',
    question: 'How much did I spend on Swiggy, including Swiggy Instamart and SWIGGY orders?',
    validate: (ans) => ans.includes('47239.23'),
    expectedDescription: 'Contains "47239.23" (merged Swiggy aliases)',
  },
  {
    id: 5,
    category: 'Transfers',
    question: 'Ignore transfers. What was my total actual spending in Q1 2025?',
    validate: (ans) => ans.includes('385412.18'),
    expectedDescription: 'Contains "385412.18" (Q1 spending excluding transfers)',
  },
  {
    id: 6,
    category: 'Category Comparison',
    question: 'Compare my food and travel spending in Q1 2025. Which grew faster?',
    validate: (ans) => ans.toLowerCase().includes('travel') && ans.toLowerCase().includes('grew faster'),
    expectedDescription: 'Indicates travel spending grew faster',
  },
  {
    id: 7,
    category: 'Recurring Subscriptions',
    question: 'Which transactions look like recurring subscriptions?',
    validate: (ans) => ans.toLowerCase().includes('netflix'),
    expectedDescription: 'Identifies "Netflix" as recurring subscription',
  },
  {
    id: 8,
    category: 'No-Data Cases',
    question: 'Do I have any data for rent in April 2025?',
    validate: (ans) => ans.toLowerCase().includes('no data') || ans.toLowerCase().includes('no transaction'),
    expectedDescription: 'Gracefully handles empty result and indicates no data',
  },
  {
    id: 9,
    category: 'Fund Period Returns',
    question: "What was Saffron Bluechip Equity Fund's return from 2024-01-01 to 2025-01-01?",
    validate: (ans) => ans.includes('31.17'),
    expectedDescription: 'Contains "31.17%" (fund period return)',
  },
  {
    id: 10,
    category: 'Realised Returns on Holdings',
    question: 'What is my realised return on my Sentinel Nifty Index Fund holding?',
    validate: (ans) => ans.includes('18.48'),
    expectedDescription: 'Contains "18.48%" (holding realised return)',
  },
  {
    id: 11,
    category: 'Portfolio Aggregate',
    question: 'What is my portfolio worth today, and how much have I made on it?',
    validate: (ans) => ans.includes('119983.80') && ans.includes('22627.09'),
    expectedDescription: 'Contains "119983.80" (current worth) and "22627.09" (gains)',
  },
  {
    id: 12,
    category: 'Single Biggest Expense',
    question: 'What was my single biggest expense?',
    validate: (ans) => ans.toLowerCase().includes('air india express') || ans.includes('54000'),
    expectedDescription: 'Identifies Air India Express or 54000',
  },
];

async function runEvals() {
  console.log('\n==================================================');
  console.log('         TARA AGENT EVALUATION RUNNER             ');
  console.log('==================================================\n');

  const serverUrl = process.env.SERVER_URL || 'http://localhost:3000/ask';
  console.log(`Target server endpoint: ${serverUrl}`);
  console.log(`Local Mock Mode: ${process.env.MOCK_LLM === 'true' ? 'ENABLED' : 'DISABLED'}\n`);

  let passed = 0;
  let failed = 0;
  const failedCases: { id: number; question: string; got: string; expected: string }[] = [];

  for (const tc of testCases) {
    console.log(`Running Test #${tc.id} [${tc.category}]...`);
    console.log(`Question: "${tc.question}"`);

    try {
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: tc.question }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data = (await res.json()) as { answer: string };
      const answer = data.answer;

      console.log(`Agent response: "${answer.trim()}"`);

      const isPassed = tc.validate(answer);
      if (isPassed) {
        console.log('✅ PASS\n');
        passed++;
      } else {
        console.log('❌ FAIL\n');
        failed++;
        failedCases.push({
          id: tc.id,
          question: tc.question,
          got: answer,
          expected: tc.expectedDescription,
        });
      }
    } catch (err: any) {
      console.log(`❌ FAIL (Error calling API: ${err.message})\n`);
      failed++;
      failedCases.push({
        id: tc.id,
        question: tc.question,
        got: `ERROR: ${err.message}`,
        expected: tc.expectedDescription,
      });
    }
  }

  console.log('==================================================');
  console.log('                EVALUATION SUMMARY                ');
  console.log('==================================================');
  console.log(`Total Passed: ${passed}`);
  console.log(`Total Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(2)}%`);
  console.log('==================================================\n');

  if (failed > 0) {
    console.log('FAILED CASES DETAILS:');
    failedCases.forEach((fc) => {
      console.log(`- Test #${fc.id}: "${fc.question}"`);
      console.log(`  Expected: ${fc.expected}`);
      console.log(`  Got:      ${fc.got}\n`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All test cases passed successfully!\n');
    process.exit(0);
  }
}

runEvals();
