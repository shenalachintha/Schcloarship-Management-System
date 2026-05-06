import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsApi, attendanceApi, disciplineApi } from '../api/api';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function StaffDashboard() {
  const { user } = useAuth();
  const isApproved = localStorage.getItem('isApproved') === 'true';
  const [students, setStudents] = useState([]);
  const [attendanceForm, setAttendanceForm] = useState({
    studentId: '',
    month: new Date().toISOString().split('T')[0].slice(0, 7),
    percentage: ''
  });
  const [disciplineForm, setDisciplineForm] = useState({
    studentId: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [stuFilter, setStuFilter] = useState({ batch: '', type: '', faculty: '', attendance: '', discipline: '' });
  
  const faculties = [...new Set(students.map(s => s.faculty))].filter(Boolean);

  const applyFilters = (s) => {
    const matchBatch = !stuFilter.batch || s.batch === stuFilter.batch;
    const matchType = !stuFilter.type || s.scholarshipType === stuFilter.type;
    const matchFaculty = !stuFilter.faculty || s.faculty === stuFilter.faculty;
    
    return matchBatch && matchType && matchFaculty;
  };
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentActivity, setStudentActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isApproved) {
      loadStudents();
    }
  }, [isApproved]);

  const loadStudents = async () => {
    try {
      const res = await studentsApi.getAll();
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load student registry');
      setStudents([]);
    }
  };

  const handleRecordAttendance = async (e) => {
    e.preventDefault();
    try {
      await attendanceApi.recordMonthlyPercentage({
        ...attendanceForm,
        percentage: parseFloat(attendanceForm.percentage)
      });
      toast.success('Monthly attendance recorded successfully');
      setAttendanceForm({ ...attendanceForm, studentId: '', percentage: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording monthly attendance');
    }
  };

  const handleRecordDiscipline = async (e) => {
    e.preventDefault();
    try {
      await disciplineApi.record(disciplineForm);
      toast.success('Disciplinary event logged');
      setDisciplineForm({ ...disciplineForm, studentId: '', reason: '' });
    } catch (err) {
      toast.error('Error logging disciplinary event');
    }
  };

  const fetchStudentDetails = async () => {
    if (!selectedStudent) return;
    setIsLoading(true);
    try {
      const res = await attendanceApi.getHistory(selectedStudent);
      setStudentActivity(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to fetch activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) fetchStudentDetails();
  }, [selectedStudent]);

  const generatePDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Scholarship Eligibility Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const filtered = students.filter(applyFilters);

    const tableData = filtered.map(s => [
      s.registrationNumber,
      s.name,
      s.batch || 'N/A',
      s.scholarshipType || 'N/A',
      s.faculty
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Reg No', 'Name', 'Batch', 'Type', 'Faculty']],
      body: tableData,
    });

    doc.save(`Scholarship_Report_${new Date().getTime()}.pdf`);
    toast.success('Report generated successfully');
  };

  if (!isApproved) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-32 h-32 bg-amber-50 text-amber-500 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl shadow-amber-500/20 border-4 border-white">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0zM12 9v2m0 4h.01"></path></svg>
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center">Account Pending Approval</h2>
        <p className="text-slate-500 mt-4 text-center max-w-md font-bold leading-relaxed">
          Your administrative account is currently being reviewed by the system administrator. 
          Access to the Staff Intelligence Console will be granted once your profile is verified.
        </p>
        <div className="mt-12 p-6 bg-white rounded-3xl border border-slate-100 shadow-glass flex items-center gap-4">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Verification in Progress</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Staff Console</h1>
          <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">Academic Records & Compliance</p>
        </div>
        <button 
          onClick={generatePDFReport}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-sm hover:bg-primary-700 hover:-translate-y-1 transition-all shadow-xl shadow-primary-500/20 active:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export Compliance Audit
        </button>
      </div>

      {/* Global Intelligence Filters */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            </div>
            Global Registry Filters
          </h3>
          <button 
            onClick={() => setStuFilter({ batch: '', type: '', faculty: '', attendance: '', discipline: '' })} 
            className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academic Batch</label>
            <select value={stuFilter.batch} onChange={(e) => setStuFilter({ ...stuFilter, batch: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
              <option value="">All Batches</option>
              {[...new Set(students.map(s => s.batch))].filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scholarship Pool</label>
            <select value={stuFilter.type} onChange={(e) => setStuFilter({ ...stuFilter, type: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
              <option value="">All Types</option>
              <option value="Mahapola">Mahapola Scholars</option>
              <option value="Bursary">Bursary Scholars</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Faculty</label>
            <select value={stuFilter.faculty} onChange={(e) => setStuFilter({ ...stuFilter, faculty: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none">
              <option value="">All Faculties</option>
              {faculties.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-black text-slate-600">
            {students.filter(applyFilters).length} matching records found
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Attendance Recording */}
        <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Record Monthly Attendance</h3>
              <span className="px-4 py-1.5 bg-primary-500/20 text-primary-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-500/30">Batch Mode</span>
            </div>
          </div>
          
          <form onSubmit={handleRecordAttendance} className="p-8 space-y-6 flex-grow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-900 ml-1">Select Student from Registry</label>
                <select
                  value={attendanceForm.studentId}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm cursor-pointer"
                  required
                >
                  <option value="">Choose student...</option>
                  {students
                    .filter(applyFilters)
                    .map((s) => (
                    <option key={s.studentId} value={s.studentId}>{s.registrationNumber} — {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-900 ml-1">Target Month</label>
                  <input
                    type="month"
                    value={attendanceForm.month}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, month: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-900 ml-1">Attendance %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 85"
                    value={attendanceForm.percentage}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, percentage: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white focus:border-primary-500 transition-all shadow-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black tracking-tight hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] mt-8"
            >
              Record Monthly Status
            </button>
          </form>
        </div>

        {/* Discipline Recording */}
        <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 bg-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Record Disciplinary Event</h3>
                <p className="text-red-100 text-[10px] font-bold uppercase tracking-widest mt-1">Compliance & Conduct Enforcement</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleRecordDiscipline} className="p-8 space-y-6 flex-grow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-slate-900 ml-1">Identified Student</label>
                <select
                  value={disciplineForm.studentId}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, studentId: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:bg-white focus:border-red-500 transition-all shadow-sm cursor-pointer"
                  required
                >
                  <option value="">Select subject for review...</option>
                  {students
                    .filter(applyFilters)
                    .map((s) => (
                    <option key={s.studentId} value={s.studentId}>{s.registrationNumber} — {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-slate-900 ml-1">Incident Narrative</label>
                <textarea
                  value={disciplineForm.reason}
                  onChange={(e) => setDisciplineForm({ ...disciplineForm, reason: e.target.value })}
                  placeholder="Detail the disciplinary event or compliance breach..."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:bg-white focus:border-red-500 transition-all shadow-sm min-h-[140px] resize-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-red-600 text-white rounded-2xl font-black tracking-tight hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] mt-8"
            >
              Log Disciplinary Incident
            </button>
          </form>
        </div>
      </div>

      {/* Activity Logs / Verification Hub */}
      <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intelligent Verification Hub</h3>
            <p className="text-slate-500 text-sm font-bold mt-1">Cross-referencing historical activity data</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full sm:w-80 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm"
            >
              <option value="">Select Student to Analyze Activity</option>
              {students
                .filter(applyFilters)
                .map((s) => (
                <option key={s.studentId} value={s.studentId}>{s.registrationNumber} — {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
          </div>
        ) : studentActivity && studentActivity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentActivity.map((record) => (
              <div key={record.monthlyAttendanceId} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-primary-200 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{record.month}</span>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black ${record.percentage >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {record.percentage}% Attendance
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${record.percentage >= 80 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${record.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white text-slate-300 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <p className="text-slate-400 font-bold">No activity history found for selection</p>
          </div>
        )}
      </div>
    </div>
  );
}
