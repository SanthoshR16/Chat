
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Hash, Globe, ShieldAlert, Loader2, Zap, Image as ImageIcon, X, User, MessageCircle } from 'lucide-react';
import { Message, Profile, ToxicityLabel } from '../types';
import { analyzeToxicity } from '../lib/gemini';
import { ProfileViewModal, Badge } from '../components/UI';

const TOXIC_MARKER = "[[TOXIC_FLAG]]";

export const ChatPage = () => {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [chatMode, setChatMode] = useState<'global' | 'private'>('global');
  const [activeFriend, setActiveFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setCurrentUser(data.user);
      fetchFriends(data.user.id);
      fetchAllProfiles(); // Load metadata for global chat

      const presenceChannel = supabase.channel('global_presence', {
        config: { presence: { key: data.user.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineIds = new Set<string>();
          for (const id in state) onlineIds.add(id);
          setOnlineUsers(onlineIds);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ online_at: new Date().toISOString() });
          }
        });

      return () => { supabase.removeChannel(presenceChannel); };
    };
    init();
  }, []);

  const fetchFriends = async (userId: string) => {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, friend:profiles!friends_friend_id_fkey(*)')
      .eq('user_id', userId);
    const realFriends = data ? (data as any[]).map(f => f.friend).filter(f => f) : [];
    setFriends(realFriends);
  };

  const fetchAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      const map: Record<string, Profile> = {};
      data.forEach(p => map[p.id] = p);
      setProfilesMap(map);
    }
  };

  // Switch chat stream based on mode
  useEffect(() => {
    if (!currentUser) return;
    setMessages([]);

    const loadMessages = async () => {
      let query = supabase.from('messages').select('*');
      if (chatMode === 'global') {
        query = query.is('receiver_id', null);
      } else if (activeFriend) {
        query = query.or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${currentUser.id})`);
      } else {
        return;
      }
      const { data } = await query.order('created_at', { ascending: true }).limit(50);
      if (data) setMessages(data as Message[]);
    };

    loadMessages();

    const channel = supabase.channel(`chat_stream_${chatMode}_${activeFriend?.id || 'all'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        const isGlobalMatch = chatMode === 'global' && !newMsg.receiver_id;
        const isPrivateMatch = chatMode === 'private' && activeFriend && 
          ((newMsg.sender_id === activeFriend.id && newMsg.receiver_id === currentUser.id) ||
           (newMsg.sender_id === currentUser.id && newMsg.receiver_id === activeFriend.id));

        if (isGlobalMatch || isPrivateMatch) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatMode, activeFriend, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processSendMessage = async () => {
    if ((!newMessage.trim() && !pendingImage) || !currentUser || isSending) return;
    if (chatMode === 'private' && !activeFriend) return;

    setIsSending(true);
    const text = newMessage.trim();
    const image = pendingImage;
    setNewMessage('');
    setPendingImage(null);

    try {
      const analysis = await analyzeToxicity(text);
      const isToxic = analysis.label !== ToxicityLabel.SAFE;
      const finalContent = isToxic ? `${TOXIC_MARKER}${text}` : (image ? `[IMAGE]${image}` : text);

      await supabase.from('messages').insert({
        content: finalContent,
        sender_id: currentUser.id,
        receiver_id: chatMode === 'global' ? null : activeFriend?.id,
        is_toxic: isToxic
      });
    } catch (e) {
      console.error(e);
      alert("Neural transmission failed.");
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender_id === currentUser?.id;
    const sender = profilesMap[msg.sender_id];
    const isToxic = msg.is_toxic || msg.content.includes(TOXIC_MARKER);

    return (
      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-6 animate-message-in`}>
        {!isMe && chatMode === 'global' && (
          <span className="text-[10px] font-bold text-neon-blue mb-1 uppercase tracking-widest flex items-center gap-1">
            <User className="w-3 h-3" /> {sender?.username || 'Unknown Agent'}
          </span>
        )}
        <div className={`px-5 py-3 rounded-2xl max-w-[85%] md:max-w-[70%] ${
          isMe ? 'bg-neon-purple text-white rounded-tr-none' : 'bg-slate-800 text-gray-100 rounded-tl-none border border-white/5'
        }`}>
          {isToxic ? (
            <div className="flex items-center gap-2 text-red-400 italic">
              <ShieldAlert className="w-4 h-4" /> <span className="blur-sm select-none text-xs">FILTERED TRANSMISSION</span>
            </div>
          ) : msg.content.startsWith('[IMAGE]') ? (
            <img src={msg.content.replace('[IMAGE]', '')} className="rounded-lg max-h-64 cursor-pointer" alt="img" />
          ) : (
            <p className="text-sm md:text-base">{msg.content}</p>
          )}
        </div>
        <span className="text-[8px] text-gray-600 mt-1 uppercase font-bold tracking-tighter">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#050510]">
      {/* Sidebar: Mode & Contact Toggle */}
      <div className="w-full lg:w-80 glass-panel border-r border-white/5 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-white/5 space-y-4">
          <button 
            onClick={() => { setChatMode('global'); setActiveFriend(null); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${chatMode === 'global' ? 'bg-neon-blue/10 border-neon-blue text-white' : 'border-transparent text-gray-500 hover:bg-white/5'}`}
          >
            <Globe className="w-5 h-5" />
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-widest">Global Grid</div>
              <div className="text-[9px] opacity-60 uppercase">{onlineUsers.size} Nodes Active</div>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="px-4 py-2 text-[9px] font-black text-gray-600 tracking-[0.4em] uppercase">Private Signals</div>
          {friends.map(f => (
            <button 
              key={f.id} 
              onClick={() => { setChatMode('private'); setActiveFriend(f); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${activeFriend?.id === f.id ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}
            >
              <div className="relative">
                <img src={f.avatar_url} className="w-10 h-10 rounded-full bg-black border border-white/10" alt="av" />
                {onlineUsers.has(f.id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#050510]" />}
              </div>
              <div className="text-left truncate">
                <div className="text-sm font-bold text-white truncate">{f.username}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">Link Active</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="glass-panel p-4 md:p-6 flex justify-between items-center border-b border-white/5 z-10">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl ${chatMode === 'global' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
              {chatMode === 'global' ? <Globe /> : <MessageCircle />}
            </div>
            <div>
              <h3 className="font-bold text-white uppercase tracking-widest">{chatMode === 'global' ? 'Global Neural Grid' : activeFriend?.username}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                {chatMode === 'global' ? 'Public Multi-User Broadcast' : 'Point-to-Point Encryption'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 lg:hidden">
             <button onClick={() => setChatMode('global')} className="p-2 text-neon-blue"><Globe className="w-6 h-6" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto">
             <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processSendMessage(); } }}
                    placeholder={chatMode === 'global' ? "Broadcast to Grid..." : `Signal ${activeFriend?.username}...`}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-neon-blue transition-all resize-none max-h-32"
                    rows={1}
                  />
                </div>
                <button
                  onClick={processSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shrink-0"
                >
                  {isSending ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6 text-white" />}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
