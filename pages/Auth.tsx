
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GlassCard, GlassInput, NeonButton } from '../components/UI';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'signup') setIsLogin(false);
  }, [location]);

  const ensureProfile = async (user: any, preferredUsername?: string) => {
    if (!user) return;
    const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (fetchError && fetchError.code === 'PGRST205') {
        setError("Database tables not found. Please contact administrator.");
        return;
    }

    if (!existingProfile) {
        let nameToUse = preferredUsername || user.user_metadata?.username || `User_${user.id.slice(0, 5)}`;
        const getProfilePayload = (name: string) => ({
            id: user.id,
            username: name,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            bio: "New to GiggleChat!",
            updated_at: new Date().toISOString()
        });

        let { error: insertError } = await supabase.from('profiles').upsert(getProfilePayload(nameToUse));
        if (insertError && insertError.code === '23505') {
            const randomSuffix = Math.floor(Math.random() * 10000);
            nameToUse = `${nameToUse}_${randomSuffix}`;
            await supabase.from('profiles').upsert(getProfilePayload(nameToUse));
        }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user);
        navigate('/chat');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (signUpError) throw signUpError;
        if (data.session) {
            await ensureProfile(data.user, username);
            navigate('/chat');
        } else if (data.user) {
            setSuccessMsg("Account created! 📧 Please check your email identity to confirm.");
            setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Fix [object Object] by ensuring string output
      const message = err?.message || (typeof err === 'string' ? err : "Encryption mismatch. Access denied.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] opacity-10 bg-cover bg-center" />
      
      <GlassCard className="w-full max-w-md z-10 backdrop-blur-2xl border-white/5" glow>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-tighter">{isLogin ? 'Login' : 'Signup'}</h2>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Secure Neural Gateway</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm animate-pulse break-words flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-200 text-sm flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <GlassInput 
              label="Username" 
              placeholder="NeonRider2077" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}
          <GlassInput 
            label="Email Identity" 
            type="email" 
            placeholder="user@grid.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <GlassInput 
            label="Access Key" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <NeonButton type="submit" className="w-full py-4 text-base uppercase tracking-widest" isLoading={loading} glow>
            {isLogin ? 'Authenticate' : 'Initialize Signup'}
          </NeonButton>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
            }}
            className="text-gray-500 hover:text-neon-blue text-xs uppercase tracking-widest font-bold transition-all"
          >
            {isLogin ? "Generate New ID (Signup)" : "Existing ID Identified? (Login)"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
