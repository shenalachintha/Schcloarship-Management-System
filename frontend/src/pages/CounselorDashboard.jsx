import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsApi, disciplineApi } from '../api/api';
import { toast } from 'react-hot-toast';

export default function CounselorDashboard() {
  const { user } = useAuth();
  const isApproved = localStorage.getItem('isApproved') === 'true';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stuFilter, setStuFilter] = useState({ batch: '', department: '' });
  const [disciplineForm, setDisciplineForm] = useState({
    studentId: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isApproved) {
      loadStudents();
    }
  }, [isApproved]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getAll();
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const batches = useMemo(() => [...new Set(students.map(s => s.batch))].filter(Boolean), [students]);
  const depts = useMemo(() => [...new Set(students.map(s => s.department))].filter(Boolean), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      (!stuFilter.batch || s.batch === stuFilter.batch) &&
      (!stuFilter.department || s.department === stuFilter.department)
    );
  }, [students, stuFilter]);

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!disciplineForm.studentId || !disciplineForm.description) {
      toast.error('Please select a student and provide a description');
      return;
    }

    setSubmitting(true);
    try {
      await disciplineApi.record({
        studentId: parseInt(disciplineForm.studentId),
        description: `[COMPLAINT/RAGGING] ${disciplineForm.description}`
      });
      toast.success('Incident report submitted to Admin successfully');
      setDisciplineForm({ studentId: '', description: '' });
    } catch (err) {
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-32 h-32 bg-amber-50 text-amber-500 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl shadow-amber-500/20 border-4 border-white">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0zM12 9v2m0 4h.01"></path></svg>
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center">Counselor Account Pending Approval</h2>
        <p className="text-slate-500 mt-4 text-center max-w-md font-bold leading-relaxed">
          Your general Counselor account is currently being reviewed by the Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Student Counselor Console</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">Student Welfare & Conduct Monitoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Report Form */}
        <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 bg-rose-600 text-white">
            <h3 className="text-2xl font-black tracking-tight">Report Ragging / Complaint</h3>
            <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest mt-1">Confidential Submission to Admin</p>
          </div>
          
          <form onSubmit={handleReportIssue} className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-900 ml-1">Select Student</label>
              <select
                value={disciplineForm.studentId}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, studentId: e.target.value })}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-500 transition-all shadow-sm cursor-pointer"
                required
              >
                <option value="">Choose student...</option>
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>{s.registrationNumber} — {s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-900 ml-1">Detailed Narrative</label>
              <textarea
                value={disciplineForm.description}
                onChange={(e) => setDisciplineForm({ ...disciplineForm, description: e.target.value })}
                placeholder="Describe the issue, ragging incident, or student complaint..."
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-500 transition-all shadow-sm min-h-[160px] resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black tracking-tight hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
            >
              {submitting && <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              {submitting ? 'Submitting Report...' : 'Submit Incident to Admin'}
            </button>
          </form>
        </div>

        {/* Student List View */}
        <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
          <header className="p-8 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              Student Directory
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={stuFilter.department} 
                onChange={(e) => setStuFilter({ ...stuFilter, department: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                value={stuFilter.batch} 
                onChange={(e) => setStuFilter({ ...stuFilter, batch: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>Batch {b}</option>)}
              </select>
            </div>
          </header>
          
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50 sticky top-0 z-10">
                <tr><th className="px-8 py-5">Student</th><th className="px-8 py-5">Department / Batch</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan="2" className="px-8 py-20 text-center text-slate-300 uppercase tracking-widest text-[10px] font-black">No students found</td></tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900 leading-tight">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{s.registrationNumber}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-700">{s.department}</p>
                        <p className="text-[10px] font-bold text-slate-500">Batch {s.batch}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
