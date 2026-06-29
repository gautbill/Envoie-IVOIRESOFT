import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Enforce credentials with a slight realistic network delay for safety feedback
    setTimeout(() => {
      const sanitizedEmail = email.trim().toLowerCase();
      const expectedEmail = 'gautierck@gmail.com';
      const expectedPassword = 'GautierSEKA@09041973';

      if (sanitizedEmail === expectedEmail && password === expectedPassword) {
        // Successful login
        localStorage.setItem('ivoiresoft_auth', 'true');
        localStorage.setItem('ivoiresoft_user_email', sanitizedEmail);
        onLoginSuccess();
      } else {
        setError('Email ou mot de passe incorrect. Veuillez réessayer.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none text-[#F1F5F9]">
      {/* Decorative background ambient glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0E111A] border border-white/5 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Brand identity header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-lg flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
            IvoireSoft CI <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-medium">v1.2</span>
          </h1>
          <p className="text-xs text-white/50 font-mono tracking-tight uppercase mt-1">Console de Securité d'Automatisation</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-lg font-medium animate-shake flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@example.com"
                className="w-full bg-[#141824] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-white/20"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider font-mono">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#141824] border border-white/5 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <span>Se connecter</span>
            )}
          </button>

        </form>

        {/* Footer info */}
        <div className="mt-8 text-center border-t border-white/5 pt-4">
          <p className="text-[10px] text-white/30 font-mono">
            © {new Date().getFullYear()} IVOIRESOFT CI. TOUS DROITS RÉSERVÉS.
          </p>
        </div>

      </div>
    </div>
  );
}
