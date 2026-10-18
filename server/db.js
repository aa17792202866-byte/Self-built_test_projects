import 'dotenv/config';
import mysql from 'mysql2/promise';

export const databaseName = process.env.DB_NAME || 'registration_lab';
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) throw new Error('DB_NAME 只能包含字母、数字和下划线');
const options = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  connectTimeout: 5000,
  charset: 'utf8mb4',
};
export const pool = mysql.createPool({ ...options, database: databaseName, connectionLimit: 5, waitForConnections: true, queueLimit: 20 });
export async function initializeDatabase() {
  const connection = await mysql.createConnection(options);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS \`${databaseName}\`.users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(20) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      terms_accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_username (username),
      UNIQUE KEY uq_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  } finally { await connection.end(); }
}
