import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const isLocal =
  process.env.DB_HOST === 'localhost' ||
  process.env.DB_HOST === '127.0.0.1';

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ...(isLocal
    ? {}
    : {
        ssl: {
          rejectUnauthorized: true,
          ca: fs.readFileSync('./ca.pem')
        }
      }),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db;