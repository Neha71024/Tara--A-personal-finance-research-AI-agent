import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { pool } from '../../db/client';
import { requestStorage } from '../../utils/logger';

export const queryTransactions = createTool({
  id: 'query_transactions',
  description: `Query and aggregate the user's transactions. Use this for any question about spending, expenses, merchants, categories, or refunds. Excludes self-transfers by default.`,
  inputSchema: z.object({
    category: z.string().optional().describe('Filter by category e.g. food, transport, health'),
    merchant: z.string().optional().describe('Filter by merchant name, partial match supported'),
    from: z.string().optional().describe('Start date YYYY-MM-DD'),
    to: z.string().optional().describe('End date YYYY-MM-DD'),
    aggregate: z.enum(['sum', 'count', 'avg', 'top5', 'list']).default('sum').describe('Aggregation type: "sum" (total amount), "count" (number of transactions), "avg" (average transaction amount), "top5" (top 5 merchants by sum), or "list" (retrieve list of transaction details).'),
    includeRefunds: z.boolean().default(true).describe('If false, only count positive amounts'),
    includeTransfers: z.boolean().default(false).describe('If true, include transfer category'),
  }),
  execute: async ({ context }) => {
    const { category, merchant, from, to, aggregate, includeRefunds, includeTransfers } = context;

    const store = requestStorage.getStore();
    if (store) {
      store.toolsCalled.push({
        toolId: 'query_transactions',
        inputs: context,
        tablesRead: ['transactions'],
      });
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (!includeTransfers) {
      conditions.push(`category != 'transfer'`);
    }

    if (!includeRefunds) {
      conditions.push(`amount > 0`);
    }

    if (category) {
      conditions.push(`category ILIKE $${i++}`);
      params.push(`%${category}%`);
    }

    if (merchant) {
      conditions.push(`merchant ILIKE $${i++}`);
      params.push(`%${merchant}%`);
    }

    if (from) {
      conditions.push(`date >= $${i++}`);
      params.push(from);
    }

    if (to) {
      conditions.push(`date <= $${i++}`);
      params.push(to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let query = '';

    if (aggregate === 'sum') {
      query = `SELECT ROUND(SUM(amount)::numeric, 2) as total FROM transactions ${where}`;
    } else if (aggregate === 'count') {
      query = `SELECT COUNT(*) as count FROM transactions ${where}`;
    } else if (aggregate === 'avg') {
      query = `SELECT ROUND(AVG(amount)::numeric, 2) as average FROM transactions ${where}`;
    } else if (aggregate === 'top5') {
      query = `SELECT merchant, ROUND(SUM(amount)::numeric, 2) as total 
               FROM transactions ${where} 
               GROUP BY merchant 
               ORDER BY total DESC 
               LIMIT 5`;
    } else if (aggregate === 'list') {
      query = `SELECT id, date, merchant, category, amount, memo 
               FROM transactions ${where} 
               ORDER BY date DESC 
               LIMIT 20`;
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return { data: null, message: 'No transactions found for the given filters.' };
    }

    return { data: result.rows };
  },
});