import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DATA_DIR = process.env.DATA_DIR || './data/sample_a';

async function ingest() {
  const client = await pool.connect();
  
  try {
    console.log(`Ingesting from ${DATA_DIR}...`);

    // Clear existing data
    await client.query('DELETE FROM holdings');
    await client.query('DELETE FROM fund_nav');
    await client.query('DELETE FROM funds');
    await client.query('DELETE FROM transactions');

    // 1. Ingest transactions
    const transactions = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'transactions.json'), 'utf-8')
    );
    for (const t of transactions) {
      await client.query(
        `INSERT INTO transactions (id, date, merchant, category, amount, currency, memo, snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.date, t.merchant, t.category, t.amount, t.currency || 'INR', t.memo || '', DATA_DIR]
      );
    }
    console.log(`✅ Inserted ${transactions.length} transactions`);

    // 2. Ingest funds + NAV
    const funds = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'funds.json'), 'utf-8')
    );
    for (const f of funds) {
      await client.query(
        `INSERT INTO funds (id, name, category) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [f.id, f.name, f.category]
      );
      for (const nav of f.nav) {
        await client.query(
          `INSERT INTO fund_nav (fund_id, date, nav) VALUES ($1, $2, $3)
           ON CONFLICT (fund_id, date) DO NOTHING`,
          [f.id, nav.date, nav.value]
        );
      }
    }
    console.log(`✅ Inserted ${funds.length} funds with NAV history`);

    // 3. Ingest holdings
    const holdings = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'holdings.json'), 'utf-8')
    );
    for (const h of holdings) {
      await client.query(
        `INSERT INTO holdings (fund_id, fund_name, units, purchase_date, purchase_nav)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (fund_id) DO NOTHING`,
        [h.fund_id, h.fund_name, h.units, h.purchase_date, h.purchase_nav]
      );
    }
    console.log(`✅ Inserted ${holdings.length} holdings`);

    console.log('✅ Ingest complete!');
  } catch (err) {
    console.error('Ingest error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

ingest();