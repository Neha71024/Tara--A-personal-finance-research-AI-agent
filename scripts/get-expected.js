import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function query() {
  const client = await pool.connect();
  try {
    console.log('--- EXPECTED VALUES FOR SAMPLE A ---');

    // 1. Food spend in March 2025 (including/excluding refunds)
    const foodMarch = await client.query(`
      SELECT SUM(amount) as sum FROM transactions 
      WHERE category = 'food' AND date >= '2025-03-01' AND date <= '2025-03-31'
    `);
    console.log('1. Food spend March 2025:', foodMarch.rows[0].sum);

    // 2. Swiggy spend (all Swiggy variants)
    const swiggy = await client.query(`
      SELECT SUM(amount) as sum FROM transactions 
      WHERE merchant ILIKE '%swiggy%'
    `);
    console.log('2. Swiggy spend (all):', swiggy.rows[0].sum);

    // 3. Top 5 merchants by net spend between Jan 2025 and Mar 2025
    const topMerchants = await client.query(`
      SELECT merchant, SUM(amount) as total FROM transactions 
      WHERE date >= '2025-01-01' AND date <= '2025-03-31' AND category != 'transfer'
      GROUP BY merchant ORDER BY total DESC LIMIT 5
    `);
    console.log('3. Top 5 merchants (Jan-Mar 2025):');
    topMerchants.rows.forEach(r => console.log(`   - ${r.merchant}: ${r.total}`));

    // 4. Rent data in April 2025 (should be no data)
    const rentApril = await client.query(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE category = 'rent' AND date >= '2025-04-01' AND date <= '2025-04-30'
    `);
    console.log('4. Rent count April 2025:', rentApril.rows[0].count);

    // 5. Saffron Bluechip Equity Fund return from 2024-01-01 to 2025-01-01
    const saffron = await client.query(`SELECT id, name FROM funds WHERE name ILIKE '%saffron%'`);
    if (saffron.rows.length > 0) {
      const fundId = saffron.rows[0].id;
      const navStart = await client.query(`SELECT nav FROM fund_nav WHERE fund_id = $1 AND date = '2024-01-01'`, [fundId]);
      const navEnd = await client.query(`SELECT nav FROM fund_nav WHERE fund_id = $1 AND date = '2025-01-01'`, [fundId]);
      if (navStart.rows[0] && navEnd.rows[0]) {
        const start = parseFloat(navStart.rows[0].nav);
        const end = parseFloat(navEnd.rows[0].nav);
        const ret = ((end - start) / start) * 100;
        console.log(`5. Saffron Fund return (2024-01-01 to 2025-01-01): ${ret.toFixed(2)}% (Start: ${start}, End: ${end})`);
      } else {
        console.log('5. Saffron Fund nav start/end not found');
      }
    }

    // 6. Portfolio worth today (overall summary)
    const portfolio = await client.query(`
      SELECT 
        SUM(h.units * latest.nav) as current_value,
        SUM(h.units * h.purchase_nav) as purchase_cost,
        SUM(h.units * latest.nav - h.units * h.purchase_nav) as gain
      FROM holdings h
      JOIN fund_nav latest ON latest.fund_id = h.fund_id
      WHERE latest.date = (SELECT MAX(date) FROM fund_nav WHERE fund_id = h.fund_id)
    `);
    console.log('6. Portfolio Summary:', portfolio.rows[0]);

    // 7. Realised return on Sentinel Nifty Index Fund
    const sentinel = await client.query(`SELECT id, name FROM funds WHERE name ILIKE '%sentinel%'`);
    if (sentinel.rows.length > 0) {
      const fundId = sentinel.rows[0].id;
      const holding = await client.query(`SELECT units, purchase_nav FROM holdings WHERE fund_id = $1`, [fundId]);
      const latestNav = await client.query(`SELECT nav FROM fund_nav WHERE fund_id = $1 ORDER BY date DESC LIMIT 1`, [fundId]);
      if (holding.rows[0] && latestNav.rows[0]) {
        const units = parseFloat(holding.rows[0].units);
        const pNav = parseFloat(holding.rows[0].purchase_nav);
        const lNav = parseFloat(latestNav.rows[0].nav);
        const cost = units * pNav;
        const val = units * lNav;
        const gain = val - cost;
        const ret = (gain / cost) * 100;
        console.log(`7. Sentinel holding return: Value: ${val.toFixed(2)}, Cost: ${cost.toFixed(2)}, Gain: ${gain.toFixed(2)}, Return: ${ret.toFixed(2)}%`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

query();
