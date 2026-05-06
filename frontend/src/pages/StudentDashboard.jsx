import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { studentsApi, attendanceApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userKey = user?.studentId ?? user?.userId ?? user?.username ?? null;

  useEffect(() => {
    const fetchData = async () => {
      if (!userKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [dashRes, histRes] = await Promise.all([
          studentsApi.getDashboard(),
          attendanceApi.getMyHistory()
        ]);
        setData(dashRes.data);
        setAttendanceHistory(histRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userKey]);

  if (loading) return <div className="text-center py-12">Loading...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!data) return <div className="text-center py-12">No dashboard data available.</div>;

  const dashboardData = data || {};
  const eligibility = dashboardData.eligibility || dashboardData.Eligibility || {};
  const attendancePercentage = dashboardData.attendancePercentage ?? dashboardData.AttendancePercentage ?? 0;
  const scholarshipStatus = dashboardData.scholarshipStatus || dashboardData.ScholarshipStatus || 'Unknown';
  const paymentHistory = dashboardData.paymentHistory || dashboardData.PaymentHistory || [];
  const notifications = dashboardData.notifications || dashboardData.Notifications || [];
  const forecastedPayments = dashboardData.forecastedPayments || dashboardData.ForecastedPayments || [];
  const totalRemainingAmount = dashboardData.totalRemainingAmount ?? dashboardData.TotalRemainingAmount ?? 0;
  const annualTotalAmount = dashboardData.annualTotalAmount ?? dashboardData.AnnualTotalAmount ?? 0;
  const fullAnnualAmount = dashboardData.fullAnnualAmount ?? dashboardData.FullAnnualAmount ?? 0;

  const isEligible = eligibility.isEligible ?? eligibility.IsEligible ?? false;

  const totalPaid = paymentHistory ? paymentHistory.reduce((sum, p) => p.status === 'Processed' ? sum + p.amount : sum, 0) : 0;

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    try {
      const date = new Date(monthStr + "-01");
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Student Overview</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">Your Academic & Financial Performance Hub</p>
        </div>
      </div>

      {/* Hero Eligibility Card */}
      <div className={`relative p-8 rounded-[2.5rem] overflow-hidden transition-all duration-500 border-2 ${isEligible ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'} group shadow-sm hover:shadow-md`}>
        <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] opacity-20 -z-10 transition-transform duration-700 group-hover:scale-110 ${isEligible ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
        <div className="flex items-center gap-8 relative z-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transform transition-transform duration-500 group-hover:rotate-12 ${isEligible ? 'bg-emerald-500 shadow-emerald-200 text-white' : 'bg-amber-500 shadow-amber-200 text-white'}`}>
            {isEligible ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            )}
          </div>
          <div>
            <h2 className={`font-black text-3xl tracking-tight ${isEligible ? 'text-emerald-900' : 'text-amber-900'}`}>{eligibility.message || eligibility.Message || 'Status Pending'}</h2>
            {(eligibility.scholarshipType || eligibility.ScholarshipType) && (
              <div className="mt-3 flex items-center gap-3">
                <span className={`uppercase tracking-[0.2em] text-[10px] font-black ${isEligible ? 'text-emerald-600/60' : 'text-amber-600/60'}`}>Active Designation</span>
                <span className={`px-4 py-1 rounded-2xl font-black text-xs ${isEligible ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-amber-100/50 text-amber-700 border border-amber-200'}`}>
                  {eligibility.scholarshipType || eligibility.ScholarshipType}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 card-hover group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary-100/50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
            <span>Attendance Integrity</span>
            {eligibility.evaluationMonth && <span className="text-primary-500/60 lowercase tracking-normal font-bold">Showing {formatMonth(eligibility.evaluationMonth)}</span>}
          </h3>
          <div className="flex items-baseline gap-3">
            <p className="text-5xl font-black text-slate-900 tracking-tighter">{attendancePercentage.toFixed(1)}</p>
            <span className="text-xl font-black text-primary-500 shadow-neon-sm">%</span>
          </div>
          <div className="mt-6 w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
             <div 
               className={`h-full rounded-full transition-all duration-1000 shadow-inner ${attendancePercentage >= 80 ? 'bg-gradient-to-r from-emerald-500 to-primary-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
               style={{ width: `${attendancePercentage}%` }}
             ></div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Target Min: 80%</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 card-hover group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-100/50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Program Tenure</h3>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${scholarshipStatus === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600 shadow-inner'}`}>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{scholarshipStatus}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Standing</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 card-hover group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-100/50 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Certification</h3>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
             </div>
             <div>
               <p className={`text-2xl font-black tracking-tight ${isEligible ? 'text-emerald-600' : 'text-amber-600'}`}>
                 {isEligible ? 'Premium Eligible' : 'Under Review'}
               </p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status Verified</p>
             </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Section - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-emerald-50/30 p-6 rounded-[2rem] border border-emerald-100 flex items-center justify-between group hover:bg-emerald-50 transition-all shadow-sm">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Remaining Balance</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs {totalRemainingAmount?.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-emerald-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>

        <div className="bg-primary-50/30 p-6 rounded-[2rem] border border-primary-100 flex items-center justify-between group hover:bg-primary-50 transition-all shadow-sm">
          <div>
            <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-1">Already Paid</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs {totalPaid?.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-primary-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>
        
        <div className="bg-amber-50/30 p-6 rounded-[2rem] border border-amber-100 flex items-center justify-between group hover:bg-amber-50 transition-all shadow-sm">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Adjusted Annual Total</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs {annualTotalAmount?.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-amber-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>
          </div>
        </div>

        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-slate-50 transition-all shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Full Annual Grant</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs {fullAnnualAmount?.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
        </div>
      </div>

      {(forecastedPayments && forecastedPayments.length > 0) ? (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 relative overflow-hidden">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-neon-sm"></div>
            Disbursement Intelligence Roadmap
          </h3>
          
          <div className="flex gap-6 overflow-x-auto pb-6 pt-2 scrollbar-hide">
            {forecastedPayments.map((f, index) => (
              <div key={f.month} className="flex-none w-48 relative group">
                {index < forecastedPayments.length - 1 && (
                  <div className="absolute top-10 left-1/2 w-full h-0.5 bg-slate-50 -z-0"></div>
                )}
                
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:border-emerald-200 group-hover:shadow-md transition-all duration-500 mb-4 px-2">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{f.month.split('-')[0]}</p>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                        {new Date(f.month + "-01").toLocaleDateString(undefined, { month: 'short' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-4 h-4 rounded-full bg-white border-4 border-slate-100 group-hover:border-emerald-500 transition-colors mb-4 shadow-sm"></div>
                  
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-900 leading-tight">{formatMonth(f.month)}</p>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">Est. Rs {f.estimatedAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest leading-loose">
              Forecast logic incorporates active tenure and standard disbursement cycles. Actual dates may vary based on executive approval.
            </p>
          </div>
        </div>
      ) : (scholarshipStatus === 'Active' || !eligibility.isEligible) && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 flex flex-col items-center justify-center py-12 text-slate-300">
           <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">{forecastedPayments?.length === 0 ? 'No future payments scheduled' : 'Roadmap unavailable for current tenure status'}</p>
        </div>
      )}

      {/* Attendance Velocity History */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 text-primary-50">
           <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
        </div>
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary-500 shadow-neon-sm"></div>
          Attendance Velocity Tracking
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 relative z-10">
           {attendanceHistory.length > 0 ? (
             attendanceHistory.slice(0, 6).map((h) => (
               <div key={h.monthlyAttendanceId} className="flex flex-col items-center group">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-2 group-hover:text-primary-500 transition-colors">
                    {new Date(h.month + "-01").toLocaleDateString(undefined, { month: 'short' })}
                  </span>
                  <div className="relative w-full aspect-square bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-4 transition-all duration-500 group-hover:border-primary-200 group-hover:bg-white group-hover:shadow-lg">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="38%"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          className="text-slate-100"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="38%"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray="100 100"
                          strokeDashoffset={100 - h.percentage}
                          strokeLinecap="round"
                          className={`transition-all duration-1000 ${h.percentage >= 80 ? 'text-emerald-500' : 'text-red-500'}`}
                        />
                     </svg>
                     <span className="absolute font-black text-lg tracking-tighter text-slate-900">{h.percentage.toFixed(0)}%</span>
                  </div>
                  <span className="mt-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest">{h.month.split('-')[0]}</span>
               </div>
             ))
           ) : (
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300">
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">No historical data points captured</p>
             </div>
           )}
        </div>
      </div>

      {/* History & Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden flex flex-col">
          <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
            <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              Disbursement Portfolio
            </h3>
          </header>
          <div className="p-8 flex-1 overflow-y-auto max-h-[550px] scrollbar-hide">
            {paymentHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Financial Archive is Empty</p>
              </div>
            ) : (
              <div className="space-y-6">
                {paymentHistory.map((p) => (
                  <div key={p.paymentId} className="group flex justify-between items-center p-6 rounded-3xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-500 hover:translate-x-1 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-50 flex flex-col items-center justify-center shadow-inner group-hover:border-primary-100 transition-colors">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{p.month.split('-')[0]}</span>
                        <span className="text-sm font-black text-primary-600">{p.month.split('-')[1]}</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight mb-1">{formatMonth(p.month)}</p>
                        <div className="flex items-center gap-3">
                           <span className="text-sm text-primary-600 font-extrabold px-3 py-0.5 bg-primary-50 rounded-lg">Rs {p.amount.toLocaleString()}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Bank Transfer Verified</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                         p.status === 'Processed' ? 'bg-emerald-500 text-white shadow-emerald-200' : p.status === 'Rejected' ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-100 text-slate-500'
                       }`}>{p.status}</span>
                       <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter italic">Ref: 0x{p.paymentId.toString(16).toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden flex flex-col">
          <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
            <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shadow-sm">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </div>
              Intelligent Inbox
            </h3>
          </header>
          <div className="p-8 flex-1 overflow-y-auto max-h-[550px] scrollbar-hide">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Digital Inbox is Pristine</p>
              </div>
            ) : (
              <div className="space-y-6">
                {notifications.map((n) => (
                  <div key={n.notificationId} className="p-6 rounded-3xl border border-slate-50 hover:bg-slate-50/50 transition-all group relative border-l-4 border-l-violet-400 hover:shadow-sm">
                    <p className="text-slate-700 font-bold text-sm leading-relaxed tracking-tight">{n.message}</p>
                    <div className="mt-4 flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-inner">
                          <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          {new Date(n.createdDate).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                       </div>
                       <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Certified Update</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
