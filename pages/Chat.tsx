
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Hash, MoreVertical, ShieldAlert, Loader2, Zap, Image as ImageIcon, X } from 'lucide-react';
import { Message, Profile, ToxicityLabel } from '../types';
import { analyzeToxicity } from '../lib/gemini';
import { ProfileViewModal } from '../components/UI';

const TOXIC_MARKER = "[[TOXIC_FLAG]]";

const formatRelativeTime = (dateString: string, now: number): string => {
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);
  if (diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatPage = () => {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [activeFriend, setActiveFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setCurrentUser(data.user);
      fetchFriends(data.user.id);

      const presenceChannel = supabase.channel('global_presence', {
        config: { presence: { key: data.user.id } }
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineIds = new Set<string>();
          for (const id in state) {
            onlineIds.add(id);
          }
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
    
    const realFriends = data ? (data as any[]).map(f => f.friend).filter(f => f && !f.is_bot) : [];
    setFriends(realFriends);
  };

  useEffect(() => {
    if (!activeFriend || !currentUser) return;
    setMessages([]);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    const channelName = `private_chat_${[currentUser.id, activeFriend.id].sort().join('_')}`;
    const channel = supabase.channel(channelName);

    channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        const isTarget = (newMsg.sender_id === activeFriend.id && newMsg.receiver_id === currentUser.id) ||
                         (newMsg.sender_id === currentUser.id && newMsg.receiver_id === activeFriend.id);
        
        if (isTarget) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeFriend, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPendingImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processSendMessage = async () => {
    if ((!newMessage.trim() && !pendingImage) || !currentUser || !activeFriend || isSending) return;
    
    setIsSending(true);
    const textContent = newMessage.trim();
    const imageContent = pendingImage;
    
    setNewMessage('');
    setPendingImage(null);

    // Initial check for toxic content
    if (!imageContent) {
      const analysis = await analyzeToxicity(textContent);
      if (analysis.label === ToxicityLabel.HIGHLY_TOXIC) {
        alert("Transmission Blocked: Highly toxic content detected by neural shield.");
        setIsSending(false);
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
        id: tempId,
        content: imageContent ? `[IMAGE]${imageContent}` : textContent,
        sender_id: currentUser.id,
        receiver_id: activeFriend.id,
        created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      let isToxic = false;
      let finalContent = optimisticMsg.content;

      if (!imageContent) {
        const analysis = await analyzeToxicity(textContent);
        if (analysis.label !== ToxicityLabel.SAFE) {
          isToxic = true;
          // We mask slightly toxic messages
          finalContent = `${TOXIC_MARKER}${textContent}`;
        }
      }

      // Try inserting with is_toxic column. 
      // If it fails with PGRST204, we catch and try without it (fallback).
      const { data, error } = await supabase.from('messages').insert({
        content: finalContent,
        sender_id: currentUser.id,
        receiver_id: activeFriend.id,
        is_toxic: isToxic
      }).select().single();
      
      if (error) {
        if (error.code === 'PGRST204') {
          // Fallback if column is missing
          const { data: retryData, error: retryError } = await supabase.from('messages').insert({
            content: finalContent,
            sender_id: currentUser.id,
            receiver_id: activeFriend.id
          }).select().single();
          if (retryError) throw retryError;
          setMessages(prev => prev.map(m => m.id === tempId ? retryData : m));
        } else {
          throw error;
        }
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Neural sync error. Verify database schema.");
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageContent = (content: any, isToxic: boolean | undefined) => {
    // FIX [object Object]: Ensure we are dealing with a string
    const safeContent = typeof content === 'string' ? content : (content && typeof content === 'object' ? JSON.stringify(content) : String(content || ""));

    if (isToxic || safeContent.includes(TOXIC_MARKER)) {
        return (
            <div className="flex items-center gap-2 text-red-300 italic py-1">
                <ShieldAlert className="w-4 h-4" />
                <span className="blur-[3px] select-none text-[10px] uppercase font-bold tracking-widest">CONTENT FILTERED</span>
            </div>
        );
    }
    if (safeContent.startsWith('[IMAGE]')) {
      return (
        <img 
          src={safeContent.replace('[IMAGE]', '')} 
          className="max-w-full rounded-xl max-h-80 object-cover border border-white/10 shadow-lg cursor-pointer hover:opacity-90 transition-all" 
          alt="Transmission" 
          onClick={() => window.open(safeContent.replace('[IMAGE]', ''), '_blank')}
        />
      );
    }
    return <p className="text-[15px] md:text-base leading-relaxed whitespace-pre-wrap">{safeContent}</p>;
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#050510]">
      <div className={`w-full lg:w-80 glass-panel border-r border-white/5 flex flex-col ${activeFriend ? 'hidden lg:flex' : 'flex'} backdrop-blur-3xl`}>
        <div className="p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-display font-bold text-white tracking-widest flex items-center gap-2 uppercase">
            <Hash className="w-5 h-5 text-neon-blue" /> Signals
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {friends.length === 0 ? (
            <div className="text-center py-20 text-gray-600 text-[10px] font-display tracking-[0.4em] uppercase">No neural links</div>
          ) : friends.map(friend => (
            <button 
              key={friend.id} 
              onClick={() => setActiveFriend(friend)} 
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${activeFriend?.id === friend.id ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 border-transparent'}`}
            >
               <div className="relative shrink-0">
                 <img src={friend.avatar_url} className="w-12 h-12 rounded-full border border-white/10 bg-black" alt="av" />
                 {onlineUsers.has(friend.id) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050510] shadow-[0_0_8px_#22c55e]" />}
               </div>
               <div className="text-left flex-1 truncate">
                 <div className="font-bold text-base text-white truncate">{friend.username}</div>
                 <div className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Link Active</div>
               </div>
            </button>
          ))}
        </div>
      </div>

      {activeFriend ? (
        <div className="flex-1 flex flex-col relative bg-black/10">
          <div className="glass-panel p-4 md:p-6 flex justify-between items-center border-b border-white/5 z-10 backdrop-blur-3xl">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveFriend(null)} className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <Zap className="w-6 h-6" />
              </button>
              <div className="cursor-pointer flex items-center gap-4" onClick={() => setViewProfile(activeFriend)}>
                <img src={activeFriend.avatar_url} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10" alt="av" />
                <div>
                  <h3 className="font-bold text-white text-base md:text-lg tracking-tight">{activeFriend.username}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(activeFriend.id) ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-600'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {onlineUsers.has(activeFriend.id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <MoreVertical className="text-gray-500 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-message-in`}>
                     <div className={`px-5 py-3 rounded-2xl max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${
                        isMe 
                          ? 'bg-neon-purple text-white rounded-tr-none shadow-[0_8px_20px_rgba(176,38,255,0.1)]' 
                          : 'bg-slate-800/80 text-gray-100 rounded-tl-none border border-white/5 shadow-xl backdrop-blur-sm'
                     }`}>
                        {renderMessageContent(msg.content, msg.is_toxic)}
                     </div>
                     <span className="text-[9px] text-gray-500 mt-1.5 uppercase font-bold tracking-tighter">{formatRelativeTime(msg.created_at, now)}</span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-10 bg-gradient-to-t from-[#050510] to-transparent">
            <div className="max-w-4xl mx-auto flex flex-col gap-3">
              {pendingImage && (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-neon-blue/50 mb-2 group shadow-2xl">
                   <img src={pendingImage} className="w-full h-full object-cover" alt="Pending" />
                   <button onClick={() => setPendingImage(null)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors">
                     <X className="w-3 h-3" />
                   </button>
                </div>
              )}
              
              <div className="flex gap-4 items-end">
                <label className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-lg">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                  <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
                </label>

                <div className="flex-1 relative">
                  <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processSendMessage(); } }}
                      placeholder={pendingImage ? "Describe image..." : "Transmit signal..."}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-4 md:p-5 text-white focus:outline-none focus:border-neon-blue transition-all resize-none max-h-32 shadow-2xl backdrop-blur-md"
                      rows={1}
                  />
                </div>
                
                <button
                  onClick={processSendMessage}
                  disabled={(!newMessage.trim() && !pendingImage) || isSending}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0 shadow-lg shadow-neon-blue/20 transition-all"
                >
                  {isSending ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Send className="w-6 h-6 text-white ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-gray-700 bg-black/5">
           <Zap className="w-20 h-20 opacity-5 mb-4 animate-pulse" />
           <p className="font-display uppercase text-xs tracking-[1em] font-bold text-gray-600">Standby</p>
        </div>
      )}
      {viewProfile && <ProfileViewModal user={viewProfile} isOnline={onlineUsers.has(viewProfile.id)} onClose={() => setViewProfile(null)} />}
    </div>
  );
};
