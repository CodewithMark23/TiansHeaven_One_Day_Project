-- PixelBooth — Supabase Database Migration
-- Run this in your Supabase project's SQL Editor

-- ─── Enable UUID extension ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Booths Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booths (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        UNIQUE NOT NULL,
  host_name   TEXT        NOT NULL,
  guest_name  TEXT,
  status      TEXT        NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting', 'active', 'done')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS booths_code_idx ON booths (code);

-- Auto-cleanup booths older than 24 hours (optional, run via pg_cron or Supabase scheduled functions)
-- DELETE FROM booths WHERE created_at < now() - INTERVAL '24 hours';

-- ─── Photos Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id    UUID        REFERENCES booths(id) ON DELETE CASCADE,
  taker_name  TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  filter      TEXT        NOT NULL DEFAULT 'none',
  position    INT         NOT NULL CHECK (position BETWEEN 1 AND 4),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_booth_id_idx ON photos (booth_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Booths: anyone can read (needed for joining with code)
CREATE POLICY "booths_select_all"
  ON booths FOR SELECT USING (true);

-- Booths: anyone can insert (anonymous booth creation)
CREATE POLICY "booths_insert_all"
  ON booths FOR INSERT WITH CHECK (true);

-- Booths: anyone can update (for setting guest_name & status)
CREATE POLICY "booths_update_all"
  ON booths FOR UPDATE USING (true);

-- Photos: anyone can read
CREATE POLICY "photos_select_all"
  ON photos FOR SELECT USING (true);

-- Photos: anyone can insert
CREATE POLICY "photos_insert_all"
  ON photos FOR INSERT WITH CHECK (true);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for the booths table (for Postgres Changes listener)
-- In your Supabase dashboard: Database → Replication → Add tables → booths, photos
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE booths;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Create a public storage bucket for photo strips (run in Supabase dashboard or via API)
-- Name: pixelbooth-photos
-- Public: true (for easy URL sharing)
-- Note: For production, use private bucket + signed URLs

-- ─── Done! ───────────────────────────────────────────────────────────────────
-- Your Supabase backend is ready for PixelBooth.
-- Remember to:
-- 1. Copy .env.example to .env
-- 2. Fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 3. Enable Realtime for the booths table in the dashboard
