
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Hash, MoreVertical, ShieldAlert, Bot, Image as ImageIcon, Loader2, Sparkles, Zap, Clock, Link2 } from 'lucide-react';
import { Message, Profile, Friend, ToxicityLabel } from '../types';
import { analyzeToxicity, getGeminiChat, checkApiKey } from '../lib/gemini';
import { Chat as GeminiChatType } from '@google/genai';
import { ProfileViewModal, NeonButton } from '../components/UI';

const AI_BOT_PROFILE: Profile = {
  id: 'ai-bot-giggle-2025',
  username: 'Giggle AI',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GiggleAI&backgroundColor=b026ff',
  bio: 'Always online. Always helpful. 🤖',
  is_bot: true
};

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
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [isAiLinked, setIsAiLinked] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiSessionRef = useRef<GeminiChatType | null>(null);
  const realtimeChannelRef = useRef<any>(null);

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

      const presenceChannel = supabase.channel('global_presence');
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineIds = new Set<string>();
          for (const id in state) {
            // @ts-ignore
            const userId = state[id][0]?.user_id;
            if (userId) onlineIds.add(userId);
          }
          setOnlineUsers(onlineIds);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: data.user.id });
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
    setFriends([AI_BOT_PROFILE, ...realFriends]);
  };

  useEffect(() => {
    if (!activeFriend || !currentUser) return;
    setMessages([]);
    setFriendIsTyping(false);

    if (activeFriend.is_bot) {
      const initAi = async () => {
        if (typeof window.aistudio !== 'undefined') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (hasKey) {
            aiSessionRef.current = getGeminiChat();
            setIsAiLinked(true);
            setMessages([{
              id: 'intro-ai',
              sender_id: activeFriend.id,
              receiver_id: currentUser.id,
              content: "Neural link established. How can I assist you today? 🤖",
              created_at: new Date().toISOString()
            }]);
          } else {
            setIsAiLinked(false);
          }
        }
      };
      initAi();
      return; 
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetchMessages();

    const channelName = `room_${[currentUser.id, activeFriend.id].sort().join('_')}`;
    const channel = supabase.channel(channelName);
    realtimeChannelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === currentUser.id) return;
        if ((newMsg.sender_id === activeFriend.id && newMsg.receiver_id === currentUser.id) || 
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === activeFriend.id)) {
            setMessages((prev) => {
                const exists = prev.some(m => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
            });
            setFriendIsTyping(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeFriend, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, friendIsTyping]);

  const establishAiLink = async () => {
    await checkApiKey();
    // MANDATORY: Immediately assume success to avoid race conditions with hasSelectedApiKey()
    setIsAiLinked(true);
    aiSessionRef.current = getGeminiChat();
    setMessages([{
      id: 'intro-ai',
      sender_id: AI_BOT_PROFILE.id,
      receiver_id: currentUser.id,
      content: "Neural link established. Accessing 2025 core protocols. 🤖",
      created_at: new Date().toISOString()
    }]);
  };

  const processSendMessage = async (content: string, isImage = false) => {
    if ((!content.trim() && !isImage) || !currentUser || !activeFriend || isSending) return;
    
    setIsSending(true);
    const textToProcess = content;
    setNewMessage(''); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
        id: tempId,
        content: textToProcess,
        sender_id: currentUser.id,
        receiver_id: activeFriend.id,
        created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      let isToxic = false;
      if (!isImage) {
          const analysis = await analyzeToxicity(textToProcess);
          // Only show safe results. Any toxicity score > thresholds defined in gemini.ts will trigger replacement.
          if (analysis.label !== ToxicityLabel.SAFE) isToxic = true;
      }

      const finalContent = isToxic ? `${TOXIC_MARKER}${textToProcess}` : (isImage ? `[IMAGE]${textToProcess}` : textToProcess);
      
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: finalContent, is_toxic: isToxic } : m));

      if (activeFriend.is_bot) {
          if (!isToxic) {
              // Ensure we have a session (fresh key check)
              if (!aiSessionRef.current) aiSessionRef.current = getGeminiChat();
              
              setFriendIsTyping(true);
              const result = await aiSessionRef.current.sendMessage({ message: textToProcess });
              setMessages(prev => [...prev, {
                  id: `ai-${Date.now()}`,
                  content: result.text || "...",
                  sender_id: activeFriend.id,
                  receiver_id: currentUser.id,
                  created_at: new Date().toISOString()
              }]);
              setFriendIsTyping(false);
          } else if (!isAiLinked) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Neural link required to speak with AI Bot.");
          }
          setIsSending(false);
          return;
      }

      const payload: any = {
        content: finalContent,
        sender_id: currentUser.id,
        receiver_id: activeFriend.id,
        is_toxic: isToxic
      };

      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      
      if (error) {
          const { error: fallbackError } = await supabase.from('messages').insert({
              content: finalContent,
              sender_id: currentUser.id,
              receiver_id: activeFriend.id
          });
          if (fallbackError) throw fallbackError;
      } else if (data) {
          setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (e: any) {
      console.error("Critical Messaging Error:", e);
      if (e.message?.includes("Requested entity was not found")) {
        setIsAiLinked(false);
        alert("API Key expired or restricted. Please re-authenticate.");
      }
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageContent = (content: string, isToxic: boolean | undefined) => {
    if (isToxic || content.includes(TOXIC_MARKER)) {
        return (
            <div className="flex items-center gap-2 text-red-300 italic">
                <ShieldAlert className="w-4 h-4" />
                <span className="blur-[4px] select-none text-[10px] uppercase font-bold tracking-widest">SIGNAL REFRESHED BY SECURITY</span>
            </div>
        );
    }
    if (content.startsWith('[IMAGE]')) {
        return <img src={content.replace('[IMAGE]', '')} className="max-w-full rounded-lg max-h-64 object-cover border border-white/10 shadow-lg" alt="Shared" />;
    }
    return <p className="text-[15px] md:text-base leading-relaxed whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#050510]">
      {/* Sidebar - Friend List */}
      <div className={`w-full lg:w-80 glass-panel border-r border-white/5 flex flex-col ${activeFriend ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-display font-bold text-white tracking-wide flex items-center gap-3">
            <Hash className="w-5 h-5 text-neon-blue" /> Signals
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {friends.map(friend => (
            <button 
              key={friend.id} 
              onClick={() => setActiveFriend(friend)} 
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${activeFriend?.id === friend.id ? 'bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'hover:bg-white/5 border-transparent'} border`}
            >
               <div className="relative">
                 <img src={friend.avatar_url} className="w-12 h-12 rounded-full border border-white/10" alt="av" />
                 {(onlineUsers.has(friend.id) || friend.is_bot) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050510]" />}
               </div>
               <div className="text-left flex-1 truncate">
                 <div className="font-bold text-base text-white truncate">{friend.username}</div>
                 <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{friend.is_bot ? 'AI Neural Core' : 'Direct Uplink'}</div>
               </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeFriend ? (
        <div className="flex-1 flex flex-col relative bg-black/10">
          {/* Header */}
          <div className="glass-panel p-4 md:p-6 flex justify-between items-center border-b border-white/5 z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveFriend(null)} className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
                <Zap className="w-6 h-6" />
              </button>
              <div className="relative cursor-pointer" onClick={() => setViewProfile(activeFriend)}>
                <img src={activeFriend.avatar_url} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10" alt="av" />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#050510] ${onlineUsers.has(activeFriend.id) || activeFriend.is_bot ? 'bg-green-500' : 'bg-gray-600'}`} />
              </div>
              <div className="cursor-pointer" onClick={() => setViewProfile(activeFriend)}>
                <h3 className="font-bold text-white text-base md:text-lg leading-none mb-1">{activeFriend.username}</h3>
                <span className="text-[10px] text-neon-blue uppercase tracking-[0.2em] flex items-center gap-1 font-bold animate-pulse">
                   {activeFriend.is_bot && !isAiLinked ? 'LINK REQUIRED' : 'SECURE LINK'}
                </span>
              </div>
            </div>
            <MoreVertical className="text-gray-500 cursor-pointer hover:text-white" />
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
            {activeFriend.is_bot && !isAiLinked ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
                <Link2 className="w-16 h-16 text-neon-purple mb-4 animate-pulse" />
                <h3 className="text-xl font-display font-bold text-white mb-2">Establishing Neural Connection...</h3>
                <p className="text-gray-400 text-sm mb-8 uppercase tracking-widest leading-loose">The Giggle AI requires an authorized Gemini API Key to operate outside the Studio Grid.</p>
                <NeonButton onClick={establishAiLink} glow>Connect Neural Key</NeonButton>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-message-in`}>
                       <div className={`px-5 py-4 rounded-3xl max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${
                         isMe 
                          ? 'bg-neon-purple text-white rounded-tr-none shadow-[0_8px_30px_rgba(176,38,255,0.2)]' 
                          : 'bg-slate-800 text-gray-100 rounded-tl-none border border-white/5 shadow-xl'
                       }`}>
                          {renderMessageContent(msg.content, msg.is_toxic)}
                       </div>
                       <div className={`flex items-center gap-3 mt-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                            {formatRelativeTime(msg.created_at, now)}
                          </span>
                          {isMe && <span className="text-[8px] text-neon-blue/60 font-black uppercase tracking-[0.2em]">Delivered</span>}
                       </div>
                    </div>
                  );
                })}
                {friendIsTyping && (
                  <div className="flex items-center gap-2 text-[10px] text-neon-blue animate-pulse ml-2 font-bold tracking-widest uppercase">
                    <Bot className="w-3 h-3" /> Neural thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          {(!activeFriend.is_bot || isAiLinked) && (
            <div className="p-4 md:p-6 lg:p-8 bg-gradient-to-t from-[#050510] to-transparent">
              <div className="flex gap-4 items-end max-w-4xl mx-auto">
                <div className="flex-1 relative group">
                  <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processSendMessage(newMessage); } }}
                      placeholder={isSending ? "Scanning..." : "Transmit data..."}
                      className="w-full bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 text-white focus:outline-none focus:border-neon-blue transition-all resize-none min-h-[60px] max-h-32 custom-scrollbar shadow-2xl"
                      rows={1}
                  />
                  {isSending && <div className="absolute right-5 top-1/2 -translate-y-1/2"><Loader2 className="w-5 h-5 animate-spin text-neon-blue" /></div>}
                </div>
                <button
                  onClick={() => processSendMessage(newMessage)}
                  disabled={!newMessage.trim() || isSending}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-neon-purple to-neon-blue flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-neon-blue/20 shrink-0"
                >
                  <Send className="w-6 h-6 text-white ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-gray-700 bg-black/5">
           <div className="relative mb-8">
             <Zap className="w-24 h-24 opacity-5 animate-pulse" />
             <div className="absolute inset-0 bg-neon-blue/10 blur-[60px] rounded-full animate-blob" />
           </div>
           <p className="font-display tracking-[0.5em] uppercase text-xs font-bold text-gray-500">Neural Link Offline</p>
           <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-2">Select a signal to begin transmission</p>
        </div>
      )}
      {viewProfile && <ProfileViewModal user={viewProfile} isOnline={onlineUsers.has(viewProfile.id)} onClose={() => setViewProfile(null)} />}
    </div>
  );
};
