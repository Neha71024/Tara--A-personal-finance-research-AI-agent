import { pool } from '../src/db/client.ts';

async function run() {
  try {
    console.log('Testing query on database...');
    const res = await pool.query('SELECT COUNT(*) FROM transactions');
    console.log('✅ Transactions count:', res.rows[0].count);
    
    const sample = await pool.query('SELECT merchant, amount FROM transactions LIMIT 5');
    console.log('Sample rows:', sample.rows);
  } catch (err) {
    console.error('❌ Database query error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
