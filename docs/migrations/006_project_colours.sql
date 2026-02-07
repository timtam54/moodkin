-- Project colours table
CREATE TABLE project_colours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  hex_color VARCHAR(7) NOT NULL, -- e.g., #FF5733
  name VARCHAR(100), -- optional colour name
  added_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colour reactions table (like/redflag)
CREATE TABLE colour_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colour_id UUID NOT NULL REFERENCES project_colours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'redflag')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(colour_id, user_id, reaction_type)
);

-- Colour comments table
CREATE TABLE colour_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colour_id UUID NOT NULL REFERENCES project_colours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_colours_conversation ON project_colours(conversation_id);
CREATE INDEX idx_colour_reactions_colour ON colour_reactions(colour_id);
CREATE INDEX idx_colour_comments_colour ON colour_comments(colour_id);

-- RLS Policies
ALTER TABLE project_colours ENABLE ROW LEVEL SECURITY;
ALTER TABLE colour_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE colour_comments ENABLE ROW LEVEL SECURITY;

-- Allow access to project members
CREATE POLICY "Project members can view colours" ON project_colours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_colours.conversation_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can add colours" ON project_colours
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = project_colours.conversation_id
      AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own colours" ON project_colours
  FOR DELETE USING (added_by_id = auth.uid());

-- Colour reactions policies
CREATE POLICY "Project members can view colour reactions" ON colour_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_colours pc
      JOIN project_users pu ON pu.project_id = pc.conversation_id
      WHERE pc.id = colour_reactions.colour_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can add colour reactions" ON colour_reactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_colours pc
      JOIN project_users pu ON pu.project_id = pc.conversation_id
      WHERE pc.id = colour_reactions.colour_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own colour reactions" ON colour_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Colour comments policies
CREATE POLICY "Project members can view colour comments" ON colour_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_colours pc
      JOIN project_users pu ON pu.project_id = pc.conversation_id
      WHERE pc.id = colour_comments.colour_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can add colour comments" ON colour_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_colours pc
      JOIN project_users pu ON pu.project_id = pc.conversation_id
      WHERE pc.id = colour_comments.colour_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own colour comments" ON colour_comments
  FOR DELETE USING (user_id = auth.uid());
