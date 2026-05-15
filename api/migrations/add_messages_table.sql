CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_name text NOT NULL,
  recipient_role text,
  title text NOT NULL,
  type text DEFAULT 'note' CHECK (type IN ('note', 'video')),
  content text,
  video_url text,
  released boolean DEFAULT false,
  released_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own messages" ON messages FOR ALL USING (auth.uid() = user_id);
