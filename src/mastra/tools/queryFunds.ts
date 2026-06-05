import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { pool } from '../../db/client';
import { requestStorage } from '../../utils/logger';

export const queryFunds = createTool({
  id: 'query_funds',
  description: `Query mutual fund NAV history and compute period returns. Also computes the user's realised return on their holdings. Use this for any question about funds, NAV, returns, or portfolio value.`,
  inputSchema: z.object({
    type: z.enum(['period_return', 'holding_return', 'portfolio_summary', 'rank_funds']).describe('The query type: "period_return" (historical return of a specific fund between two dates), "holding_return" (current value and gain/loss of user holdings), "portfolio_summary" (overall portfolio summary), or "rank_funds" (rank all funds by return over a date range).'),
    fund_name: z.string().optional().describe('Partial fund name to search'),
    from: z.string().optional().describe('Start date YYYY-MM-DD for period return'),
    to: z.string().optional().describe('End date YYYY-MM-DD for period return'),
  }),
  execute: async ({ context }) => {
    const { type, fund_name, from, to } = context;

    const store = requestStorage.getStore();
    if (store) {
      const tablesRead = ['funds', 'fund_nav'];
      if (type === 'holding_return' || type === 'portfolio_summary') {
        tablesRead.push('holdings');
      }
      store.toolsCalled.push({
        toolId: 'query_funds',
        inputs: context,
        tablesRead,
      });
    }

    // 1. Period return for a specific fund between two dates
    if (type === 'period_return') {
      if (!fund_name || !from || !to) {
        return { error: 'fund_name, from, and to are required for period_return' };
      }

      const result = await pool.query(
        `SELECT f.name,
                nav_start.nav as nav_start,
                nav_end.nav as nav_end,
                ROUND(((nav_end.nav - nav_start.nav) / nav_start.nav * 100)::numeric, 2) as return_pct
         FROM funds f
         JOIN fund_nav nav_start ON nav_start.fund_id = f.id AND nav_start.date = $2
         JOIN fund_nav nav_end ON nav_end.fund_id = f.id AND nav_end.date = $3
         WHERE f.name ILIKE $1`,
        [`%${fund_name}%`, from, to]
      );

      if (result.rows.length === 0) {
        return { message: 'No data found for that fund or date range.' };
      }

      return { data: result.rows[0] };
    }

    // 2. Realised return on user's holdings
    if (type === 'holding_return') {
      const params: any[] = [];
      let fundFilter = '';

      if (fund_name) {
        fundFilter = `AND h.fund_name ILIKE $1`;
        params.push(`%${fund_name}%`);
      }

      const result = await pool.query(
        `SELECT 
            h.fund_name,
            h.units,
            h.purchase_nav,
            h.purchase_date,
            latest.nav as current_nav,
            ROUND((h.units * latest.nav)::numeric, 2) as current_value,
            ROUND((h.units * h.purchase_nav)::numeric, 2) as purchase_cost,
            ROUND((h.units * latest.nav - h.units * h.purchase_nav)::numeric, 2) as gain_inr,
            ROUND(((h.units * latest.nav - h.units * h.purchase_nav) / (h.units * h.purchase_nav) * 100)::numeric, 2) as return_pct
         FROM holdings h
         JOIN fund_nav latest ON latest.fund_id = h.fund_id
         WHERE latest.date = (SELECT MAX(date) FROM fund_nav WHERE fund_id = h.fund_id)
         ${fundFilter}
         ORDER BY return_pct DESC`,
        params
      );

      if (result.rows.length === 0) {
        return { message: 'No holdings found.' };
      }

      return { data: result.rows };
    }

    // 3. Full portfolio summary
    if (type === 'portfolio_summary') {
      const result = await pool.query(
        `SELECT 
            ROUND(SUM(h.units * latest.nav)::numeric, 2) as total_current_value,
            ROUND(SUM(h.units * h.purchase_nav)::numeric, 2) as total_purchase_cost,
            ROUND(SUM(h.units * latest.nav - h.units * h.purchase_nav)::numeric, 2) as total_gain_inr,
            ROUND((SUM(h.units * latest.nav - h.units * h.purchase_nav) / SUM(h.units * h.purchase_nav) * 100)::numeric, 2) as total_return_pct
         FROM holdings h
         JOIN fund_nav latest ON latest.fund_id = h.fund_id
         WHERE latest.date = (SELECT MAX(date) FROM fund_nav WHERE fund_id = h.fund_id)`
      );

      return { data: result.rows[0] };
    }

    // 4. Rank all funds by return between two dates
    if (type === 'rank_funds') {
      if (!from || !to) {
        return { error: 'from and to dates are required for rank_funds' };
      }

      const result = await pool.query(
        `SELECT f.name,
                ROUND(((nav_end.nav - nav_start.nav) / nav_start.nav * 100)::numeric, 2) as return_pct
         FROM funds f
         JOIN fund_nav nav_start ON nav_start.fund_id = f.id AND nav_start.date = $1
         JOIN fund_nav nav_end ON nav_end.fund_id = f.id AND nav_end.date = $2
         ORDER BY return_pct DESC`,
        [from, to]
      );

      if (result.rows.length === 0) {
        return { message: 'No fund data found for that date range.' };
      }

      return { data: result.rows };
    }

    return { error: 'Invalid type' };
  },
});