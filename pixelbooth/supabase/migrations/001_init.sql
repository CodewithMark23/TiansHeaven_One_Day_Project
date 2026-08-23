-- Snappy Photobooth — Supabase Database Migration
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Booths Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booths (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        UNIQUE NOT NULL,
  host_name   TEXT        NOT NULL,
  guest_name  TEXT,
  status      TEXT        NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting', 'active', 'capturing', 'done')),
  layout      TEXT        NOT NULL DEFAULT 'side-by-side',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booths_code_idx ON booths (code);

-- ─── 2. Photos Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id    UUID        REFERENCES booths(id) ON DELETE CASCADE,
  taker_name  TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  filter      TEXT        NOT NULL DEFAULT 'original',
  position    INT         NOT NULL CHECK (position BETWEEN 1 AND 6),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_booth_id_idx ON photos (booth_id);

-- ─── 3. Memories Table (For QR Code & Public Sharing) ─────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id          TEXT        PRIMARY KEY,
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  frame       TEXT,
  frame_color TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_id_idx ON memories (id);

-- ─── 4. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE booths ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Booths policies
CREATE POLICY "booths_select_all" ON booths FOR SELECT USING (true);
CREATE POLICY "booths_insert_all" ON booths FOR INSERT WITH CHECK (true);
CREATE POLICY "booths_update_all" ON booths FOR UPDATE USING (true);
CREATE POLICY "booths_delete_all" ON booths FOR DELETE USING (true);

-- Photos policies
CREATE POLICY "photos_select_all" ON photos FOR SELECT USING (true);
CREATE POLICY "photos_insert_all" ON photos FOR INSERT WITH CHECK (true);
CREATE POLICY "photos_delete_all" ON photos FOR DELETE USING (true);

-- Memories policies
CREATE POLICY "memories_select_all" ON memories FOR SELECT USING (true);
CREATE POLICY "memories_insert_all" ON memories FOR INSERT WITH CHECK (true);

-- ─── 5. Realtime Publication ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE booths;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- ─── 6. Storage Bucket Setup Instructions ─────────────────────────────────────
-- In your Supabase Dashboard:
-- 1. Go to Storage → Create a new bucket named: "photos"
-- 2. Make the bucket Public so generated images can be viewed via QR code.
