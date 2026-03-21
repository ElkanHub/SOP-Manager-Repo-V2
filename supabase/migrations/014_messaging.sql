-- Migration 014: Messaging

-- 1. Create conversations table
CREATE TABLE conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('direct', 'group')),
    name text,
    created_by uuid NOT NULL REFERENCES profiles(id),
    last_message_at timestamptz,
    last_message_body text,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Create conversation_members table
CREATE TABLE conversation_members (
    conversation_id uuid NOT NULL REFERENCES conversations(id),
    user_id uuid NOT NULL REFERENCES profiles(id),
    last_read_at timestamptz DEFAULT now(),
    notify_setting text NOT NULL DEFAULT 'all' CHECK (notify_setting IN ('all', 'mentions_only', 'muted')),
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Create messages table
CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id),
    sender_id uuid NOT NULL REFERENCES profiles(id),
    body text NOT NULL,
    body_search tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED,
    mentions uuid[] NOT NULL DEFAULT '{}',
    reference_type text CHECK (reference_type IN ('sop', 'equipment', 'change_control')),
    reference_id uuid,
    reply_to_id uuid REFERENCES messages(id),
    is_edited boolean NOT NULL DEFAULT false,
    edited_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 4. Create Indexes
CREATE INDEX messages_body_search_idx ON messages USING GIN(body_search);
CREATE INDEX messages_conversation_created_idx ON messages(conversation_id, created_at DESC);

-- 5. Create update_conversation_last_message trigger
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      last_message_body = LEFT(NEW.body, 60)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 6. Create notify_message_pulse trigger
CREATE OR REPLACE FUNCTION notify_message_pulse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  member RECORD;
BEGIN
  FOR member IN
    SELECT cm.user_id, cm.notify_setting, c.type AS conv_type
    FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.sender_id
  LOOP
    IF member.conv_type = 'direct'
      OR member.notify_setting = 'all'
      OR (member.notify_setting = 'mentions_only' AND member.user_id = ANY(NEW.mentions))
    THEN
      INSERT INTO pulse_items (
        recipient_id, sender_id, type, title, body,
        entity_type, entity_id, audience
      ) VALUES (
        member.user_id, NEW.sender_id, 'message',
        (SELECT full_name FROM profiles WHERE id = NEW.sender_id),
        LEFT(NEW.body, 80),
        'conversation', NEW.conversation_id, 'self'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_message_pulse
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_message_pulse();

-- 7. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- conversations SELECT
CREATE POLICY "members can view their conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = id AND user_id = auth.uid()
  )
  AND is_active_user(auth.uid())
);

-- conversation_members SELECT
CREATE POLICY "members can view conversation_members"
ON conversation_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_members AS cm
    WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()
  )
  AND is_active_user(auth.uid())
);

-- messages SELECT  
CREATE POLICY "members can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
  AND is_active_user(auth.uid())
);

-- profiles SELECT for messaging search
CREATE POLICY "active users can search profiles for messaging"
ON profiles FOR SELECT
USING (is_active_user(auth.uid()) AND is_active = true);
