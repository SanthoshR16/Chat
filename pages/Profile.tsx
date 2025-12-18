
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { GlassCard, GlassInput, NeonButton } from '../components/UI';
import { Profile } from '../types';
import { Camera, Save, User, X, Check, Maximize2, Move, RotateCw, RefreshCw } from 'lucide-react';

const PhotoEditorModal = ({ imgSrc, onCancel, onSave }: { imgSrc: string; onCancel: () => void; onSave: (base64: string) => void; }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const PREVIEW_SIZE = 400; // Visual preview size on screen

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleFinalize = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!ctx || !img) return;

    const exportSize = 1024; // High resolution result
    canvas.width = exportSize;
    canvas.height = exportSize;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // Scaling factor from preview to export
    const scale = exportSize / PREVIEW_SIZE;

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scale, zoom * scale);
    
    // Position of image center relative to editor center
    const x = offset.x;
    const y = offset.y;

    // Draw the image centered at its calculated position
    ctx.drawImage(img, x - img.naturalWidth / 2, y - img.naturalHeight / 2);
    ctx.restore();

    onSave(canvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#050510]/95 backdrop-blur-xl p-4 md:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase">Neural Image Editor</h2>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"><X /></button>
        </div>

        <div className="relative mx-auto bg-black rounded-full overflow-hidden border border-white/10 shadow-2xl group cursor-move select-none"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
        >
          <img 
            ref={imgRef} src={imgSrc} alt="Edit" draggable={false}
            className="absolute max-w-none origin-center"
            style={{
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
          <div className="absolute inset-0 z-10 pointer-events-none border-4 border-neon-blue/10 rounded-full" />
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-gray-400">
              <span>Zoom Scale</span>
              <span className="text-neon-blue">{(zoom * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-neon-blue" />
          </div>

          <div className="flex gap-4">
             <button onClick={() => setRotation(r => r - 90)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4 scale-x-[-1]" /> <span className="text-xs font-bold uppercase tracking-wider">Rotate Left</span>
             </button>
             <button onClick={() => setRotation(r => r + 90)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">Rotate Right</span>
             </button>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <NeonButton variant="ghost" onClick={onCancel} className="flex-1">Discard</NeonButton>
            <NeonButton onClick={handleFinalize} className="flex-1" glow>
              <Check className="w-4 h-4" /> Save Result
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [editFile, setEditFile] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const handleUpdate = async () => {
    if (!profile) return;
    setLoading(true);
    await supabase.from('profiles').upsert({ ...profile, updated_at: new Date().toISOString() });
    setLoading(false);
    alert('Identity Record Updated');
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setEditFile(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  if (!profile) return <div className="p-20 text-center animate-pulse text-neon-blue font-display">Decrypting Profile...</div>;

  return (
    <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
      {editFile && <PhotoEditorModal imgSrc={editFile} onCancel={() => setEditFile(null)} onSave={(b) => { setProfile({ ...profile, avatar_url: b }); setEditFile(null); }} />}

      <div className="w-full max-w-4xl grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2 flex flex-col items-center">
           <GlassCard className="w-full flex flex-col items-center gap-6 p-8 group overflow-visible border-white/5">
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-2 border-neon-purple/20 p-1 group-hover:border-neon-purple/50 transition-all duration-700 shadow-[0_0_40px_rgba(176,38,255,0.1)]">
                   <img src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`} className="w-full h-full rounded-full object-cover bg-black" alt="Profile" />
                </div>
                <label className="absolute bottom-2 right-2 w-12 h-12 bg-neon-purple rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-neon-purple/40 hover:scale-110 active:scale-95 transition-all z-20 border-4 border-[#050510]">
                   <Camera className="w-5 h-5 text-white" />
                   <input type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
                </label>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">{profile.username}</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold opacity-60">Verified Node ID: {profile.id.slice(0, 8)}</p>
              </div>
           </GlassCard>
        </div>

        <div className="md:col-span-3 space-y-6">
           <GlassCard className="space-y-6 border-white/5 shadow-xl">
              <h3 className="text-sm font-display font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest"><Maximize2 className="w-4 h-4 text-neon-blue" /> User Identity Parameters</h3>
              <GlassInput label="Codename" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
              <div className="space-y-2">
                <label className="text-xs font-display tracking-widest text-cyan-400 uppercase font-bold">Biography Stream</label>
                <textarea className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white focus:border-neon-blue focus:outline-none resize-none transition-all placeholder-gray-700"
                  value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Describe your neural frequency..." />
              </div>
              <NeonButton onClick={handleUpdate} isLoading={loading} className="w-full h-14 uppercase tracking-[0.2em]" glow>
                 <Save className="w-5 h-5" /> Commit Identity
              </NeonButton>
           </GlassCard>
        </div>
      </div>
    </div>
  );
};
