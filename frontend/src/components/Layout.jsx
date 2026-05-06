import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <Outlet />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <nav className="fixed w-full z-50 glass border-b border-indigo-100/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-indigo-500 to-violet-500 tracking-tighter">
                ScholarSync
              </span>
              <div className="hidden md:flex items-center gap-1">
                {user.isApproved && (
                  <>
                    {user.role?.toLowerCase() === 'student' && (
                      <NavLink to="/student" className={({ isActive }) => `px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-slate-500 hover:bg-white hover:text-primary-600'}`}>
                        Dashboard
                      </NavLink>
                    )}
                    {(user.role?.toLowerCase() === 'staff' || user.role?.toLowerCase() === 'admin') && (
                      <NavLink to="/staff" className={({ isActive }) => `px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-slate-500 hover:bg-white hover:text-primary-600'}`}>
                        Staff Console
                      </NavLink>
                    )}
                    {user.role?.toLowerCase() === 'admin' && (
                      <NavLink to="/admin" className={({ isActive }) => `px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-slate-500 hover:bg-white hover:text-primary-600'}`}>
                        Admin Center
                      </NavLink>
                    )}
                  </>
                )}
                {!user.isApproved && (
                  <div className="px-4 py-2 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-100 rounded-xl animate-pulse">
                    Identity Verification Pending
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900 leading-none">{user.username}</span>
                <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.1em] mt-1">{user.role}</span>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-600 to-violet-500 flex items-center justify-center text-white font-black shadow-lg shadow-primary-200 transform hover:scale-105 transition-transform cursor-pointer">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
