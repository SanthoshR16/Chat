
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edalovfqbhmhvtpzjwpm.supabase.co';
const supabaseAnonKey = ((typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 'sb_publishable_iq_94pt4S3IKRjDYk9-dHA_zwVA9Oq2').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * --- CRITICAL: MULTI-USER SCALABILITY UPDATE ---
 * Run this SQL to support Global Chat and more than 4 users:
 * 
 * -- 1. Allow 'receiver_id' to be null for Global messages
 * ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;
 * 
 * -- 2. Add is_toxic if not exists
 * ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_toxic BOOLEAN DEFAULT false;
 * 
 * -- 3. Update Policy for Global Messages
 * CREATE POLICY "Anyone can view global messages" ON messages 
 * FOR SELECT USING (receiver_id IS NULL OR auth.uid() = sender_id OR auth.uid() = receiver_id);
 * 
 * CREATE POLICY "Anyone can send global messages" ON messages 
 * FOR INSERT WITH CHECK (auth.uid() = sender_id);
 * 
 * -- 4. Ensure real-time is on for messages
 * ALTER PUBLICATION supabase_realtime ADD TABLE messages;
 */
