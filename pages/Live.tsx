
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { GlassCard, NeonButton } from '../components/UI';
import { Mic, MicOff, Radio, Power, Activity, ShieldCheck } from 'lucide-react';

export const LivePage = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [volume, setVolume] = useState(0);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startSession = async () => {
    try {
      setStatus('Initializing Neural Link...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('Active');
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple volume visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 100);

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              const binary = String.fromCharCode(...new Uint8Array(int16.buffer));
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
                });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64 && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setIsActive(false);
            setStatus('Disconnected');
          },
          onerror: (e) => console.error(e)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are Giggle Live AI. Respond with short, spoken-style futuristic dialogue."
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setStatus('Connection Failed');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    setIsActive(false);
    setStatus('Standby');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-[#050510] relative overflow-hidden">
      {/* Background Neural Network */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-neon-blue/20 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-neon-purple/20 rounded-full animate-ping" style={{ animationDuration: '6s' }} />
      </div>

      <div className="z-10 text-center space-y-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-display font-black tracking-tighter text-white">
            GIGGLE <span className="text-neon-blue">LIVE</span>
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-500">{status}</span>
          </div>
        </div>

        {/* Neural Pulse Orb */}
        <div className="relative group">
          <div className={`w-64 h-64 rounded-full border-4 border-white/5 bg-black/40 backdrop-blur-3xl flex items-center justify-center transition-all duration-700 shadow-2xl ${
            isActive ? 'scale-110 border-neon-blue/40 shadow-[0_0_80px_rgba(0,243,255,0.2)]' : 'scale-100'
          }`}>
             <div 
               className="w-32 h-32 rounded-full bg-gradient-to-tr from-neon-blue via-neon-purple to-neon-pink transition-all duration-300 animate-pulse-slow"
               style={{ transform: `scale(${1 + (volume / 100)})`, opacity: isActive ? 1 : 0.3 }}
             />
             <Radio className={`absolute w-12 h-12 text-white/80 ${isActive ? 'animate-pulse' : 'opacity-20'}`} />
          </div>
          {isActive && (
            <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-1 h-8 items-end">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-neon-blue rounded-full transition-all duration-75"
                  style={{ height: `${Math.random() * volume + 5}%` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-6">
          <NeonButton 
            onClick={isActive ? stopSession : startSession} 
            className={`w-56 h-16 text-lg !rounded-full !px-0 flex items-center justify-center gap-3 ${
              isActive ? '!bg-red-500 hover:!bg-red-600' : ''
            }`}
            glow
          >
            {isActive ? (
              <><MicOff className="w-6 h-6" /> End Link</>
            ) : (
              <><Mic className="w-6 h-6" /> Establish Link</>
            )}
          </NeonButton>
          
          <div className="max-w-xs p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
             <ShieldCheck className="w-5 h-5 text-neon-green shrink-0 mt-1" />
             <p className="text-[10px] text-gray-500 text-left leading-relaxed font-medium uppercase tracking-widest">
               Neural encryption active. Your voice stream is processed in real-time by the Giggle 2.5 Core. 
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
