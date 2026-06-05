import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract database name and base connection URL
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/provue_tara';
console.log('Target DATABASE_URL:', dbUrl);

async function run() {
  // Parse connection URL to connect to the default 'postgres' database first
  const urlObj = new URL(dbUrl);
  const targetDb = urlObj.pathname.slice(1);
  
  // Set database to 'postgres' to connect and check/create the target database
  urlObj.pathname = '/postgres';
  const defaultUrl = urlObj.toString();
  
  console.log(`Connecting to default database to check if "${targetDb}" exists...`);
  
  let pool = new pg.Pool({ connectionString: defaultUrl });
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('Could not connect to PostgreSQL server. Is it running? Error:', err.message);
    await pool.end();
    process.exit(1);
  }

  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (res.rows.length === 0) {
      console.log(`Database "${targetDb}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Database "${targetDb}" created successfully.`);
    } else {
      console.log(`Database "${targetDb}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    client.release();
    await pool.end();
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  // Now connect to targetDb and create tables if they don't exist
  console.log(`Connecting directly to "${targetDb}"...`);
  pool = new pg.Pool({ connectionString: dbUrl });
  try {
    client = await pool.connect();
    
    // Check if transactions table exists
    const tableCheck = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions'"
    );
    
    if (tableCheck.rows.length === 0) {
      console.log('Tables do not exist. Loading schema from schema.sql...');
      const schemaPath = path.resolve(__dirname, '../schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('Schema loaded successfully!');
    } else {
      console.log('Tables already exist.');
    }
  } catch (err) {
    console.error('Error connecting to target database or running schema:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
