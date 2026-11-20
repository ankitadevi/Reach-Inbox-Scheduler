import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('oliver.brown@domain.io');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Login Flow
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        // Fetch user profile from Google with access token
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        const authRes = await api.loginGoogle({
          email: userInfo.data.email,
          name: userInfo.data.name,
          picture: userInfo.data.picture,
          googleId: userInfo.data.sub,
        });

        login(authRes.user);
      } catch (err: any) {
        console.error('Google login error:', err);
        setError('Google sign-in failed. Please try again or login with email.');
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      setError('Google OAuth popup was closed or blocked.');
    },
  });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const authRes = await api.loginGoogle({
        email: email.trim(),
        name: email.split('@')[0],
      });
      login(authRes.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white p-8 sm:p-10 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Login</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Google OAuth Button matching Figma */}
        <button
          onClick={() => handleGoogleLogin()}
          disabled={loading}
          type="button"
          className="w-full py-3 px-4 rounded-lg bg-[#E8F5E9] hover:bg-[#D7EED9] text-gray-800 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-2xs group cursor-pointer"
        >
          {/* Google Multicolored "G" Logo */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider matching Figma */}
        <div className="flex items-center my-6">
          <span className="flex-1 border-t border-gray-200"></span>
          <span className="px-3 text-xs text-gray-400 font-medium">or sign up through email</span>
          <span className="flex-1 border-t border-gray-200"></span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              required
              className="w-full bg-[#F3F4F6] text-sm text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#F3F4F6] text-sm text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 border-none outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A651] hover:bg-[#009245] text-white font-semibold text-sm py-3 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
