-- ============================================================
-- Installation Schedule — Migration SQL
-- Run this in the Supabase Dashboard SQL Editor
-- Project: wci-internal
-- Date: 2026-05-16
-- ============================================================

-- ── 1. INSTALLATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installations (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     text NOT NULL,
  project_id                uuid REFERENCES projects(id) ON DELETE SET NULL,
  client_name               text,
  site_address              text,
  suburb                    text,
  scheduled_date            date,
  scheduled_time_start      time,
  scheduled_time_end        time,
  date_tbc                  boolean NOT NULL DEFAULT false,
  status                    text NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','in_progress','completed','signed_off')),
  priority                  text NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('high','medium','low')),
  -- Site inspection
  site_inspection_required  boolean NOT NULL DEFAULT false,
  site_inspection_date      date,
  site_inspection_owner     text,
  site_inspection_done      boolean NOT NULL DEFAULT false,
  site_inspection_notes     text,
  -- Pre-install checklist (fixed 3 items)
  checklist_walls_prepared  boolean NOT NULL DEFAULT false,
  checklist_access_confirmed boolean NOT NULL DEFAULT false,
  checklist_delivery_on_site boolean NOT NULL DEFAULT false,
  -- Notes & metadata
  notes                     text,
  photo_placeholder         text,          -- deferred; field reserved
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ── 2. INSTALLERS (many-to-many junction) ───────────────────
CREATE TABLE IF NOT EXISTS installation_installers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  team_member      text NOT NULL,
  UNIQUE (installation_id, team_member)
);

-- ── 3. PRODUCTS TO INSTALL ──────────────────────────────────
CREATE TABLE IF NOT EXISTS installation_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  sku              text,
  quantity         numeric,
  unit             text,
  sort_order       int NOT NULL DEFAULT 0
);

-- ── 4. SNAGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installation_snags (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  description      text NOT NULL,
  resolved         boolean NOT NULL DEFAULT false,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 5. COMPLETION RECORD ────────────────────────────────────
CREATE TABLE IF NOT EXISTS installation_completion (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id       uuid NOT NULL UNIQUE REFERENCES installations(id) ON DELETE CASCADE,
  installer_notes       text,
  actual_duration_mins  int,
  client_signoff_name   text,
  client_signoff_date   date,
  completed_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 6. SIGN-OFF RECORD ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS installation_signoff (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid NOT NULL UNIQUE REFERENCES installations(id) ON DELETE CASCADE,
  signed_by        text NOT NULL,
  signed_at        date NOT NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 7. NOTIFICATIONS FRAMEWORK (deferred delivery) ──────────
CREATE TABLE IF NOT EXISTS installation_notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  recipient        text NOT NULL,   -- team member name or email
  trigger          text NOT NULL    -- 't_minus_7','t_minus_1','day_of','status_change','overdue'
                     CHECK (trigger IN ('t_minus_7','t_minus_1','day_of','status_change','overdue'))
);

-- ── 8. AUTO-UPDATE updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER installations_updated_at
  BEFORE UPDATE ON installations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. RLS ──────────────────────────────────────────────────
ALTER TABLE installations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_installers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_snags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_completion      ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_signoff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_notifications   ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admin/sales roles) full access
-- Adjust role checks to match your existing RLS pattern if needed
CREATE POLICY "auth_all_installations"              ON installations              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_installers"                 ON installation_installers   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_products"                   ON installation_products     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_snags"                      ON installation_snags        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_completion"                 ON installation_completion   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_signoff"                    ON installation_signoff      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notifications"              ON installation_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 10. INDEXES ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_installations_status         ON installations (status);
CREATE INDEX IF NOT EXISTS idx_installations_scheduled_date ON installations (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_installations_project_id     ON installations (project_id);
CREATE INDEX IF NOT EXISTS idx_inst_installers_inst_id      ON installation_installers (installation_id);
CREATE INDEX IF NOT EXISTS idx_inst_snags_inst_id           ON installation_snags (installation_id);

-- Add owner (sales person) field to installations
ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS owner TEXT;
