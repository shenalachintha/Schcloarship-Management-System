import React, { useState, useEffect } from 'react';
import { auditApi } from '../api/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    setLoading(true);
    auditApi.getLogs()
      .then((res) => {
        setLogs(res.data);
        setError('');
      })
      .catch(() => setError('Failed to retrieve audit intelligence logs.'))
      .finally(() => setLoading(false));
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && logs.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Intelligence</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">Administrative Governance & Action Traceability</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search governance logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 shadow-sm transition-all w-full md:w-80"
            />
          </div>
          <button 
            onClick={fetchLogs}
            className="p-3.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm active:scale-95"
            title="Refresh logs"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-5 bg-red-50 border border-red-100 rounded-2xl text-red-800 flex items-center gap-4 animate-slide-up">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
          </div>
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black bg-slate-50/50">
                <th className="px-8 py-6">Timestamp</th>
                <th className="px-8 py-6">Executive</th>
                <th className="px-8 py-6">Action</th>
                <th className="px-8 py-6">Domain</th>
                <th className="px-8 py-6">Narrative Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p className="font-black uppercase tracking-widest text-[11px]">No audit trails matching criteria discovered</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.auditLogId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{new Date(log.performedAt).toLocaleDateString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(log.performedAt).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] border border-indigo-100">
                          {log.performedBy.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700">{log.performedBy}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        log.action.includes('Approved') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        log.action.includes('Rejected') ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
                        {log.entityName}
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-md">
                      <p className="text-slate-600 font-medium leading-relaxed">{log.details}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Traceability Index: {filteredLogs.length} Records Visualized
           </p>
           <button className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:text-primary-700 transition-colors">
             Load Extended History →
           </button>
        </div>
      </div>
    </div>
  );
}
