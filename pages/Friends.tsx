
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GlassCard, GlassInput, NeonButton } from '../components/UI';
import { Search, Users, RefreshCw, Globe, UserPlus, Zap } from 'lucide-react';
import { Profile, FriendRequest, Friend } from '../types';

export const FriendsPage = () => {
  const [globalUsers, setGlobalUsers] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sentLinks, setSentLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        fetchData(data.user.id);
      }
    };
    init();
  }, []);

  const fetchData = async (uid: string) => {
    setLoading(true);
    // 1. Fetch everyone (scalable discovery)
    const { data: all } = await supabase.from('profiles').select('*').neq('id', uid).limit(50);
    if (all) setGlobalUsers(all as Profile[]);

    // 2. Fetch current friends
    const { data: f } = await supabase.from('friends').select('friend_id, friend:profiles!friends_friend_id_fkey(*)').eq('user_id', uid);
    if (f) setFriends(f as unknown as Friend[]);
    setLoading(false);
  };

  const createLink = async (targetId: string) => {
    // Instant two-way link for rapid testing
    await supabase.from('friends').upsert([
      { user_id: userId, friend_id: targetId },
      { user_id: targetId, friend_id: userId }
    ]);
    setSentLinks(prev => new Set(prev).add(targetId));
    fetchData(userId);
  };

  return (
    <div className="h-full p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter">Global <span className="text-neon-blue">Discovery</span></h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Found {globalUsers.length} available nodes</p>
        </div>
        <button onClick={() => fetchData(userId)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:text-neon-blue transition-all">
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {globalUsers.map(user => {
          const isFriend = friends.some(f => f.friend_id === user.id);
          return (
            <GlassCard key={user.id} className="group border-white/5 hover:border-neon-blue/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <img src={user.avatar_url} className="w-14 h-14 rounded-full border border-white/10 bg-black" alt="av" />
                <div className="flex-1 truncate">
                  <h3 className="font-bold text-white text-lg truncate">{user.username}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
                    <span className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Active Node</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-6 h-8 italic">"{user.bio || 'Scanning for connection...'}"</p>
              
              {isFriend ? (
                <div className="w-full py-2 bg-neon-blue/10 border border-neon-blue/30 rounded-xl text-neon-blue text-center text-[10px] font-black uppercase tracking-widest">
                  Signal Established
                </div>
              ) : (
                <NeonButton 
                  onClick={() => createLink(user.id)}
                  disabled={sentLinks.has(user.id)}
                  className="w-full h-10 text-[10px] uppercase tracking-[0.2em]"
                >
                  <UserPlus className="w-4 h-4" /> Connect Signal
                </NeonButton>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
