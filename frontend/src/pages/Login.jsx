import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(username, password);
      login(data);
      if (data.role === 'Student') {
        navigate('/student');
      }
      else if (data.role === 'Staff') navigate('/staff');
      else navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-50 selection:bg-primary-100 selection:text-primary-900">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-16 flex-col justify-between relative overflow-hidden">
        {/* Animated Orbs */}
        <div className="absolute top-0 -left-20 w-80 h-80 bg-primary-600 rounded-full blur-[100px] opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-0 -right-20 w-80 h-80 bg-violet-600 rounded-full blur-[100px] opacity-20 animate-pulse-slow"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase">University MIS</span>
          </div>

          <h1 className="text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 uppercase">
            University <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-300 text-5xl">Management Information</span> <br />
            System.
          </h1>
          <p className="text-slate-400 max-w-md text-lg font-medium leading-relaxed">
            The most advanced portal for university scholarship tracking, attendance verification, and automated disbursements in Sri Lanka.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
                <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm font-medium">Trusted by <span className="text-slate-200 font-bold">5,000+</span> students across the nation.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 animate-fade-in relative">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl -z-10"></div>
        <div className="w-full max-w-sm space-y-10">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Login</h2>
            <p className="text-slate-500 font-semibold tracking-tight uppercase text-[10px]">Access your scholarship management account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl animate-slide-up flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="group">
                <label className="block text-[11px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-colors group-focus-within:text-primary-600">Portal Identifier (Reg No / Username)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm placeholder:text-slate-300"
                  placeholder="Enter your registration no or username"
                  required
                />
              </div>

              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest transition-colors group-focus-within:text-primary-600">Password</label>
                  <a href="#" className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest">Help?</a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm placeholder:text-slate-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 px-6 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="uppercase tracking-widest text-xs">Authenticating...</span>
                </div>
              ) : <span className="uppercase tracking-[0.2em] text-xs">Sign In to Dashboard</span>}
            </button>
          </form>

          <footer className="pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex flex-col items-center">
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Academic Staff</div>
                <span className="text-[10px] font-bold text-slate-400">staff123</span>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-400">
              Staff Member?{' '}
              <a href="/register" className="text-primary-600 hover:text-primary-700 transition-colors border-b-2 border-primary-500/20 hover:border-primary-600 pb-0.5 ml-1">
                Official Enrollment
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
