import Database from 'better-sqlite3';
import { assertDatabaseReadyForRuntime, assertDatabaseSchemaCompatibility, KNOWN_MIGRATIONS } from './databaseCompatibility';

if (KNOWN_MIGRATIONS.length !== 21 || KNOWN_MIGRATIONS.at(-1) !== '021_report_center_snapshots') {
  throw new Error('Database compatibility policy must explicitly recognize migrations through 021.');
}

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
for (const id of KNOWN_MIGRATIONS) insert.run(id, new Date().toISOString());
assertDatabaseReadyForRuntime(database);

insert.run('999_future_schema', new Date().toISOString());
let rejected = false;
try {
  assertDatabaseSchemaCompatibility(database);
} catch (error) {
  rejected = error instanceof Error && error.message.includes('Unknown migrations: 999_future_schema');
}
if (!rejected) throw new Error('A database created by a newer incompatible application build must be rejected.');
database.prepare('DELETE FROM schema_migrations WHERE id = ?').run('999_future_schema');

const fkDatabase = new Database(':memory:');
fkDatabase.pragma('foreign_keys = OFF');
fkDatabase.exec(`
  CREATE TABLE parent (id TEXT PRIMARY KEY);
  CREATE TABLE child (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL, FOREIGN KEY(parent_id) REFERENCES parent(id));
  INSERT INTO child (id, parent_id) VALUES ('child-1', 'missing-parent');
`);
fkDatabase.pragma('foreign_keys = ON');
let fkRejected = false;
try {
  assertDatabaseReadyForRuntime(fkDatabase);
} catch (error) {
  fkRejected = error instanceof Error && error.message.includes('foreign key integrity check failed');
}
if (!fkRejected) throw new Error('Runtime database guard must reject foreign key violations.');

fkDatabase.close();
database.close();
console.log('Database compatibility and runtime health guard smoke validation passed through migration 021.');
