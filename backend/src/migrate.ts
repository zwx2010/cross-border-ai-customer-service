import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { loadConfig } from './config.js';

const config = loadConfig();
const migrationPath = fileURLToPath(new URL('../../migrations/001_initial.sql', import.meta.url));
const migration = await readFile(migrationPath, 'utf8');
const pool = mysql.createPool({ uri: config.mysqlUrl, multipleStatements: true });

try {
  await pool.query(migration);
  console.log('Database migration completed.');
} finally {
  await pool.end();
}
