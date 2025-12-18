
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GlassCard, GlassInput, NeonButton, Badge } from '../components/UI';
import { UserPlus, Check, X, Search, Users, User, AlertTriangle, RefreshCw, Globe } from 'lucide-react';
import { Profile, FriendRequest, Friend } from '../types';

export const FriendsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [globalUsers, setGlobalUsers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        loadData(data.user.id);
      }
    };
    init();
  }, []);

  const loadData = async (uid: string) => {
    setIsRefreshing(true);
    await Promise.all([fetchRequests(uid), fetchFriends(uid), fetchGlobalUsers()]);
    setIsRefreshing(false);
  };

  const fetchGlobalUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .limit(20);
    if (data) setGlobalUsers(data as Profile[]);
  };

  const fetchRequests = async (uid: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('*, sender:profiles!friend_requests_sender_id_fkey(*)')
      .eq('receiver_id', uid)
      .eq('status', 'pending');
    if (data) setRequests(data as FriendRequest[]);
  };

  const fetchFriends = async (uid: string) => {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, friend:profiles!friends_friend_id_fkey(*)')
      .eq('user_id', uid);
    if (data) setFriends(data as unknown as Friend[]);
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchTerm}%`)
      .neq('id', userId)
      .limit(10);
    if (data) setSearchResults(data as Profile[]);
  };

  const sendRequest = async (receiverId: string) => {
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: userId,
      receiver_id: receiverId,
      status: 'pending'
    });
    if (!error) setSentRequests(prev => new Set(prev).add(receiverId));
  };

  const handleAction = async (req: FriendRequest, action: 'accepted' | 'rejected') => {
    setProcessingRequests(prev => new Set(prev).add(req.id));
    await supabase.from('friend_requests').update({ status: action }).eq('id', req.id);
    
    if (action === 'accepted') {
      await supabase.from('friends').insert([
        { user_id: userId, friend_id: req.sender_id },
        { user_id: req.sender_id, friend_id: userId }
      ]);
      fetchFriends(userId);
    }
    fetchRequests(userId);
    setProcessingRequests(prev => {
      const n = new Set(prev);
      n.delete(req.id);
      return n;
    });
  };

  return (
    <div className="h-full p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tighter uppercase">Network <span className="text-neon-blue">Manager</span></h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Establish and Manage Neural Links</p>
        </div>
        <button 
          onClick={() => loadData(userId)}
          className={`p-3 rounded-xl bg-white/5 border border-white/10 text-neon-blue transition-all ${isRefreshing ? 'animate-spin' : 'hover:scale-110'}`}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Discovery & Requests */}
        <div className="lg:col-span-1 space-y-8">
          <GlassCard className="border-white/5 shadow-2xl">
            <h2 className="text-xs font-display font-bold mb-6 flex items-center gap-2 uppercase tracking-[0.3em]">
              <Search className="w-4 h-4 text-neon-purple" /> Find Signals
            </h2>
            <div className="flex gap-2 mb-6">
              <GlassInput 
                placeholder="Agent codename..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <NeonButton onClick={handleSearch} className="px-4"><Search className="w-4 h-4" /></NeonButton>
            </div>
            
            <div className="space-y-2">
              {(searchTerm ? searchResults : globalUsers).map(user => (
                <div key={user.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-transparent hover:border-neon-purple/20 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar_url} className="w-9 h-9 rounded-full border border-white/10" alt="av" />
                    <span className="text-sm font-bold truncate max-w-[100px]">{user.username}</span>
                  </div>
                  <button 
                    onClick={() => sendRequest(user.id)}
                    disabled={sentRequests.has(user.id)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      sentRequests.has(user.id) ? 'bg-green-500/20 text-green-400' : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple hover:text-white'
                    }`}
                  >
                    {sentRequests.has(user.id) ? 'Linked' : 'Link'}
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="border-white/5 shadow-2xl">
            <h2 className="text-xs font-display font-bold mb-6 flex items-center gap-2 uppercase tracking-[0.3em]">
              <div className={`w-2 h-2 rounded-full ${requests.length > 0 ? 'bg-neon-pink animate-pulse' : 'bg-gray-600'}`} />
              Incoming Signals
              {requests.length > 0 && <Badge color="bg-neon-pink ml-2">{requests.length}</Badge>}
            </h2>
            {requests.length === 0 ? (
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center py-4">No pending signals</p>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <img src={req.sender?.avatar_url} className="w-10 h-10 rounded-full border border-white/5" alt="av" />
                      <div className="truncate max-w-[80px]">
                        <div className="text-xs font-bold truncate">{req.sender?.username}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req, 'accepted')} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/40 border border-green-500/20"><Check className="w-4 h-4" /></button>
                      <button onClick={() => handleAction(req, 'rejected')} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 border border-red-500/20"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: Network Grid */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xs font-display font-bold flex items-center gap-2 uppercase tracking-[0.3em]">
                <Users className="w-4 h-4 text-neon-blue" /> Neural Network Grid
              </h2>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{friends.length} Agents Connected</span>
            </div>
            
            {friends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-700 min-h-[300px]">
                <Globe className="w-16 h-16 mb-4 opacity-10 animate-pulse" />
                <p className="font-display uppercase text-[10px] tracking-widest">Awaiting Connections</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {friends.map(f => (
                  <div key={f.friend.id} className="p-5 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/5 hover:border-neon-blue/40 transition-all flex items-center gap-5 group shadow-xl">
                    <div className="relative">
                      <img src={f.friend.avatar_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/5" alt={f.friend.username} />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-4 border-[#0a0a16]" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-white group-hover:text-neon-blue transition-colors truncate">{f.friend.username}</h3>
                      <p className="text-[10px] text-gray-500 truncate mt-1 uppercase tracking-widest font-bold">Signal Active</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
