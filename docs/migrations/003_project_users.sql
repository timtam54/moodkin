-- Project Users table for controlling project access
-- Run this in your Supabase SQL editor

-- Create enum for user roles in projects
CREATE TYPE project_user_role AS ENUM ('creative', 'client');
CREATE TYPE project_invite_status AS ENUM ('pending', 'accepted', 'declined');

-- Project users table
CREATE TABLE project_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role project_user_role NOT NULL,
  user_id UUID REFERENCES photographers(id) ON DELETE SET NULL,
  invite_token UUID DEFAULT gen_random_uuid(),
  invite_status project_invite_status DEFAULT 'pending',
  invited_by_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique email per project
  UNIQUE(project_id, email)
);

-- Create indexes for faster lookups
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_email ON project_users(email);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
CREATE INDEX idx_project_users_invite_token ON project_users(invite_token);

-- RLS policies
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Project owners can manage project users
CREATE POLICY "Project owners can manage project users"
  ON project_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = project_users.project_id
      AND c.photographer_id = auth.uid()
    )
  );

-- Users can view their own invites
CREATE POLICY "Users can view their own invites"
  ON project_users
  FOR SELECT
  USING (
    email = (SELECT email FROM photographers WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Users can accept their own invites
CREATE POLICY "Users can accept their own invites"
  ON project_users
  FOR UPDATE
  USING (
    email = (SELECT email FROM photographers WHERE id = auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    email = (SELECT email FROM photographers WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_project_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_users_updated_at
  BEFORE UPDATE ON project_users
  FOR EACH ROW
  EXECUTE FUNCTION update_project_users_updated_at();

-- Grant access to project users for viewing project data
-- Update conversations RLS to allow project users to view
CREATE POLICY "Project users can view their projects"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = conversations.id
      AND pu.invite_status = 'accepted'
      AND (
        pu.user_id = auth.uid()
        OR pu.email = (SELECT email FROM photographers WHERE id = auth.uid())
      )
    )
  );

-- Project users can view project assets
CREATE POLICY "Project users can view project assets"
  ON project_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = project_assets.conversation_id
      AND pu.invite_status = 'accepted'
      AND (
        pu.user_id = auth.uid()
        OR pu.email = (SELECT email FROM photographers WHERE id = auth.uid())
      )
    )
  );

-- Project users can view client details (read-only) if they have access to a project with that client
CREATE POLICY "Project users can view clients for their projects"
  ON clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN project_users pu ON pu.project_id = c.id
      WHERE c.client_id = clients.id
      AND pu.invite_status = 'accepted'
      AND (
        pu.user_id = auth.uid()
        OR pu.email = (SELECT email FROM photographers WHERE id = auth.uid())
      )
    )
  );
