import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Staff',
    username: '',
    faculty: '',
    department: '',
    address: '',
    mobileNumber: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      
      const res = await authApi.register(formData);
      navigate('/login');
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-primary-100 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-slate-950 -z-10 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/50 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute top-20 -right-20 w-96 h-96 bg-primary-600 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-600 rounded-full blur-[100px] opacity-10"></div>
      </div>
      
      <div className="max-w-4xl w-full glass bg-white/95 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-white animate-slide-up relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-500 mb-6 shadow-xl shadow-primary-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Staff Enrollment</h2>
          <p className="mt-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Higher Education Scholarship Management System</p>
        </div>
        
        <form className="space-y-12" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl animate-fade-in flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-primary-50 p-6 rounded-3xl border border-primary-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <p className="text-[11px] font-bold text-primary-900 leading-tight">
                Self-registration is only available for <span className="font-black uppercase tracking-widest text-primary-600">Academic Staff</span>. Student and Admin accounts are managed by the System Controller.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div className="md:col-span-2 space-y-8">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-200"></span>
                Official Identity & Credentials
                <span className="flex-grow h-[1px] bg-slate-200"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Full Legal Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your full legal name"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Portal Username</label>
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="Choose a unique username"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Portal Private Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="Create a secure password"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-8 animate-fade-in">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-200"></span>
                Institutional / Academic Profile
                <span className="flex-grow h-[1px] bg-slate-200"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Faculty</label>
                  <input
                    name="faculty"
                    type="text"
                    required
                    placeholder="e.g. Faculty of Science"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.faculty}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Department</label>
                  <input
                    name="department"
                    type="text"
                    required
                    placeholder="e.g. Dept. of Computing"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-8 animate-fade-in">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-8 h-[1px] bg-slate-200"></span>
                Contact & Residency
                <span className="flex-grow h-[1px] bg-slate-200"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Permanent Address</label>
                  <textarea
                    name="address"
                    required
                    rows="1"
                    placeholder="Enter your full home address"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm resize-none"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest transition-all group-focus-within:text-primary-600">Active Mobile Number</label>
                  <input
                    name="mobileNumber"
                    type="tel"
                    required
                    placeholder="+94 7X XXX XXXX"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="group w-full py-6 px-10 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-3xl transition-all duration-300 shadow-2xl shadow-primary-500/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                   <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   <span className="uppercase tracking-[0.2em] text-[11px]">Enrolling Official...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="uppercase tracking-[0.3em] text-[11px]">Request Official Portal Access</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
              )}
            </button>
          </div>
          
          <div className="text-center pt-10 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
              Already a verified member?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 transition-colors border-b-2 border-primary-500/20 hover:border-primary-600 pb-0.5 ml-2">
                Sign in to Dashboard
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
