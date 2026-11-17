import type { DatabaseSync } from 'node:sqlite';

// workflow-view owns only the wf_* tables (see pocs/CONTRACT.md).
const DDL = `
CREATE TABLE IF NOT EXISTS wf_workflows (id TEXT PRIMARY KEY, title TEXT NOT NULL, source TEXT, created_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS wf_workflows_source ON wf_workflows(source);
CREATE TABLE IF NOT EXISTS wf_cards (id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL, decision TEXT, x REAL NOT NULL, y REAL NOT NULL, expanded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS wf_cards_workflow ON wf_cards(workflow_id);
CREATE TABLE IF NOT EXISTS wf_edges (id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, source TEXT NOT NULL, target TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS wf_edges_workflow ON wf_edges(workflow_id);
CREATE TABLE IF NOT EXISTS wf_messages (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS wf_messages_card ON wf_messages(card_id, created_at);
CREATE TABLE IF NOT EXISTS wf_link_previews (url TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, description TEXT, image TEXT, site TEXT, fetched_at TEXT NOT NULL);
-- One OpenAI image per agent answer; the file is UPLOAD_DIR/<id>, served at /workflow/api/images/<id> (lib/imagegen.ts)
CREATE TABLE IF NOT EXISTS wf_images (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, prompt TEXT NOT NULL, mime TEXT NOT NULL, created_at TEXT NOT NULL);
-- Messages from before the one-origin setup linked the apps as http://localhost:3102/… and :3103/…
UPDATE wf_messages SET content = replace(replace(content, 'http://localhost:3102/', '/workflow/'), 'http://localhost:3103/', '/plan/')
  WHERE instr(content, 'http://localhost:3102/') OR instr(content, 'http://localhost:3103/');
`;

export function ensureSchema(d: DatabaseSync) {
  d.exec(DDL);
}
