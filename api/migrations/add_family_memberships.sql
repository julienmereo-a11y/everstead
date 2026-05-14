CREATE TABLE IF NOT EXISTS family_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid REFERENCES auth.users(id) NOT NULL,
  secondary_user_id uuid REFERENCES auth.users(id),
  secondary_email text NOT NULL,
  invite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  invite_status text DEFAULT 'pending',
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES family_memberships(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_role text;

-- RLS
ALTER TABLE family_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "primary user manages own row" ON family_memberships
  FOR ALL USING (auth.uid() = primary_user_id);
CREATE POLICY "secondary user can read their row" ON family_memberships
  FOR SELECT USING (auth.uid() = secondary_user_id);
