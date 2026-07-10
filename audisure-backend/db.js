import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isLocal =
  process.env.DB_HOST === "localhost" ||
  process.env.DB_HOST === "127.0.0.1";

const caPath = path.join(__dirname, "ca.pem");

console.log("Database host:", process.env.DB_HOST);
console.log("Using local database:", isLocal);
console.log("CA certificate path:", caPath);
console.log("CA certificate exists:", fs.existsSync(caPath));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ...(isLocal
    ? {}
    : {
        ssl: {
          ca: fs.readFileSync(caPath, "utf8"),
          rejectUnauthorized: true,
        },
      }),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;