import mysql from 'mysql2/promise';

const globalForDb = globalThis as typeof globalThis & {
  _dbPool?: mysql.Pool;
};

export const pool =
  globalForDb._dbPool ??
  mysql.createPool({
    host: 'localhost',
    user: 'pashut_lehazmin',
    password: 'pashut_lehazmin_dev',
    database: 'pashut_lehazmin',
    waitForConnections: true,
    connectionLimit: 5,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._dbPool = pool;
}
