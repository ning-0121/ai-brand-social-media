-- ============================================================
-- Phase C: Teams, Roles, Permissions
-- ============================================================

-- 1. Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write teams" ON teams FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read team_members" ON team_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write team_members" ON team_members FOR ALL USING (auth.uid() IS NOT NULL);

-- 3. Team Invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  accepted BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read team_invitations" ON team_invitations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write team_invitations" ON team_invitations FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. Add team_id to key tables (conditional)
DO $$
DECLARE
  tables_to_alter TEXT[] := ARRAY[
    'products', 'contents', 'social_accounts', 'scheduled_posts',
    'approval_tasks', 'creative_projects', 'brand_profiles',
    'content_queue', 'creative_exports'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_alter LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='team_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN team_id UUID', t);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_team ON %I(team_id)', t, t);
        RAISE NOTICE 'Added team_id to %', t;
      END IF;
    END IF;
  END LOOP;
END $$;
