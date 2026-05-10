import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi, analyticsApi, governmentApi, adminManagementApi, attendanceApi, disciplineApi } from '../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [governmentList, setGovernmentList] = useState([]);
  const [showList, setShowList] = useState(true);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [bulkApprovingPayments, setBulkApprovingPayments] = useState(false);
  
  // Provisioning State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedProvisionStudent, setSelectedProvisionStudent] = useState(null);
  const [provisionEmail, setProvisionEmail] = useState('');

  // Filters for Student Management
  const [stuFilter, setStuFilter] = useState({ batch: '', faculty: '', type: '' });
  const [uploadType, setUploadType] = useState('Standard'); // Standard, Mahapola, Bursary

  const departments = [
    "Department of Computer Science",
    "Department of Physical Science",
    "Department of Language and Communication Studies",
    "Department of Business Management Studies",
    "Department of Physiology",
    "Department of Pharmacology",
    "Department of Clinical"
  ];

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    password: '',
    name: '',
    role: 'HOD',
    department: departments[0],
    faculty: ''
  });
  const [creatingStaff, setCreatingStaff] = useState(false);

  const [highAttendanceReport, setHighAttendanceReport] = useState([]);
  const [allMonthlyAttendance, setAllMonthlyAttendance] = useState([]);
  const [monthlyDiscipline, setMonthlyDiscipline] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const wrap = (promise, setter) => promise
        .then(res => setter(res.data))
        .catch(err => console.error("Request failed", err));

      await Promise.allSettled([
        wrap(analyticsApi.getDashboard(), setAnalytics),
        wrap(governmentApi.getAll(), setGovernmentList),
        wrap(adminManagementApi.getPendingStaff(), setPendingStaff),
        wrap(adminManagementApi.getApprovedStaff(), setApprovedStaff),
        wrap(adminManagementApi.getFinancialHistory(), setPaymentHistory),
        wrap(paymentsApi.getEligible(month), setPendingPayments),
        wrap(attendanceApi.getHighAttendanceReport(month), setHighAttendanceReport),
        wrap(attendanceApi.getAllMonthly(month), setAllMonthlyAttendance),
        wrap(disciplineApi.getMonthlyIssues(month), setMonthlyDiscipline)
      ]);
      
      setLoading(false);
    };
    fetchData();
  }, [month, activeTab]);

  const refreshData = async () => {
    setLoading(true);
    const wrap = (promise, setter) => promise.then(res => setter(res.data)).catch(() => {});
    await Promise.allSettled([
      wrap(analyticsApi.getDashboard(), setAnalytics),
      wrap(governmentApi.getAll(), setGovernmentList),
      wrap(adminManagementApi.getPendingStaff(), setPendingStaff),
      wrap(adminManagementApi.getApprovedStaff(), setApprovedStaff),
      wrap(adminManagementApi.getFinancialHistory(), setPaymentHistory),
      wrap(paymentsApi.getEligible(month), setPendingPayments),
      wrap(attendanceApi.getHighAttendanceReport(month), setHighAttendanceReport),
      wrap(attendanceApi.getAllMonthly(month), setAllMonthlyAttendance),
      wrap(disciplineApi.getMonthlyIssues(month), setMonthlyDiscipline)
    ]);
    setLoading(false);
  };

  const handleApproveStaff = (userId) => {
    adminManagementApi.approveStaff(userId)
      .then((res) => {
        setMessage(res.data.message);
        adminManagementApi.getPendingStaff().then(r => setPendingStaff(r.data));
        adminManagementApi.getApprovedStaff().then(r => setApprovedStaff(r.data));
      })
      .catch(() => setMessage('Failed to approve staff'));
  };

  const handleRejectStaff = (userId) => {
    adminManagementApi.rejectStaff(userId)
      .then((res) => {
        setMessage(res.data.message);
        adminManagementApi.getPendingStaff().then(r => setPendingStaff(r.data));
      })
      .catch(() => setMessage('Failed to reject staff'));
  };

  const handleApprovePayment = async (payment) => {
    setProcessingPaymentId(payment.studentId);
    setMessage('');
    try {
      const res = await paymentsApi.approve({
        studentId: payment.studentId,
        month,
        scholarshipType: payment.scholarshipType
      });
      setMessage(res.data?.message || 'Payment approved successfully');
      await refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to approve payment');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (payment) => {
    if (!payment.paymentId) {
      setMessage('This payment has no pending request to reject yet.');
      return;
    }

    setProcessingPaymentId(payment.studentId);
    setMessage('');
    try {
      const res = await paymentsApi.reject({ paymentId: payment.paymentId });
      setMessage(res.data?.message || 'Payment rejected successfully');
      await refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleBulkApprovePayment = async () => {
    if (!highAttendanceReport.length) return;
    if (!window.confirm(`Approve payments for all ${highAttendanceReport.length} eligible students for ${new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}?`)) return;
    setBulkApprovingPayments(true);
    setMessage('');
    try {
      const requests = highAttendanceReport.map(s => ({
        studentId: s.studentId,
        month,
        scholarshipType: s.scholarshipType
      }));
      const res = await paymentsApi.bulkApprove(requests);
      setMessage(res.data?.message || 'Bulk payment approval completed.');
      await refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Bulk payment approval failed.');
    } finally {
      setBulkApprovingPayments(false);
    }
  };

  const [processingProvision, setProcessingProvision] = useState(false);
  
  const handleProvisionAccount = async (e) => {
    e.preventDefault();
    if (!provisionEmail || !selectedProvisionStudent) return;
    
    setProcessingProvision(true);
    setMessage('');
    try {
      // Use id or Id to be safe
      const govId = selectedProvisionStudent.id || selectedProvisionStudent.Id;
      const res = await adminManagementApi.provisionAccount(govId, provisionEmail);
      
      setMessage(`Success: ${res.data.message}`);
      setShowProvisionModal(false);
      setProvisionEmail('');
      setSelectedProvisionStudent(null);
      // Refresh list
      governmentApi.getAll().then(r => setGovernmentList(r.data));
    } catch (err) {
      console.error('Provisioning failed:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to provision account';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setProcessingProvision(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreatingStaff(true);
    try {
      const staffToCreate = { ...newStaff };
      if (staffToCreate.role === 'Counselor') {
        staffToCreate.department = 'All Departments';
      }
      const res = await adminManagementApi.createStaff(staffToCreate);
      setMessage(res.data.message);
      setShowAddStaffModal(false);
      setNewStaff({
        username: '',
        password: '',
        name: '',
        role: 'HOD',
        department: departments[0],
        faculty: ''
      });
      refreshData();
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || 'Failed to create account'}`);
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataArr = new Uint8Array(evt.target.result);
        const wb = XLSX.read(dataArr, { type: 'array' });
        const rawData = wb.SheetNames.flatMap((sheetName) => {
          const ws = wb.Sheets[sheetName];
          return XLSX.utils.sheet_to_json(ws);
        });

        const normalizeKey = (key) => String(key || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

        const readValue = (row, aliases) => {
          const aliasSet = new Set(aliases.map(normalizeKey));
          const entry = Object.entries(row).find(([key]) => aliasSet.has(normalizeKey(key)));
          return entry ? String(entry[1] ?? '').trim() : '';
        };

        const students = rawData.map(row => ({
          registrationNumber: readValue(row, [
            'Registration Number', 'Registration No', 'Reg No', 'RegNumber', 'Index Number', 'Student ID'
          ]),
          nic: readValue(row, ['NIC', 'NIC No', 'National ID', 'National Identity Card']),
          name: readValue(row, ['Name', 'Student Name', 'Full Name']),
          faculty: readValue(row, ['Faculty']),
          department: readValue(row, ['Department']),
          batch: readValue(row, ['Batch']),
          email: readValue(row, ['Email', 'Official Email', 'Mail', 'Student Email']),
          scholarshipType: uploadType === 'Standard' ? null : uploadType
        })).filter(s => s.nic);

        if (students.length === 0) {
          setMessage('No valid student records found. Ensure "NIC" column exists in at least one sheet.');
          return;
        }

        adminManagementApi.bulkAddStudents(students)
          .then((res) => {
            setMessage(`${uploadType} List: ${res.data.message}`);
            setShowList(true);
            governmentApi.getAll().then(r => setGovernmentList(r.data));
          })
          .catch((err) => {
            console.error('Upload error:', err);
            setMessage('Excel upload failed. Server error.');
          });
      } catch (err) {
        console.error('Parsing error:', err);
        setMessage('Failed to parse Excel file. Ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const handleResetSystem = async () => {
    if (!window.confirm('CRITICAL: This will permanently delete all student accounts, government records, and profiles. Are you sure?')) return;
    setLoading(true);
    try {
      await adminManagementApi.resetStudents();
      setMessage('System successfully reset. All student records cleared.');
      await refreshData();
    } catch (err) {
      setMessage('Reset failed: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const [bulkProvisioning, setBulkProvisioning] = useState(false);
  const handleBulkProvision = async (ids) => {
    if (!window.confirm(`Initialize automated provisioning for ${ids.length} students? This will generate accounts and send official emails.`)) return;
    setBulkProvisioning(true);
    try {
      const res = await adminManagementApi.bulkProvision(ids);
      setMessage(res.data.message);
      await refreshData();
    } catch (err) {
      setMessage('Bulk provisioning failed: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setBulkProvisioning(false);
    }
  };

  const [expandedGroup, setExpandedGroup] = useState('students');

  const filteredStudents = useMemo(() => {
    if (!showList) return [];
    
    const filtered = (governmentList || []).filter(s => {
      const matchBatch = !stuFilter.batch || s.batch === stuFilter.batch;
      const matchFaculty = !stuFilter.faculty || s.faculty === stuFilter.faculty;
      const matchType = !stuFilter.type || s.scholarshipType === stuFilter.type;
      return matchBatch && matchFaculty && matchType;
    });
    return filtered;
  }, [governmentList, stuFilter]);

  const batches = useMemo(() => [...new Set(governmentList.map(s => s.batch))].filter(Boolean), [governmentList]);
  const faculties = useMemo(() => [...new Set(governmentList.map(s => s.faculty))].filter(Boolean), [governmentList]);

  if (loading && !analytics && activeTab === 'overview') return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Initializing Admin Intelligence...</p>
    </div>
  );

  const chartData = analytics?.monthlyPayments?.length
    ? analytics.monthlyPayments.map((m) => ({ name: m.type, count: m.count, total: m.total }))
    : [{ name: 'Mahapola', count: 0, total: 0 }, { name: 'Bursary', count: 0, total: 0 }];

  const sidebarGroups = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
      tab: 'overview',
      children: []
    },
    {
      id: 'students',
      label: 'Student Management',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      children: [
        { id: 'students', label: 'MIS Student Registry', icon: '🗂️' },
        { id: 'students_attendance', label: 'Monthly Attendance', icon: '📅' },
        { id: 'students_discipline', label: 'Disciplinary Issues', icon: '⚠️' },
      ]
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      children: [
        { id: 'staff_pending', label: 'Pending Approvals', icon: '⏳' },
        { id: 'staff_active', label: 'Active Staff', icon: '✅' },
        { id: 'staff_create', label: 'Create Account', icon: '➕' },
      ]
    },
    {
      id: 'financial',
      label: 'Financial Operations',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      children: [
        { id: 'financial_eligibility', label: 'Eligibility Board', icon: '🏆' },
        { id: 'financial_history', label: 'Payment History', icon: '📜' },
      ]
    },
  ];

  const SidebarGroup = ({ group }) => {
    const isExpanded = expandedGroup === group.id;
    const isLeaf = group.children.length === 0;
    const isActive = isLeaf ? activeTab === group.tab : group.children.some(c => c.id === activeTab);

    if (isLeaf) {
      return (
        <button
          onClick={() => { setActiveTab(group.tab); setExpandedGroup(group.id); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 w-full text-left ${
            activeTab === group.tab
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <div className={`p-2 rounded-xl transition-colors ${activeTab === group.tab ? 'bg-white/20' : 'bg-slate-100'}`}>{group.icon}</div>
          <span className="font-black text-xs uppercase tracking-widest">{group.label}</span>
        </button>
      );
    }

    return (
      <div>
        <button
          onClick={() => setExpandedGroup(isExpanded ? '' : group.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 w-full text-left ${
            isActive
              ? 'bg-slate-900 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/10' : 'bg-slate-100'}`}>{group.icon}</div>
          <span className="font-black text-xs uppercase tracking-widest flex-grow">{group.label}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-white/60' : 'text-slate-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-3">
            {group.children.map(child => (
              <button
                key={child.id}
                onClick={() => setActiveTab(child.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 w-full text-left ${
                  activeTab === child.id
                    ? 'bg-primary-50 text-primary-700 font-black shadow-sm border border-primary-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">{child.icon}</span>
                <span className="font-bold text-[11px] uppercase tracking-wider">{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-fade-in pb-12">
      {/* Sidebar Navigation */}
      <aside className="lg:w-72 flex-shrink-0 space-y-4">
        <div className="bg-white p-4 rounded-[2.5rem] shadow-glass border border-slate-100 space-y-1.5">
          {sidebarGroups.map(group => <SidebarGroup key={group.id} group={group} />)}
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4">Governance Mode</h4>
          <p className="text-sm font-bold leading-relaxed mb-6">You are operating with full administrative privileges.</p>
          <Link to="/admin/audit" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 transition-colors">
            Audit Intelligence
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'System Analytics'}
              {['students', 'students_attendance', 'students_discipline'].includes(activeTab) && 'Student Management'}
              {['staff', 'staff_pending', 'staff_active', 'staff_create'].includes(activeTab) && 'Staff Management'}
              {['financial', 'financial_eligibility', 'financial_history'].includes(activeTab) && 'Financial Operations'}
            </h1>
            <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
              {activeTab === 'overview' && 'Global System Performance & disbursement Intelligence'}
              {['students', 'students_attendance', 'students_discipline'].includes(activeTab) && 'Bulk Authorization, Attendance & Conduct Monitoring'}
              {['staff', 'staff_pending', 'staff_active', 'staff_create'].includes(activeTab) && 'Administrative Personnel Approval & Directory'}
              {['financial', 'financial_eligibility', 'financial_history'].includes(activeTab) && 'Payment Processing & Transaction Lifecycle History'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={refreshData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Sync Data
            </button>
            {message && (
              <div className={`${message.startsWith('Error') ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} px-6 py-3 rounded-2xl animate-slide-up flex items-center gap-3 shadow-sm border`}>
                <div className={`w-2 h-2 ${message.startsWith('Error') ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full animate-pulse`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { label: 'Mahapola Base', val: analytics?.totalMahapolaStudents, color: 'bg-primary-100/50' },
                { label: 'Bursary Base', val: analytics?.totalBursaryStudents, color: 'bg-indigo-100/50' },
                { label: 'Total Workforce', val: analytics?.totalStudents, color: 'bg-violet-100/50' },
                { label: 'System Rejections', val: analytics?.rejectionCount, color: 'bg-red-100/30', text: 'text-red-600' }
              ].map((card, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] shadow-glass border border-slate-100 card-hover group relative overflow-hidden">
                  <div className={`absolute -right-6 -top-6 w-24 h-24 ${card.color} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700`}></div>
                  <div className="relative z-10">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{card.label}</h3>
                    <p className={`text-4xl font-black ${card.text || 'text-slate-900'} tracking-tighter`}>{card.val ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  </div>
                  Financial Disbursement Matrix
                </h3>
              </header>
              <div className="p-10 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontWeight: 800, fontSize: 10}} dy={15} />
                    <YAxis yAxisId="left" orientation="left" stroke="#6366F1" axisLine={false} tickLine={false} tick={{fill: '#6366F1', fontWeight: 800, fontSize: 10}} dx={-15} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontWeight: 800, fontSize: 10}} dx={15} />
                    <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                    <Bar yAxisId="left" dataKey="total" fill="#6366F1" name="Volume (Rs)" radius={[10, 10, 0, 0]} maxBarSize={60} />
                    <Bar yAxisId="right" dataKey="count" fill="#CBD5E1" name="Transaction Count" radius={[10, 10, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* --- STAFF MANAGEMENT TABS --- */}
        {['staff_pending', 'staff_active', 'staff_create'].includes(activeTab) && (
          <div className="space-y-10">
            {/* Create Account button - shown on all staff views */}
            {activeTab === 'staff_create' && (
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowAddStaffModal(true)}
                  className="flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-sm hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                  Provision HOD / Counselor
                </button>
              </div>
            )}
            {/* Pending Approvals - only shown on staff_pending */}
            {activeTab === 'staff_pending' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                  Pending Authorization Requests
                </h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Applicant</th><th className="px-8 py-5">Role / Location</th><th className="px-8 py-5 text-right">Governance Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingStaff.length === 0 ? (
                      <tr><td colSpan="3" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No pending requests</td></tr>
                    ) : (
                      pendingStaff.map(s => (
                        <tr key={s.userId} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">@{s.username}</p></td>
                          <td className="px-8 py-6"><span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 mr-3">{s.role}</span><span className="text-xs font-bold text-slate-500">{s.faculty}</span></td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => handleApproveStaff(s.userId)} className="h-10 px-5 bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600">Approve</button>
                              <button onClick={() => handleRejectStaff(s.userId)} className="h-10 px-5 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 hover:bg-black">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            )}

            {/* Approved Staff Directory - only shown on staff_active */}
            {activeTab === 'staff_active' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  Authorized Staff Directory
                </h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Personnel</th><th className="px-8 py-5">Faculty / Dept</th><th className="px-8 py-5 text-right">Access Level</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {approvedStaff.map(s => (
                      <tr key={s.userId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">@{s.username}</p></td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold text-slate-600">{s.faculty || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{s.department}</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.role === 'HOD' ? 'bg-primary-50 text-primary-600 border border-primary-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                              {s.role} Personnel
                            </span>
                            {s.role === 'HOD' && (
                              <select 
                                className="text-[9px] font-black uppercase bg-slate-50 border-none rounded-lg px-2 py-1 text-slate-400 hover:text-primary-600 cursor-pointer outline-none"
                                onChange={async (e) => {
                                  if (!e.target.value) return;
                                  try {
                                    await adminManagementApi.updateStaffDepartment(s.userId, e.target.value);
                                    setMessage(`Updated department for ${s.name}`);
                                    await refreshData();
                                  } catch (err) {
                                    setMessage('Update failed');
                                  }
                                }}
                                value={s.department || ''}
                              >
                                <option value="">Assign Dept...</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
         </div>
        )}

        {/* --- STUDENT MANAGEMENT TABS --- */}
        {['students', 'students_attendance', 'students_discipline'].includes(activeTab) && (
          <div className="space-y-10">
            {/* Excel Upload Card - Only on MIS Registry sub-tab */}
            {activeTab === 'students' && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-glass border border-slate-100 relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-100 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-xl">
                  <h3 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">Bulk MIS Student Onboarding</h3>
                  <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">Authorize thousands of students instantly by uploading a standardized Excel dataset.</p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-full sm:w-64">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-3">Upload Category</label>
                      <select 
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                      >
                        <option value="Standard">Standard List</option>
                        <option value="Mahapola">Mahapola Confirm List</option>
                        <option value="Bursary">Bursery Confirm List</option>
                      </select>
                    </div>
                    <label className="flex-grow w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl cursor-pointer hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95 group/btn">
                      <svg className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      <span className="text-xs font-black uppercase tracking-widest">Select Excel Data</span>
                      <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleExcelUpload} />
                    </label>
                  </div>
                </div>
                <div className="hidden lg:block border-l border-slate-100 pl-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-[180px]">
                    Intelligence Engine will automatically sync and map your dataset to the registry.
                  </p>
                </div>
              </div>
            </div>

            )}

            {/* Advanced Filtering - Only on MIS Registry sub-tab */}
            {activeTab === 'students' && (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-glass border border-slate-100">
              <h3 className="font-black text-xl text-slate-900 mb-8 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                </div>
                Registry Intelligent Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Batch</label>
                  <select value={stuFilter.batch} onChange={e => setStuFilter({...stuFilter, batch: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-primary-500 shadow-sm transition-all appearance-none">
                    <option value="">All Batches</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faculty Filter</label>
                  <select value={stuFilter.faculty} onChange={e => setStuFilter({...stuFilter, faculty: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-primary-500 shadow-sm transition-all appearance-none">
                    <option value="">All Faculties</option>
                    {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scholarship Status</label>
                  <select 
                    value={stuFilter.type}
                    onChange={(e) => setStuFilter({...stuFilter, type: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary-500/10 transition-all cursor-pointer"
                  >
                    <option value="">All Candidates</option>
                    <option value="Mahapola">Mahapola Confirmed</option>
                    <option value="Bursary">Bursery Confirmed</option>
                  </select>
                </div>
              </div>
              <div className="mt-10 flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl text-white animate-pulse">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Result Set Size</p>
                    <p className="text-xl font-black">{filteredStudents.length} Students Matching</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleResetSystem} className="px-6 py-3 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-rose-400">Clear All Records</button>
                  <button onClick={() => { setStuFilter({batch:'', faculty:'', type: ''}); setShowList(false); }} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Collapse View</button>
                  {!showList && <button onClick={() => setShowList(true)} className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Show Registry</button>}
                </div>
              </div>
            </div>

            )}

            {/* Ragging/Discipline Table - Only on students_discipline sub-tab */}
            {activeTab === 'students_discipline' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden mb-10">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    Disciplinary Issues (Ragging) for {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Target Month</span>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} min={new Date().toISOString().slice(0, 7)} max={new Date().toISOString().slice(0, 7)} className="bg-transparent border-none text-slate-900 font-bold focus:outline-none p-0 text-sm" />
                  </div>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Profile</th><th className="px-8 py-5">Department</th><th className="px-8 py-5">Batch</th><th className="px-8 py-5">Issue Description</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyDiscipline.length === 0 ? (
                      <tr><td colSpan="4" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No disciplinary issues recorded for this month</td></tr>
                    ) : (
                      monthlyDiscipline.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{d.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{d.registrationNumber}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">{d.department}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">Batch {d.batch}</p></td>
                          <td className="px-8 py-6"><span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-black bg-rose-50 text-rose-600 border border-rose-100">{d.description}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Monthly Attendance Registry - Only on students_attendance sub-tab */}
            {activeTab === 'students_attendance' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden mb-10">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    Monthly Attendance Overview ({new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                  </h3>
                  <div className="flex items-center gap-4">
                    <select 
                      value={stuFilter.faculty} 
                      onChange={e => setStuFilter({...stuFilter, faculty: e.target.value})} 
                      className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none text-sm shadow-sm cursor-pointer"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      value={stuFilter.batch} 
                      onChange={e => setStuFilter({...stuFilter, batch: e.target.value})} 
                      className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none text-sm shadow-sm cursor-pointer"
                    >
                      <option value="">All Batches</option>
                      {batches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Profile</th><th className="px-8 py-5">Department</th><th className="px-8 py-5">Batch</th><th className="px-8 py-5 text-right">Attendance %</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allMonthlyAttendance
                      .filter(a => (!stuFilter.faculty || a.department === stuFilter.faculty) && (!stuFilter.batch || a.batch === stuFilter.batch))
                      .length === 0 ? (
                      <tr><td colSpan="4" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No attendance records uploaded for this criteria</td></tr>
                    ) : (
                      allMonthlyAttendance
                        .filter(a => (!stuFilter.faculty || a.department === stuFilter.faculty) && (!stuFilter.batch || a.batch === stuFilter.batch))
                        .map((a, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{a.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{a.registrationNumber}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">{a.department}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">Batch {a.batch}</p></td>
                          <td className="px-8 py-6 text-right">
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${a.percentage >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {a.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            )}

            {/* MIS Registry Table - Only on students sub-tab */}
            {activeTab === 'students' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                    </div>
                    {stuFilter.type === 'Mahapola' ? 'Mahapola Confirmation Board' : stuFilter.type === 'Bursary' ? 'Bursary Confirmation Board' : 'MIS Student Access Registry'}
                  </h3>
                  
                  {stuFilter.type && filteredStudents.some(s => s.status !== 'Provisioned') && (
                    <button 
                      onClick={() => handleBulkProvision(filteredStudents.filter(s => s.status !== 'Provisioned').map(s => s.id))}
                      disabled={bulkProvisioning}
                      className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      {bulkProvisioning ? 'Processing...' : `Bulk Approve & Provision ${stuFilter.type} List`}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                  )}
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Registration / NIC</th><th className="px-8 py-5">Academic Profile</th><th className="px-8 py-5">Batch</th><th className="px-8 py-5">Type</th><th className="px-8 py-5 text-right">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Please select a Batch or Faculty to view the student registry</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Reg: {s.registrationNumber || 'N/A'} | NIC: {s.nic}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">{s.faculty}</p><p className="text-[10px] text-slate-400 font-medium">{s.department}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">Batch {s.batch}</p></td>
                          <td className="px-8 py-6">
                            {s.scholarshipType ? (
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.scholarshipType === 'Mahapola' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>
                                {s.scholarshipType}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Unassigned</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === 'Assigned' ? 'bg-blue-50 text-blue-600 border border-blue-100' : s.status === 'Provisioned' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{s.status}</span>
                              {s.scholarshipType && s.status !== 'Provisioned' && (
                                <button 
                                  onClick={() => { setSelectedProvisionStudent(s); setShowProvisionModal(true); setProvisionEmail(''); }}
                                  className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-primary-600 transition-colors"
                                >
                                  Provision
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {/* --- FINANCIAL OPERATIONS TABS --- */}
        {['financial_eligibility', 'financial_history'].includes(activeTab) && (
          <div className="space-y-10">
            {/* HOD Submissions Eligibility Board - Only on financial_eligibility */}
            {activeTab === 'financial_eligibility' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  Mahapola / Bursary eligible list for this month ({new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Cycle Target</span>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent border-none text-slate-900 font-bold focus:outline-none p-0 text-sm" />
                  </div>
                  {highAttendanceReport.length > 0 && (
                    <button
                      onClick={handleBulkApprovePayment}
                      disabled={bulkApprovingPayments}
                      className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                      {bulkApprovingPayments ? (
                        <><svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Processing...</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> Approve All ({highAttendanceReport.length})</>
                      )}
                    </button>
                  )}
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Profile</th><th className="px-8 py-5">Academic Details</th><th className="px-8 py-5">Scholarship</th><th className="px-8 py-5 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {highAttendanceReport.length === 0 ? (
                      <tr><td colSpan="4" className="px-8 py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No pending eligible submissions for this cycle</td></tr>
                    ) : (
                      highAttendanceReport.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{s.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{s.registrationNumber} | {s.nic}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-slate-600">{s.faculty}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{s.department} | Batch {s.batch}</p></td>
                          <td className="px-8 py-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.scholarshipType === 'Mahapola' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-violet-50 text-violet-600 border border-violet-100'}`}>{s.scholarshipType}</span></td>

                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => handleApprovePayment({ studentId: s.studentId, scholarshipType: s.scholarshipType })}
                              disabled={processingPaymentId === s.studentId}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                            >
                              {processingPaymentId === s.studentId ? 'Processing...' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            )}

            {/* Financial History Registry - Only on financial_history */}
            {activeTab === 'financial_history' && (
            <div className="bg-white rounded-[2.5rem] shadow-glass border border-slate-100 overflow-hidden">
              <header className="p-8 border-b border-slate-50 bg-slate-50/20">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  Financial Transaction Lifecycle History
                </h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-black bg-slate-50">
                    <tr><th className="px-8 py-5">Personnel</th><th className="px-8 py-5">Context</th><th className="px-8 py-5 text-right">Volume (Rs)</th><th className="px-8 py-5 text-center">Timeline</th><th className="px-8 py-5 text-right">Verification</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paymentHistory.map(h => (
                      <tr key={h.paymentId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6"><p className="font-black text-slate-900 leading-tight">{h.studentName}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{h.registrationNumber || h.nic || 'N/A'}</p></td>
                        <td className="px-8 py-6"><p className="text-xs font-black text-slate-900">{h.scholarshipType}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{h.month}</p></td>
                        <td className="px-8 py-6 text-right font-black text-slate-900">Rs {h.amount.toLocaleString()}</td>
                        <td className="px-8 py-6 text-center text-[10px] font-bold text-slate-400">{new Date(h.processedAt).toLocaleString()}</td>
                        <td className="px-8 py-6 text-right"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100`}>{h.paymentStatus}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}
      </main>

      {/* Provisioning Modal */}
      {showProvisionModal && selectedProvisionStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 bg-primary-600 text-white">
              <h3 className="text-2xl font-black tracking-tight">Provision Account</h3>
              <p className="text-primary-100 text-[10px] font-bold uppercase tracking-widest mt-1">Generate official system access</p>
            </div>
            <form onSubmit={handleProvisionAccount} className="p-8 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-black text-slate-900">{selectedProvisionStudent.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">NIC: {selectedProvisionStudent.nic} • {selectedProvisionStudent.scholarshipType}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Student Official Email</label>
                <input 
                  type="email"
                  required
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                />
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed mt-2 px-1">
                  A secure temporary password will be generated and emailed to this address automatically.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-sm tracking-tight hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processingProvision}
                  className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-black text-sm tracking-tight hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingProvision && <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
                  {processingProvision ? 'Provisioning...' : 'Provision & Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 bg-slate-900 text-white">
              <h3 className="text-2xl font-black tracking-tight">Provision Department Account</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Authorized personnel access creation</p>
            </div>
            <form onSubmit={handleCreateStaff} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input type="text" required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Role</label>
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none transition-all">
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="Counselor">Student Counselor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Username / Reg No</label>
                  <input type="text" required value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Initial Password</label>
                  <input type="password" required value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Department</label>
                <select 
                  disabled={newStaff.role === 'Counselor'}
                  value={newStaff.role === 'Counselor' ? '' : newStaff.department} 
                  onChange={e => setNewStaff({...newStaff, department: e.target.value})} 
                  className={`w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none transition-all ${newStaff.role === 'Counselor' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {newStaff.role === 'Counselor' ? <option value="">General Access (All Departments)</option> : departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddStaffModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-sm tracking-tight hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={creatingStaff} className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-black text-sm tracking-tight hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {creatingStaff ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
