import db from './db.js';

const test = async () => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log('✅ DB connected! Test result:', rows[0].result);
  } catch (err) {
    console.error('❌ DB connection error:', err);
  } finally {
    process.exit(); // close the script after test
  }
};

test();
