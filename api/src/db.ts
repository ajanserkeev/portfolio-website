import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function initDatabase(dbPath = ':memory:'): DatabaseSync {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT,
      pain TEXT,
      services TEXT,
      estimate TEXT,
      session_id TEXT,
      locale TEXT NOT NULL,
      ip TEXT,
      status TEXT NOT NULL DEFAULT 'new'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      slot_start TEXT NOT NULL UNIQUE,
      slot_end TEXT NOT NULL,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      channel TEXT NOT NULL,
      session_id TEXT,
      locale TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      locale TEXT NOT NULL,
      pain TEXT,
      request_count INTEGER NOT NULL DEFAULT 0,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      url TEXT,
      user_agent TEXT,
      ip TEXT
    );
  `);

  return db;
}
