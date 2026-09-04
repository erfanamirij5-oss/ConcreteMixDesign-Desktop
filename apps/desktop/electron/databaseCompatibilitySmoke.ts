import Database from 'better-sqlite3';
import { assertDatabaseSchemaCompatibility, KNOWN_MIGRATIONS } from './databaseCompatibility';

const database = new Database(':memory:');
database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
for (const id of KNOWN_MIGRATIONS) insert.run(id, new Date().toISOString());
assertDatabaseSchemaCompatibility(database);

insert.run('999_future_schema', new Date().toISOString());
let rejected = false;
try {
  assertDatabaseSchemaCompatibility(database);
} catch (error) {
  rejected = error instanceof Error && error.message.includes('Unknown migrations: 999_future_schema');
}
if (!rejected) throw new Error('A database created by a newer incompatible application build must be rejected.');

database.close();
console.log('Database schema compatibility policy smoke validation passed.');
