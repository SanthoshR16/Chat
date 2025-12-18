
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://edalovfqbhmhvtpzjwpm.supabase.co';
const supabaseAnonKey = ((typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || 'sb_publishable_iq_94pt4S3IKRjDYk9-dHA_zwVA9Oq2').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * --- CRITICAL: FIX PGRST204 ERROR ---
 * Run this specific SQL in your Supabase SQL Editor:
 * 
 * ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_toxic BOOLEAN DEFAULT false;
 * 
 * --- FULL SCHEMA SETUP ---
 * 
 * create table if not exists profiles (
 *   id uuid references auth.users not null primary key,
 *   username text unique,
 *   avatar_url text,
 *   bio text,
 *   updated_at timestamp with time zone default now()
 * );
 * 
 * create table if not exists friend_requests (
 *   id uuid default uuid_generate_v4() primary key,
 *   sender_id uuid references profiles(id),
 *   receiver_id uuid references profiles(id),
 *   status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
 *   created_at timestamp with time zone default now()
 * );
 * 
 * create table if not exists friends (
 *   user_id uuid references profiles(id),
 *   friend_id uuid references profiles(id),
 *   created_at timestamp with time zone default now(),
 *   primary key (user_id, friend_id)
 * );
 * 
 * create table if not exists messages (
 *   id uuid default uuid_generate_v4() primary key,
 *   sender_id uuid references profiles(id),
 *   receiver_id uuid references profiles(id),
 *   content text,
 *   is_toxic boolean default false,
 *   created_at timestamp with time zone default now()
 * );
 * 
 * -- ENABLE RLS --
 * alter table profiles enable row level security;
 * alter table friend_requests enable row level security;
 * alter table friends enable row level security;
 * alter table messages enable row level security;
 * 
 * -- POLICIES --
 * create policy "Public profiles are viewable by everyone" on profiles for select using (true);
 * create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
 * create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
 * 
 * create policy "View own messages" on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
 * create policy "Send messages" on messages for insert with check (auth.uid() = sender_id);
 * 
 * create policy "View own friends" on friends for select using (auth.uid() = user_id);
 * create policy "Manage friends" on friends for insert with check (auth.uid() = user_id);
 * 
 * -- REALTIME --
 * alter publication supabase_realtime add table messages, profiles, friends, friend_requests;
 */
