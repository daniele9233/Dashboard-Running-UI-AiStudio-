import React, { useState, useEffect } from 'react';
import { RoutesView } from './components/RoutesView';
import { KeyRound, ArrowRight } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Check if token exists in env or localStorage
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const localToken = localStorage.getItem('mapbox_token');
    
    if (envToken) {
      setToken(envToken);
    } else if (localToken) {
      setToken(localToken);
    }
  }, []);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      localStorage.setItem('mapbox_token', inputValue.trim());
      setToken(inputValue.trim());
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0F172A] border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
            <KeyRound className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-2">Mapbox Token Required</h1>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            To view the 3D Flyover prototype, you need a valid Mapbox public token. 
            You can get one for free at <a href="https://mapbox.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">mapbox.com</a>.
          </p>
          
          <form onSubmit={handleSaveToken} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Public Access Token</label>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="pk.eyJ1Ijoi..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#C0FF00] text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-[#a8e600] transition-colors flex items-center justify-center gap-2"
            >
              Start Prototype <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <RoutesView mapboxToken={token} />;
}
