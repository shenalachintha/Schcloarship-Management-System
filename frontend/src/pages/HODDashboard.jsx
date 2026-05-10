import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsApi, attendanceApi } from '../api/api';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function HODDashboard() {
  const { user } = useAuth();
  const isApproved = localStorage.getItem('isApproved') === 'true';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stuFilter, setStuFilter] = useState({ batch: '' });
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (isApproved) {
      loadStudents();
    }
  }, [isApproved]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await studentsApi.getAll();
      const allStudents = Array.isArray(res.data) ? res.data : (res.data?.value || []);
      setStudents(allStudents);
    } catch (err) {
      toast.error('Failed to load department students');
    } finally {
      setLoading(false);
    }
  };

  const batches = useMemo(() => [...new Set(students.map(s => s.batch))].filter(Boolean), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => !stuFilter.batch || s.batch === stuFilter.batch);
  }, [students, stuFilter]);

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataArr = new Uint8Array(evt.target.result);
        const wb = XLSX.read(dataArr, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error('Excel file is empty');
          return;
        }

        const normalizeKey = (key) => String(key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const readValue = (row, aliases) => {
          const aliasSet = new Set(aliases.map(normalizeKey));
          const entry = Object.entries(row).find(([key]) => aliasSet.has(normalizeKey(key)));
          return entry ? String(entry[1] ?? '').trim() : '';
        };

        const attendanceData = rawData.map(row => ({
          registrationNumber: readValue(row, ['Reg No', 'Registration Number', 'RegNumber', 'Student ID']),
          percentage: parseFloat(readValue(row, ['Attendance %', 'Percentage', 'AttendancePercentage', 'Monthly Attendance']))
        })).filter(item => item.registrationNumber && !isNaN(item.percentage));

        if (attendanceData.length === 0) {
          toast.error('No valid records found. Ensure "Reg No" and "Attendance %" columns exist.');
          return;
        }

        setUploadLoading(true);
        await attendanceApi.bulkUpload({
          month,
          records: attendanceData
        });
        toast.success(`Successfully uploaded attendance for ${attendanceData.length} students. Eligible students (>80%) forwarded to Admin.`);
        refreshData();
      } catch (err) {
        toast.error('Failed to process Excel file');
      } finally {
        setUploadLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const refreshData = () => {
    loadStudents();
  };

  if (!isApproved) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="w-32 h-32 bg-amber-50 text-amber-500 rounded-[3rem] flex items-center justify-center mb-10 shadow-2xl shadow-amber-500/20 border-4 border-white">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0zM12 9v2m0 4h.01"></path></svg>
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center">HOD Account Pending Approval</h2>
        <p className="text-slate-500 mt-4 text-center max-w-md font-bold leading-relaxed">
          Your Head of Department account for <strong>{user?.department}</strong> is currently being reviewed by the Super Admin.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('registry');

  const sidebarItems = [
    { id: 'registry', label: 'Student Registry', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'attendance', label: 'Upload Attendance', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> },
  ];

  return (
    <div className="flex gap-8 animate-fade-in pb-12">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-28 space-y-2">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">HOD Console</h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[9px]">{user?.department || 'Department View'}</p>
          </div>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-primary-500'} transition-colors`}>
                {item.icon}
              </span>
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}

          {/* Summary Card in Sidebar */}
          <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white space-y-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Total Students</span>
              <span className="text-3xl font-black">{students.length}</span>
            </div>
            <div className="w-full h-px bg-white/10"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Filtered</span>
              <span className="text-3xl font-black">{filteredStudents.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 flex justify-around py-2 px-2">
        {sidebarItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${activeTab === item.id ? 'text-primary-600' : 'text-slate-400'}`}
          >
            {item.icon}
            <span className="text-[8px] font-black uppercase tracking-wider">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 space-y-10">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary-600 font-black uppercase tracking-[0.2em] text-[10px]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Faculty of {user?.faculty || 'Academic Affairs'}
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Dept. of {user?.department || 'Department View'}
            </h2>
            <p className="text-slate-500 font-bold text-sm">
              Welcome back, <span className="text-slate-900">{user?.name || user?.username}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              {activeTab === 'registry' ? 'SR' : 'AM'}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current View</p>
              <p className="text-sm font-black text-slate-900">{activeTab === 'registry' ? 'Student Registry' : 'Attendance Management'}</p>
            </div>
          </div>
        </div>

      {/* === STUDENT REGISTRY TAB === */}
      {activeTab === 'registry' && (
      <div className="space-y-8">
        {/* Batch Filter */}
        <div className="bg-white p-6 rounded-[2rem] shadow-glass border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Filter by Batch</label>
              <select 
                value={stuFilter.batch} 
                onChange={(e) => setStuFilter({ ...stuFilter, batch: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>Batch {b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
          <header className="p-8 border-b border-slate-50 bg-slate-50/20">
            <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </div>
              Department Student Registry
            </h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                <tr>
                  <th className="px-8 py-5">Registration No</th>
                  <th className="px-8 py-5">Name</th>
                  <th className="px-8 py-5">Batch</th>
                  <th className="px-8 py-5">Scholarship</th>
                  <th className="px-8 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-300 uppercase tracking-widest text-[10px] font-black">Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-300 uppercase tracking-widest text-[10px] font-black">No students found</td></tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-black text-slate-900">{s.registrationNumber}</td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-700">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">{s.nic}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-slate-500">Batch {s.batch}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.scholarshipType === 'Mahapola' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
                          {s.scholarshipType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* === UPLOAD ATTENDANCE TAB === */}
      {activeTab === 'attendance' && (
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-glass border border-slate-100">
          <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            Upload Monthly Attendance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Month</label>
              <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <input 
                  type="month" 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)} 
                  min={currentMonthStr}
                  max={currentMonthStr}
                  className="bg-transparent border-none text-slate-900 font-bold focus:outline-none p-0 text-sm flex-1" 
                  title="You can only upload attendance for the current calendar month"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium px-1">Locked to current calendar month for data integrity.</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Excel File</label>
              <label className="flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group">
                <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all ${uploadLoading ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                  <svg className={`w-7 h-7 text-primary-500 ${uploadLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-700">{uploadLoading ? 'Uploading...' : 'Click to upload .xlsx / .xls'}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Requires "Reg No" & "Attendance %" columns</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={uploadLoading} />
              </label>
            </div>
          </div>

          <div className="mt-8 p-4 bg-primary-50/50 rounded-2xl border border-primary-100 flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <p className="text-[10px] font-bold text-primary-800 uppercase tracking-widest leading-loose">
              Students with attendance above 80% will be automatically flagged as eligible and forwarded to the Admin for financial approval.
            </p>
          </div>
        </div>
      </div>
      )}

      </main>
    </div>
  );
}

