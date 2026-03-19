-- Migration: 0001_initial_schema
-- Description: Create all 6 core tables with indexes and constraints

SET search_path = public;

-- 1. specs
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  source_url TEXT,
  raw_spec JSONB NOT NULL,
  tool_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_specs_user_id ON specs (user_id);
CREATE INDEX idx_specs_user_name ON specs (user_id, name);

-- 2. mcp_servers
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  transport TEXT NOT NULL DEFAULT 'sse' CHECK (transport IN ('sse', 'streamable-http')),
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('none', 'api_key', 'bearer')),
  base_url TEXT NOT NULL,
  rate_limit INTEGER NOT NULL DEFAULT 100 CHECK (rate_limit > 0 AND rate_limit <= 10000),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servers_user_id ON mcp_servers (user_id);
CREATE INDEX idx_servers_spec_id ON mcp_servers (spec_id);
CREATE UNIQUE INDEX idx_servers_user_slug ON mcp_servers (user_id, slug);
CREATE INDEX idx_servers_active_user ON mcp_servers (user_id) WHERE is_active = true;

-- 3. mcp_tools
CREATE TABLE mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tools_server_id ON mcp_tools (server_id);
CREATE UNIQUE INDEX idx_tools_server_name ON mcp_tools (server_id, name);
CREATE INDEX idx_tools_active_server ON mcp_tools (server_id) WHERE is_active = true;

-- 4. credentials
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key', 'bearer')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credentials_server_id ON credentials (server_id);
CREATE INDEX idx_credentials_user_id ON credentials (user_id);
CREATE INDEX idx_credentials_server_user ON credentials (server_id, user_id);

-- 5. usage_events (append-only, no updated_at)
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES mcp_tools(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_code TEXT
);

CREATE INDEX idx_usage_server_id ON usage_events (server_id);
CREATE INDEX idx_usage_user_id ON usage_events (user_id);
CREATE INDEX idx_usage_timestamp ON usage_events (timestamp);
CREATE INDEX idx_usage_tool_id ON usage_events (tool_id);
CREATE INDEX idx_usage_server_timestamp ON usage_events (server_id, timestamp);

-- 6. request_logs (append-only, no updated_at)
CREATE TABLE request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES mcp_tools(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_server_id ON request_logs (server_id);
CREATE INDEX idx_logs_user_id ON request_logs (user_id);
CREATE INDEX idx_logs_timestamp ON request_logs (timestamp);
CREATE INDEX idx_logs_request_id ON request_logs (request_id);
CREATE INDEX idx_logs_tool_id ON request_logs (tool_id);
CREATE INDEX idx_logs_server_timestamp ON request_logs (server_id, timestamp);

-- Auto-update updated_at trigger (only on mutable tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_specs_updated_at BEFORE UPDATE ON specs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_servers_updated_at BEFORE UPDATE ON mcp_servers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tools_updated_at BEFORE UPDATE ON mcp_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_credentials_updated_at BEFORE UPDATE ON credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------
-- Down Migration
------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_credentials_updated_at ON credentials;
-- DROP TRIGGER IF EXISTS trg_tools_updated_at ON mcp_tools;
-- DROP TRIGGER IF EXISTS trg_servers_updated_at ON mcp_servers;
-- DROP TRIGGER IF EXISTS trg_specs_updated_at ON specs;
-- DROP FUNCTION IF EXISTS update_updated_at();
-- DROP INDEX IF EXISTS idx_logs_server_timestamp;
-- DROP INDEX IF EXISTS idx_logs_tool_id;
-- DROP INDEX IF EXISTS idx_logs_request_id;
-- DROP INDEX IF EXISTS idx_logs_timestamp;
-- DROP INDEX IF EXISTS idx_logs_user_id;
-- DROP INDEX IF EXISTS idx_logs_server_id;
-- DROP INDEX IF EXISTS idx_usage_server_timestamp;
-- DROP INDEX IF EXISTS idx_usage_tool_id;
-- DROP INDEX IF EXISTS idx_usage_timestamp;
-- DROP INDEX IF EXISTS idx_usage_user_id;
-- DROP INDEX IF EXISTS idx_usage_server_id;
-- DROP INDEX IF EXISTS idx_credentials_server_user;
-- DROP INDEX IF EXISTS idx_credentials_user_id;
-- DROP INDEX IF EXISTS idx_credentials_server_id;
-- DROP INDEX IF EXISTS idx_tools_active_server;
-- DROP INDEX IF EXISTS idx_tools_server_name;
-- DROP INDEX IF EXISTS idx_tools_server_id;
-- DROP INDEX IF EXISTS idx_servers_active_user;
-- DROP INDEX IF EXISTS idx_servers_user_slug;
-- DROP INDEX IF EXISTS idx_servers_spec_id;
-- DROP INDEX IF EXISTS idx_servers_user_id;
-- DROP INDEX IF EXISTS idx_specs_user_name;
-- DROP INDEX IF EXISTS idx_specs_user_id;
-- DROP TABLE IF EXISTS request_logs;
-- DROP TABLE IF EXISTS usage_events;
-- DROP TABLE IF EXISTS credentials;
-- DROP TABLE IF EXISTS mcp_tools;
-- DROP TABLE IF EXISTS mcp_servers;
-- DROP TABLE IF EXISTS specs;
