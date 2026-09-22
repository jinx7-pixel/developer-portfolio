// db-setup.js — one-shot script that creates the `portfolio_db` database
// and the `contact_messages` table. Idempotent: safe to re-run.
//
// Run with:   npm run db:setup
//
// What it executes on the MySQL server:
//   CREATE DATABASE IF NOT EXISTS `portfolio_db`
//       DEFAULT CHARACTER SET utf8mb4
//       DEFAULT COLLATE utf8mb4_unicode_ci;
//   CREATE TABLE IF NOT EXISTS `portfolio_db`.`contact_messages` (
//       id          INT AUTO_INCREMENT PRIMARY KEY,
//       name        VARCHAR(100) NOT NULL,
//       email       VARCHAR(255) NOT NULL,
//       message     TEXT         NOT NULL,
//       created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
//   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

require('dotenv').config();

const mysql = require('mysql2/promise');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'portfolio_db';

async function main() {
    if (!DB_PASSWORD) {
        console.error('[db-setup] DB_PASSWORD is empty in .env — refusing to run.');
        console.error('[db-setup] Open C:\\Users\\user\\Downloads\\portfolio\\.env and set DB_PASSWORD, then retry.');
        process.exit(2);
    }

    // Connect WITHOUT specifying a database so we can CREATE DATABASE.
    const conn = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        multipleStatements: false,
    });

    try {
        console.log(`[db-setup] connecting to MySQL @ ${DB_HOST}:${DB_PORT} as ${DB_USER} ...`);
        console.log(`[db-setup] ensuring database \`${DB_NAME}\` exists ...`);
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
                DEFAULT CHARACTER SET utf8mb4
                DEFAULT COLLATE utf8mb4_unicode_ci`
        );

        console.log(`[db-setup] ensuring table \`${DB_NAME}\`.contact_messages exists ...`);
        await conn.query(`USE \`${DB_NAME}\``);
        await conn.query(
            `CREATE TABLE IF NOT EXISTS contact_messages (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                name        VARCHAR(100) NOT NULL,
                email       VARCHAR(255) NOT NULL,
                message     TEXT         NOT NULL,
                created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );

        // Quick sanity check: describe the table.
        const [cols] = await conn.query('DESCRIBE contact_messages');
        console.log('[db-setup] contact_messages columns:');
        for (const c of cols) {
            console.log(`  - ${c.Field.padEnd(10)} ${String(c.Type).padEnd(30)} null=${c.Null} key=${c.Key} default=${c.Default ?? '∅'}`);
        }

        console.log('[db-setup] done.');
    } finally {
        await conn.end();
    }
}

main().catch((err) => {
    console.error('[db-setup] failed:', err.code || '', err.message);
    process.exit(1);
});
