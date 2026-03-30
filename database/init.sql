-- YumiVibe Database Schema
-- Run with: psql $DATABASE_URL -f database/init.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Users table
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL DEFAULT 'User',
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Dashboards table
-- =============================================================================
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'My Dashboard',
  theme VARCHAR(20) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  background VARCHAR(500) NOT NULL DEFAULT '#ffffff',
  background_type VARCHAR(20) NOT NULL DEFAULT 'color'
    CHECK (background_type IN ('color', 'gradient', 'image', 'unsplash')),
  accent_color VARCHAR(20),
  palette JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Blocks table
-- =============================================================================
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN (
    'greeting', 'clock', 'timer', 'pomodoro', 'weather',
    'quotes', 'notes', 'todos', 'youtube', 'spotify', 'title'
  )),
  title VARCHAR(100) NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '{}',
  layout_x INTEGER NOT NULL DEFAULT 0,
  layout_y INTEGER NOT NULL DEFAULT 0,
  layout_w INTEGER NOT NULL DEFAULT 4,
  layout_h INTEGER NOT NULL DEFAULT 4,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_dashboard_id ON blocks(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dashboards_updated_at'
  ) THEN
    CREATE TRIGGER trg_dashboards_updated_at
      BEFORE UPDATE ON dashboards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_blocks_updated_at'
  ) THEN
    CREATE TRIGGER trg_blocks_updated_at
      BEFORE UPDATE ON blocks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
