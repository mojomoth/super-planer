import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// One SQLite file shared by all three PoCs (pocs/.data/super-planer.db) so step1 → workflow-view → plan-doc can hand data over.
const file = process.env.SUPER_PLANER_DB ?? path.join(process.cwd(), '..', '.data', 'super-planer.db');
const g = globalThis as unknown as { __spdb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__spdb) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const d = new DatabaseSync(file);
    d.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000; PRAGMA foreign_keys = ON;');
    g.__spdb = d;
  }
  return g.__spdb;
}

export function tableExists(name: string): boolean {
  return !!db().prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}
