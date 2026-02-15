import { DatabaseAdapter } from './db_interface';
import { SqliteAdapter } from './db_sqlite';
import { PostgresAdapter } from './db_postgres';

// Factory to select the correct adapter based on environment
let adapter: DatabaseAdapter;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    console.log('[Database] Selecting PostgresAdapter...');
    adapter = new PostgresAdapter(process.env.DATABASE_URL);
} else {
    console.log('[Database] Selecting SqliteAdapter...');
    adapter = new SqliteAdapter();
}

export const db = adapter;
