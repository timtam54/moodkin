-- ============================================
-- Migration 004: Merge photographers + clients -> users
-- Run this in your Supabase SQL editor
-- ============================================

BEGIN;

-- Step 1: Rename photographers -> users, add client-specific fields
-- (Use IF EXISTS checks so this works whether partially run or fresh)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photographers') THEN
    ALTER TABLE photographers RENAME TO users;
  END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 2: Drop ALL FK constraints that reference clients or will block remapping
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_photographer_id_fkey;
ALTER TABLE client_invite_tokens DROP CONSTRAINT IF EXISTS client_invite_tokens_client_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE project_assets DROP CONSTRAINT IF EXISTS project_assets_uploaded_by_id_fkey;
ALTER TABLE asset_reactions DROP CONSTRAINT IF EXISTS asset_reactions_user_id_fkey;
ALTER TABLE asset_comments DROP CONSTRAINT IF EXISTS asset_comments_user_id_fkey;
ALTER TABLE moodboards DROP CONSTRAINT IF EXISTS moodboards_created_by_id_fkey;

-- Steps 3-6: Only run if clients table exists (skip if already migrated)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
    -- Step 3: For clients whose email matches an existing user, merge contact fields
    UPDATE users u
    SET
      phone = COALESCE(u.phone, sub.phone),
      address = COALESCE(u.address, sub.address),
      notes = COALESCE(u.notes, sub.notes)
    FROM (
      SELECT DISTINCT ON (LOWER(c.email))
        c.email, c.phone, c.address, c.notes
      FROM clients c
      INNER JOIN users u2 ON LOWER(u2.email) = LOWER(c.email)
      WHERE c.phone IS NOT NULL OR c.address IS NOT NULL OR c.notes IS NOT NULL
      ORDER BY LOWER(c.email), c.updated_at DESC
    ) sub
    WHERE LOWER(u.email) = LOWER(sub.email);

    -- Step 4: For clients whose email does NOT exist in users, insert new user row
    INSERT INTO users (id, email, name, avatar_url, phone, address, notes, auth_provider, auth_provider_id, subscription_status, created_at, updated_at)
    SELECT DISTINCT ON (LOWER(c.email))
      c.id, c.email, c.name, c.avatar_url, c.phone, c.address, c.notes,
      c.auth_provider, c.auth_provider_id, 'trial', c.created_at, c.updated_at
    FROM clients c
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(c.email))
    ORDER BY LOWER(c.email), c.updated_at DESC;

    -- Step 5: Build mapping from old client IDs to canonical user IDs
    DROP TABLE IF EXISTS client_id_map;
    CREATE TEMP TABLE client_id_map AS
    SELECT c.id AS old_id, u.id AS new_id
    FROM clients c
    JOIN users u ON LOWER(c.email) = LOWER(u.email);

    -- Step 6: Remap all FK references from old client IDs to canonical user IDs
    UPDATE conversations SET client_id = m.new_id FROM client_id_map m WHERE conversations.client_id = m.old_id AND conversations.client_id != m.new_id;
    UPDATE messages SET sender_id = m.new_id FROM client_id_map m WHERE messages.sender_id = m.old_id AND messages.sender_id != m.new_id;
    UPDATE project_assets SET uploaded_by_id = m.new_id FROM client_id_map m WHERE project_assets.uploaded_by_id = m.old_id AND project_assets.uploaded_by_id != m.new_id;
    UPDATE asset_reactions SET user_id = m.new_id FROM client_id_map m WHERE asset_reactions.user_id = m.old_id AND asset_reactions.user_id != m.new_id;
    UPDATE asset_comments SET user_id = m.new_id FROM client_id_map m WHERE asset_comments.user_id = m.old_id AND asset_comments.user_id != m.new_id;
    UPDATE moodboards SET created_by_id = m.new_id FROM client_id_map m WHERE moodboards.created_by_id = m.old_id AND moodboards.created_by_id != m.new_id;
    UPDATE client_invite_tokens SET client_id = m.new_id FROM client_id_map m WHERE client_invite_tokens.client_id = m.old_id AND client_invite_tokens.client_id != m.new_id;
  END IF;
END $$;

-- Step 7: Add is_owner column to project_users
ALTER TABLE project_users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- Step 8: Backfill project_users — only if photographer_id/client_id columns still exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'photographer_id') THEN
    INSERT INTO project_users (project_id, email, role, user_id, invite_status, invited_by_id, is_owner, accepted_at)
    SELECT c.id, u.email, 'creative', c.photographer_id, 'accepted', c.photographer_id, TRUE, NOW()
    FROM conversations c
    JOIN users u ON c.photographer_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM project_users pu WHERE pu.project_id = c.id AND pu.user_id = c.photographer_id
    )
    ON CONFLICT (project_id, email) DO UPDATE SET is_owner = TRUE, user_id = EXCLUDED.user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'client_id') THEN
    INSERT INTO project_users (project_id, email, role, user_id, invite_status, invited_by_id, accepted_at)
    SELECT c.id, u.email, 'client', c.client_id, 'accepted', c.photographer_id, NOW()
    FROM conversations c
    JOIN users u ON c.client_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM project_users pu WHERE pu.project_id = c.id AND (pu.user_id = c.client_id OR LOWER(pu.email) = LOWER(u.email))
    )
    ON CONFLICT (project_id, email) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;
END $$;

-- Backfill user_id on any project_users that have email matching a user but no user_id set
UPDATE project_users pu SET user_id = u.id
FROM users u WHERE pu.user_id IS NULL AND LOWER(pu.email) = LOWER(u.email);

-- Step 9: Drop old RLS policies that reference photographer_id or client_id before dropping columns
DROP POLICY IF EXISTS conversations_own ON conversations;
DROP POLICY IF EXISTS messages_own ON messages;
DROP POLICY IF EXISTS "Project owners can manage project users" ON project_users;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Project users can view clients for their projects" ON clients;
  END IF;
END $$;

-- Now drop photographer_id and client_id from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS photographer_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS client_id;

-- Step 10: Drop type discriminator columns
ALTER TABLE messages DROP COLUMN IF EXISTS sender_type;
ALTER TABLE project_assets DROP COLUMN IF EXISTS uploaded_by_type;
ALTER TABLE asset_reactions DROP COLUMN IF EXISTS user_type;
ALTER TABLE asset_comments DROP COLUMN IF EXISTS user_type;

-- Step 11: Rename photographer_id -> user_id on categories and templates
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'photographer_id') THEN
    ALTER TABLE categories RENAME COLUMN photographer_id TO user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'photographer_id') THEN
    ALTER TABLE templates RENAME COLUMN photographer_id TO user_id;
  END IF;
END $$;

-- Step 12: Rename client_id -> user_id on client_invite_tokens
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_invite_tokens' AND column_name = 'client_id') THEN
    ALTER TABLE client_invite_tokens RENAME COLUMN client_id TO user_id;
  END IF;
END $$;

-- Step 13: Add FK constraints for columns that now reference users (skip if already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_sender_id_fkey') THEN
    ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'project_assets_uploaded_by_id_fkey') THEN
    ALTER TABLE project_assets ADD CONSTRAINT project_assets_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'asset_reactions_user_id_fkey') THEN
    ALTER TABLE asset_reactions ADD CONSTRAINT asset_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'asset_comments_user_id_fkey') THEN
    ALTER TABLE asset_comments ADD CONSTRAINT asset_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'moodboards_created_by_id_fkey') THEN
    ALTER TABLE moodboards ADD CONSTRAINT moodboards_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 14: Drop clients table
DROP TABLE IF EXISTS clients CASCADE;

-- Step 15: Update RLS policies
DROP POLICY IF EXISTS "Users can view their own invites" ON project_users;
CREATE POLICY "Users can view their own invites" ON project_users FOR SELECT
  USING (email = (SELECT email FROM users WHERE id = auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can accept their own invites" ON project_users;
CREATE POLICY "Users can accept their own invites" ON project_users FOR UPDATE
  USING (email = (SELECT email FROM users WHERE id = auth.uid()) OR user_id = auth.uid())
  WITH CHECK (email = (SELECT email FROM users WHERE id = auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Project owners can manage project users" ON project_users;
CREATE POLICY "Project owners can manage project users" ON project_users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM project_users pu WHERE pu.project_id = project_users.project_id
    AND pu.user_id = auth.uid() AND pu.is_owner = TRUE
  ));

DROP POLICY IF EXISTS "Project users can view their projects" ON conversations;
CREATE POLICY "Project users can view their projects" ON conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_users pu WHERE pu.project_id = conversations.id
    AND pu.invite_status = 'accepted'
    AND (pu.user_id = auth.uid() OR pu.email = (SELECT email FROM users WHERE id = auth.uid()))
  ));

DROP POLICY IF EXISTS "Project users can view project assets" ON project_assets;
CREATE POLICY "Project users can view project assets" ON project_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_users pu WHERE pu.project_id = project_assets.conversation_id
    AND pu.invite_status = 'accepted'
    AND (pu.user_id = auth.uid() OR pu.email = (SELECT email FROM users WHERE id = auth.uid()))
  ));

-- Clean up
DROP TABLE IF EXISTS client_id_map;

COMMIT;
