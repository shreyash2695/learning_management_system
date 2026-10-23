import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Award, 
  Trophy, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Database,
  UserCheck,
  Users,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  Send,
  MessageSquare,
  Layers,
  GraduationCap,
  Filter,
  X,
  Search,
  Bell,
  BellRing,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  ClipboardList
} from 'lucide-react';
import { lmsApi, crudApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import SubmissionContentRenderer from '../components/common/SubmissionContentRenderer';

function formatNotificationMessage(msg) {
  if (!msg) return '';
  if (typeof msg === 'string' && msg.startsWith('[PROCTOR_MEET]')) {
    try {
      const data = JSON.parse(msg.replace(/^\[PROCTOR_MEET\]/, ''));
      if (data.initiated_by === 'PROCTOR') {
        return `Mentorship Summon: Meeting with ${data.student_name || 'ward'} scheduled on ${data.scheduled_time || data.preferred_time} at ${data.venue || 'Cabin 401'} (Topic: ${data.topic}).`;
      }
      return `Mentorship Request: ${data.student_name || 'Student'} requested a meeting regarding "${data.topic}" (Preferred: ${data.preferred_time || data.scheduled_time}).`;
    } catch {
      return msg.replace(/^\[PROCTOR_MEET\]/, '');
    }
  }
  return msg;
}

// ==========================================
// 1. ADMINISTRATOR DASHBOARD COMPONENT
// The admin checks everything and has details of everybody
// ==========================================
function AdminDashboard({ data = {} }) {
  const { metrics = {}, allStudents = [], allInstructors = [], allProctors = [], recentSubmissions = [], coursesSummary = [] } = data || {};
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'students', 'by-subject', 'by-proctor', 'faculty', 'submissions', 'requests'
  const [adminTab, setAdminTab] = useState(() => searchParams.get('tab') || 'students');

  // Master Roster Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [selectedProctorFilter, setSelectedProctorFilter] = useState('ALL');
  const [studentSearch, setStudentSearch] = useState('');

  // By-Subject drilldown state
  const [activeSubjectId, setActiveSubjectId] = useState(() => {
    const fromParam = searchParams.get('subjectId');
    if (fromParam) return Number(fromParam);
    return coursesSummary[0]?.course_id || null;
  });
  const [subjectStudentSearch, setSubjectStudentSearch] = useState('');

  // By-Proctor drilldown state
  const [activeProctorId, setActiveProctorId] = useState(() => {
    const fromParam = searchParams.get('proctorId');
    if (fromParam) return Number(fromParam);
    return allProctors[0]?.proctor_id || null;
  });
  const [proctorWardSearch, setProctorWardSearch] = useState('');

  // Enrollment Requests state
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState(null);

  // Sync tab/subjectId/proctorId from URL parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['students', 'by-subject', 'by-proctor', 'faculty', 'submissions', 'requests'].includes(tabParam)) {
      setAdminTab(tabParam);
    }
    const subjParam = searchParams.get('subjectId');
    if (subjParam) setActiveSubjectId(Number(subjParam));
    const procParam = searchParams.get('proctorId');
    if (procParam) setActiveProctorId(Number(procParam));
  }, [searchParams]);

  // Load enrollment requests whenever the requests tab is opened
  useEffect(() => {
    if (adminTab === 'requests') {
      setRequestsLoading(true);
      lmsApi.getEnrollmentRequests()
        .then(res => setEnrollmentRequests(res.requests || []))
        .catch(err => console.error('Failed to load requests:', err))
        .finally(() => setRequestsLoading(false));
    }
  }, [adminTab]);

  // Also pre-load on mount to show badge count
  useEffect(() => {
    lmsApi.getEnrollmentRequests()
      .then(res => setEnrollmentRequests(res.requests || []))
      .catch(() => {});
  }, []);

  const handleApproveRequest = async (requestId, action, notes = '') => {
    try {
      const res = await lmsApi.approveEnrollmentRequest(requestId, action, notes);
      setApprovalNotice({ type: 'success', message: res.message });
      // Refresh the list
      const updated = await lmsApi.getEnrollmentRequests();
      setEnrollmentRequests(updated.requests || []);
    } catch (err) {
      setApprovalNotice({ type: 'error', message: err.message });
    }
    setTimeout(() => setApprovalNotice(null), 4000);
  };

  // Master roster filtered students
  const filteredMasterStudents = allStudents.filter((st) => {
    const matchesSearch = !studentSearch || 
      `${st.first_name} ${st.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (st.email && st.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
      String(st.student_id).includes(studentSearch);

    const matchesCourse = selectedCourseFilter === 'ALL' || 
      (st.enrolled_course_ids && st.enrolled_course_ids.split(',').map(s => s.trim()).includes(String(selectedCourseFilter)));

    const matchesProctor = selectedProctorFilter === 'ALL' || 
      String(st.proctor_id) === String(selectedProctorFilter);

    return matchesSearch && matchesCourse && matchesProctor;
  });

  // Selected course object for By-Subject view
  const currentSubject = coursesSummary.find(c => c.course_id === activeSubjectId) || coursesSummary[0];
  const subjectStudents = currentSubject?.enrolled_students || [];
  const filteredSubjectStudents = subjectStudents.filter((st) => {
    if (!subjectStudentSearch) return true;
    const s = subjectStudentSearch.toLowerCase();
    return `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
           (st.email && st.email.toLowerCase().includes(s)) ||
           String(st.student_id).includes(s);
  });

  // Selected proctor object for By-Proctor view
  const currentProctor = allProctors.find(p => p.proctor_id === activeProctorId) || allProctors[0];
  const proctorWards = currentProctor?.wards || [];
  const filteredProctorWards = proctorWards.filter((st) => {
    if (!proctorWardSearch) return true;
    const s = proctorWardSearch.toLowerCase();
    return `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
           (st.email && st.email.toLowerCase().includes(s)) ||
           String(st.student_id).includes(s);
  });

  const clearMasterFilters = () => {
    setSelectedCourseFilter('ALL');
    setSelectedProctorFilter('ALL');
    setStudentSearch('');
  };

  const handleSelectSubject = (courseId) => {
    setActiveSubjectId(courseId);
    setSubjectStudentSearch('');
    setAdminTab('by-subject');
  };

  const handleSelectProctor = (proctorId) => {
    setActiveProctorId(proctorId);
    setProctorWardSearch('');
    setAdminTab('by-proctor');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Admin Command Center Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-900 p-8 text-white shadow-xl shadow-purple-900/15">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-200" /> University Administrative Oversight
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 font-bold uppercase tracking-wider">
              System Health: Active
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Administrative Command &amp; Oversight Center 🏛️
          </h1>
          <p className="mt-2 text-sm text-purple-100 leading-relaxed">
            Institutional master control of academic departments, subject enrollments, and student-proctor mentorship allocations. You have complete live oversight of <strong className="text-white font-bold">{metrics.totalStudents} Enrolled Students</strong>, <strong className="text-white font-bold">{metrics.totalInstructors} Faculty Members</strong>, and <strong className="text-white font-bold">{metrics.totalCourses} Academic Subjects</strong> across {metrics.totalDepartments} departments.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/crud"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-900 font-bold text-xs sm:text-sm shadow-md hover:bg-purple-50 transition-transform active:scale-95"
            >
              <Database className="w-4 h-4 text-purple-600" /> Open Database Studio
            </Link>
            <button
              onClick={() => setAdminTab('by-subject')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/40 border border-white/20 text-white hover:bg-purple-900/60 font-bold text-xs sm:text-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Enrolled Students by Subject
            </button>
            <Link
              to="/enrollments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/40 border border-white/20 text-white hover:bg-purple-900/60 font-bold text-xs sm:text-sm transition-colors"
            >
              <Users className="w-4 h-4" /> Student Enrollments &amp; Rosters
            </Link>
            <Link
              to="/proctors"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-900/40 border border-white/20 text-white hover:bg-purple-900/60 font-bold text-xs sm:text-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" /> Faculty Mentorship Wards
            </Link>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 6 Key System Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</div>
          <div className="mt-1 text-2xl font-extrabold text-blue-600">{metrics.totalStudents}</div>
          <div className="text-[10px] text-slate-500 font-medium">Undergraduate roster</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faculty Staff</div>
          <div className="mt-1 text-2xl font-extrabold text-purple-600">{metrics.totalInstructors}</div>
          <div className="text-[10px] text-slate-500 font-medium">Across 5 departments</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proctors / Wards</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">{metrics.totalProctors}</div>
          <div className="text-[10px] text-slate-500 font-medium">Mentorship units</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offered Subjects</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.totalCourses}</div>
          <div className="text-[10px] text-slate-500 font-medium">Curriculum catalog</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Submissions</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600">{metrics.totalSubmissions}</div>
          <div className="text-[10px] text-slate-500 font-medium">Coursework files</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">University CGPA</div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-600">{metrics.averageCgpa}</div>
          <div className="text-[10px] text-slate-500 font-medium">Aggregate average</div>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Institutional Master Records &amp; Student Cohorts</h2>
            <p className="text-xs text-slate-500">Examine students by subject enrollment, faculty proctor assignment, or master university rosters</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setAdminTab('students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                adminTab === 'students' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 All Students ({allStudents.length})
            </button>
            <button
              onClick={() => setAdminTab('by-subject')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                adminTab === 'by-subject' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📚 By Subject / Course
            </button>
            <button
              onClick={() => setAdminTab('by-proctor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                adminTab === 'by-proctor' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛡️ By Faculty Proctor
            </button>
            <button
              onClick={() => setAdminTab('faculty')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                adminTab === 'faculty' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍🏫 Faculty ({allInstructors.length})
            </button>
            <button
              onClick={() => setAdminTab('submissions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                adminTab === 'submissions' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 Submissions ({recentSubmissions.length})
            </button>
            <button
              onClick={() => setAdminTab('requests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                adminTab === 'requests' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Enrollment Requests
              {enrollmentRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {enrollmentRequests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ==========================================
            TAB 1: ALL STUDENTS MASTER ROSTER WITH SUBJECT & PROCTOR FILTERS
            ========================================== */}
        {adminTab === 'students' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Subject Filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="ALL">All Subjects ({coursesSummary.length})</option>
                    {coursesSummary.map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_name} (Code #{c.course_id} - {c.student_count || 0} students)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proctor Filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <select
                    value={selectedProctorFilter}
                    onChange={(e) => setSelectedProctorFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="ALL">All Faculty Proctors ({allProctors.length})</option>
                    {allProctors.map((p) => (
                      <option key={p.proctor_id} value={p.proctor_id}>
                        Prof. {p.first_name} {p.last_name} (Unit #{p.proctor_id} - {p.ward_count || 0} wards)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search & Clear */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, email, ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                {(selectedCourseFilter !== 'ALL' || selectedProctorFilter !== 'ALL' || studentSearch) && (
                  <button
                    onClick={clearMasterFilters}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors shrink-0 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(selectedCourseFilter !== 'ALL' || selectedProctorFilter !== 'ALL') && (
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-bold text-slate-500">Active Criteria:</span>
                {selectedCourseFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                    Subject: {coursesSummary.find(c => String(c.course_id) === String(selectedCourseFilter))?.course_name}
                    <button onClick={() => setSelectedCourseFilter('ALL')} className="hover:text-indigo-950 font-bold ml-1">✕</button>
                  </span>
                )}
                {selectedProctorFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                    Proctor: Prof. {allProctors.find(p => String(p.proctor_id) === String(selectedProctorFilter))?.first_name} {allProctors.find(p => String(p.proctor_id) === String(selectedProctorFilter))?.last_name}
                    <button onClick={() => setSelectedProctorFilter('ALL')} className="hover:text-emerald-950 font-bold ml-1">✕</button>
                  </span>
                )}
                <span className="text-slate-400 font-medium ml-auto">
                  Displaying {filteredMasterStudents.length} of {allStudents.length} Students
                </span>
              </div>
            )}

            {/* Students Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5">DOB</th>
                    <th className="px-6 py-3.5">Assigned Proctor (1-to-1)</th>
                    <th className="px-6 py-3.5">Enrolled Subjects</th>
                    <th className="px-6 py-3.5">CGPA</th>
                    <th className="px-6 py-3.5">Dept Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {filteredMasterStudents.map((st) => (
                    <tr key={st.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold shadow-xs">
                          {st.first_name[0]}
                        </div>
                        <div>
                          <div>{st.first_name} {st.last_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{st.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">#{st.student_id}</td>
                      <td className="px-6 py-4 text-slate-600">{st.dob}</td>
                      <td className="px-6 py-4">
                        {st.proctor_first ? (
                          <button
                            onClick={() => handleSelectProctor(st.proctor_id)}
                            className="text-left group"
                            title="Click to view all wards under this proctor"
                          >
                            <span className="font-semibold text-emerald-800 group-hover:underline flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Prof. {st.proctor_first} {st.proctor_last}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">Cabin {st.proctor_cabin}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {st.enrolled_course_names ? (
                            st.enrolled_course_names.split(',').map((cname, idx) => {
                              const cid = st.enrolled_course_ids ? st.enrolled_course_ids.split(',')[idx]?.trim() : null;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => cid && handleSelectSubject(Number(cid))}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold transition-colors"
                                  title="Click to view all students in this subject"
                                >
                                  {cname.trim()}
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No enrollments</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-blue-600">
                        {st.cgpa ? Number(st.cgpa).toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={st.leaderboard_position === 1 ? 'purple' : 'slate'}>
                          #{st.leaderboard_position || 1}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {filteredMasterStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                        No students found matching your selected subject or proctor filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: ENROLLED STUDENTS BY SUBJECT / COURSE
            ========================================== */}
        {adminTab === 'by-subject' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Subjects Picker */}
              <div className="lg:col-span-1 space-y-2">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Select Academic Subject
                </p>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {coursesSummary.map((c) => {
                    const isSelected = c.course_id === currentSubject?.course_id;
                    return (
                      <button
                        key={c.course_id}
                        onClick={() => {
                          setActiveSubjectId(c.course_id);
                          setSubjectStudentSearch('');
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            #{c.course_id} • {c.dept_name}
                          </div>
                          <div className="font-extrabold text-xs truncate mt-0.5">
                            {c.course_name}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.student_count || 0} Enrolled
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Subject Enrolled Students Roster */}
              <div className="lg:col-span-3 space-y-4">
                {currentSubject ? (
                  <>
                    {/* Subject Header Card */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                      <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider mb-2">
                          <BookOpen className="w-3 h-3 text-indigo-300" /> Subject Code #{currentSubject.course_id} • {currentSubject.dept_name}
                        </div>
                        <h3 className="text-xl font-extrabold tracking-tight">
                          {currentSubject.course_name}
                        </h3>
                        <p className="text-xs text-indigo-200 mt-1">
                          Assigned Faculty Lead: <strong>{currentSubject.instructors ? `Prof. ${currentSubject.instructors}` : 'Staff Faculty'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md text-center">
                          <div className="text-xl font-extrabold">{currentSubject.student_count || 0}</div>
                          <div className="text-[10px] text-indigo-200 font-bold uppercase">Enrolled Students</div>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md text-center">
                          <div className="text-xl font-extrabold">{currentSubject.module_count || 0}</div>
                          <div className="text-[10px] text-indigo-200 font-bold uppercase">Modules</div>
                        </div>
                      </div>
                    </div>

                    {/* Search & Enrolled Roster */}
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Enrolled Students Cohort ({filteredSubjectStudents.length})
                      </h4>
                      <div className="relative w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter enrolled students..."
                          value={subjectStudentSearch}
                          onChange={(e) => setSubjectStudentSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Student Name</th>
                            <th className="px-5 py-3">Student ID</th>
                            <th className="px-5 py-3">DOB</th>
                            <th className="px-5 py-3">CGPA</th>
                            <th className="px-5 py-3">Assigned Faculty Proctor</th>
                            <th className="px-5 py-3">Registration Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                          {filteredSubjectStudents.map((st) => (
                            <tr key={st.student_id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                  {st.first_name[0]}
                                </div>
                                <div>
                                  <div>{st.first_name} {st.last_name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{st.email}</div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-700">#{st.student_id}</td>
                              <td className="px-5 py-3.5 text-slate-600">{st.dob || 'N/A'}</td>
                              <td className="px-5 py-3.5 font-extrabold text-blue-600">
                                {st.cgpa ? Number(st.cgpa).toFixed(2) : 'N/A'}
                              </td>
                              <td className="px-5 py-3.5">
                                {st.proctor_first ? (
                                  <button
                                    onClick={() => handleSelectProctor(st.proctor_id)}
                                    className="text-left group text-emerald-800 font-semibold"
                                  >
                                    <div className="group-hover:underline flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      Prof. {st.proctor_first} {st.proctor_last}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-normal">Cabin {st.proctor_cabin}</div>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">Unassigned</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 font-mono">
                                {st.enrollment_date || 'Fall 2026'}
                              </td>
                            </tr>
                          ))}

                          {filteredSubjectStudents.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs">
                                No students currently enrolled in this subject matching your query.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400">Select a subject to inspect enrolled students.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: STUDENT WARDS BY FACULTY PROCTOR
            ========================================== */}
        {adminTab === 'by-proctor' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Proctors Picker */}
              <div className="lg:col-span-1 space-y-2">
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Select Faculty Mentor
                </p>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {allProctors.map((p) => {
                    const isSelected = p.proctor_id === currentProctor?.proctor_id;
                    return (
                      <button
                        key={p.proctor_id}
                        onClick={() => {
                          setActiveProctorId(p.proctor_id);
                          setProctorWardSearch('');
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                            Mentor #{p.proctor_id} • Cabin {p.cabin_no}
                          </div>
                          <div className="font-extrabold text-xs truncate mt-0.5">
                            Prof. {p.first_name} {p.last_name}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.ward_count || 0} Wards
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Proctor Wards Roster */}
              <div className="lg:col-span-3 space-y-4">
                {currentProctor ? (
                  <>
                    {/* Proctor Header Card */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                      <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider mb-2">
                          <ShieldCheck className="w-3 h-3 text-emerald-300" /> Dedicated Faculty Mentor Unit #{currentProctor.proctor_id}
                        </div>
                        <h3 className="text-xl font-extrabold tracking-tight">
                          Prof. {currentProctor.first_name} {currentProctor.last_name}
                        </h3>
                        <p className="text-xs text-emerald-100 mt-1 flex flex-wrap items-center gap-4">
                          <span>Cabin: <strong>{currentProctor.cabin_no} (Proctor Wing)</strong></span>
                          <span>Emergency Hotline: <strong>{currentProctor.phone_numbers || '9876543210'}</strong></span>
                        </p>
                      </div>

                      <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md text-center shrink-0">
                        <div className="text-2xl font-extrabold">{currentProctor.ward_count || 0}</div>
                        <div className="text-[10px] text-emerald-200 font-bold uppercase">Allocated Wards</div>
                      </div>
                    </div>

                    {/* Mentorship Regulation Notice */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>1-to-1 Mentorship Policy:</strong> These undergraduate student wards are exclusively assigned to Prof. {currentProctor.first_name} {currentProctor.last_name} for academic guidance, attendance monitoring, and clearance.
                      </span>
                    </div>

                    {/* Search & Wards Roster */}
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Assigned Student Wards ({filteredProctorWards.length})
                      </h4>
                      <div className="relative w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter student wards..."
                          value={proctorWardSearch}
                          onChange={(e) => setProctorWardSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Ward Name</th>
                            <th className="px-5 py-3">Student ID</th>
                            <th className="px-5 py-3">DOB</th>
                            <th className="px-5 py-3">CGPA</th>
                            <th className="px-5 py-3">Rank</th>
                            <th className="px-5 py-3">Enrolled Subjects</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                          {filteredProctorWards.map((st) => (
                            <tr key={st.student_id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                  {st.first_name[0]}
                                </div>
                                <div>
                                  <div>{st.first_name} {st.last_name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{st.email}</div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-700">#{st.student_id}</td>
                              <td className="px-5 py-3.5 text-slate-600">{st.dob || 'N/A'}</td>
                              <td className="px-5 py-3.5 font-extrabold text-blue-600">
                                {st.cgpa ? Number(st.cgpa).toFixed(2) : 'N/A'}
                              </td>
                              <td className="px-5 py-3.5">
                                <Badge variant={st.leaderboard_position === 1 ? 'purple' : 'slate'}>
                                  #{st.leaderboard_position || 1}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {st.enrolled_course_names ? (
                                    st.enrolled_course_names.split(',').map((cname, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                                      >
                                        {cname.trim()}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">No active courses</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}

                          {filteredProctorWards.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs">
                                No student wards currently allocated to this proctor matching your search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400">Select a faculty mentor to inspect student wards.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: ALL FACULTY MEMBERS
            ========================================== */}
        {adminTab === 'faculty' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Faculty Member</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Cabin Number</th>
                  <th className="px-6 py-3.5">Official Email</th>
                  <th className="px-6 py-3.5">Contact Number</th>
                  <th className="px-6 py-3.5">Assigned Subject(s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {allInstructors.map((i) => (
                  <tr key={i.instructor_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shadow-xs">
                        {i.first_name[0]}
                      </div>
                      <div>
                        <div>Prof. {i.first_name} {i.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">ID: #{i.instructor_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="purple">{i.dept_name}</Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{i.cabin_no}</td>
                    <td className="px-6 py-4 text-blue-600">{i.email}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{i.phone_numbers || 'N/A'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{i.course_taught || 'General'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB 5: UNIVERSITY SUBMISSIONS FEED
            ========================================== */}
        {adminTab === 'submissions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Student Submitter</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Assignment</th>
                  <th className="px-6 py-3.5">Marks Allocated</th>
                  <th className="px-6 py-3.5">Submission Date</th>
                  <th className="px-6 py-3.5">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentSubmissions.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {sub.first_name} {sub.last_name}
                      <span className="block text-[10px] text-slate-400 font-normal">ID: #{sub.student_id}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{sub.course_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{sub.assignment_name}</td>
                    <td className="px-6 py-4 font-extrabold text-blue-600">{sub.marks} Marks</td>
                    <td className="px-6 py-4 text-slate-600">{sub.submission_date}</td>
                    <td className="px-6 py-4">
                      <Badge variant="green" className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Logged in Database
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB 6: ENROLLMENT REQUESTS
            ========================================== */}
        {adminTab === 'requests' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-rose-500" />
                  Student Enrollment Requests
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approve admin gate → then approve proctor gate → student is officially enrolled and instructor is notified
                </p>
              </div>
              <Badge variant="amber">{enrollmentRequests.filter(r => r.status === 'PENDING').length} Pending</Badge>
            </div>

            {approvalNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                approvalNotice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {approvalNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {approvalNotice.message}
              </div>
            )}

            {requestsLoading ? (
              <div className="py-10 text-center text-sm text-slate-400 font-semibold">Loading enrollment requests...</div>
            ) : enrollmentRequests.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600">No enrollment requests yet.</p>
                <p className="text-xs text-slate-400 mt-1">Students submitting course requests will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3.5">Student</th>
                      <th className="px-5 py-3.5">Course</th>
                      <th className="px-5 py-3.5">Proctor</th>
                      <th className="px-5 py-3.5">Requested</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Admin Gate</th>
                      <th className="px-5 py-3.5">Proctor Gate</th>
                      <th className="px-5 py-3.5">Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {enrollmentRequests.map((req) => {
                      const statusColors = {
                        'PENDING':        'bg-amber-50 text-amber-700 border-amber-200',
                        'ADMIN_APPROVED': 'bg-blue-50 text-blue-700 border-blue-200',
                        'APPROVED':       'bg-emerald-50 text-emerald-700 border-emerald-200',
                        'REJECTED':       'bg-rose-50 text-rose-700 border-rose-200',
                      };
                      return (
                        <tr key={req.request_id} className={`transition-colors ${req.status === 'APPROVED' ? 'bg-emerald-50/40' : req.status === 'REJECTED' ? 'bg-rose-50/30 opacity-60' : 'hover:bg-slate-50'}`}>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{req.student_name}</div>
                            <div className="text-[10px] text-slate-400">{req.student_email}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{req.course_name}</div>
                            <div className="text-[10px] text-slate-400">Code #{req.course_id}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{req.proctor_name || <span className="italic text-slate-400">Unassigned</span>}</td>
                          <td className="px-5 py-4 text-slate-500">{new Date(req.requested_at).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusColors[req.status] || 'bg-slate-100 text-slate-600'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {req.admin_approved ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>
                            ) : req.status === 'REJECTED' ? (
                              <span className="text-slate-400 text-[11px]">—</span>
                            ) : (
                              <button
                                onClick={() => handleApproveRequest(req.request_id, 'admin_approve')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors"
                              >
                                <ThumbsUp className="w-3 h-3" /> Approve
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {req.proctor_approved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Proctor Approved
                              </span>
                            ) : req.status === 'REJECTED' ? (
                              <span className="text-slate-400 text-[11px]">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold" title="Independent gate: faculty proctor must approve from their proctor portal">
                                <Clock className="w-3 h-3 text-amber-500" /> Awaiting Proctor
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {req.status !== 'APPROVED' && req.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleApproveRequest(req.request_id, 'reject')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold transition-colors"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. INSTRUCTOR / FACULTY DASHBOARD COMPONENT
// Focuses on teaching courses, students in class, submissions to review, feedback
// ==========================================
function InstructorDashboard({ data = {}, onRefresh }) {
  const { 
    instructor = {}, 
    teachingCourses = [], 
    enrolledStudents = [], 
    submissionsToReview = [], 
    feedbacks = [], 
    metrics = {},
    proctorPortfolio = {}
  } = data || {};
  const { proctorWards = [], proctorProfile = {}, proctorPendingRequests = [] } = proctorPortfolio || {};
  const { currentUser } = useAuth();

  // Wards view & dossier state
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardSearch, setWardSearch] = useState('');

  // Instructor notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    lmsApi.getInstructorNotifications(currentUser.id)
      .then(res => {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [currentUser?.id]);

  const handleMarkRead = async (notifId) => {
    await lmsApi.markNotificationRead(notifId);
    setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mentorship Meetings State (Option 1 via instructor_notification)
  const [proctorMeetings, setProctorMeetings] = useState([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleTopic, setScheduleTopic] = useState('Academic Performance & CGPA Advisory');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleVenue, setScheduleVenue] = useState(instructor?.cabin_no || 'Cabin 401');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Conclude meeting modal
  const [completingMeeting, setCompletingMeeting] = useState(null);
  const [advisoryNotesInput, setAdvisoryNotesInput] = useState('');
  const [completingLoading, setCompletingLoading] = useState(false);

  // Accept meeting modal
  const [acceptingMeeting, setAcceptingMeeting] = useState(null);
  const [acceptScheduledTime, setAcceptScheduledTime] = useState('');
  const [acceptVenue, setAcceptVenue] = useState(instructor?.cabin_no || 'Cabin 401');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const loadProctorMeetings = () => {
    if (!currentUser?.id) return;
    lmsApi.getProctorMeetings('instructor', currentUser.id)
      .then(res => setProctorMeetings(res.meetings || []))
      .catch(() => {});
  };

  const handleProctorApproveEnrollment = async (requestId, action) => {
    try {
      const res = await lmsApi.approveEnrollmentRequest(requestId, action === 'approve' ? 'proctor_approve' : 'reject');
      setActionNotice({ type: 'success', message: res.message || 'Enrollment request processed!' });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleAcceptConfirmSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!acceptingMeeting) return;
    setAcceptLoading(true);
    try {
      const res = await lmsApi.updateProctorMeeting(acceptingMeeting.id, {
        action: 'accept',
        scheduled_time: acceptScheduledTime || 'Friday 3:00 PM',
        venue: acceptVenue || instructor?.cabin_no || 'Cabin 401'
      });
      setActionNotice({ type: 'success', message: res.message });
      setAcceptingMeeting(null);
      loadProctorMeetings();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setAcceptLoading(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  useEffect(() => {
    loadProctorMeetings();
  }, [currentUser?.id]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleStudentId) return;
    setScheduleLoading(true);
    try {
      const res = await lmsApi.scheduleProctorMeeting({
        instructor_id: currentUser.id,
        student_id: parseInt(scheduleStudentId, 10),
        topic: scheduleTopic,
        scheduled_time: scheduleTime || 'This Friday at 11:00 AM',
        venue: scheduleVenue || 'Cabin 401',
        notes: scheduleNotes || 'Periodic mentorship checkup'
      });
      setActionNotice({ type: 'success', message: res.message });
      setIsScheduleOpen(false);
      setScheduleNotes('');
      setScheduleTime('');
      setScheduleStudentId('');
      loadProctorMeetings();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setScheduleLoading(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleAcceptWardMeet = async (meetingId, scheduledTime = 'Friday 3:00 PM @ Cabin 401') => {
    try {
      const res = await lmsApi.updateProctorMeeting(meetingId, {
        action: 'accept',
        scheduled_time: scheduledTime,
        venue: instructor?.cabin_no || 'Cabin 401'
      });
      setActionNotice({ type: 'success', message: res.message });
      loadProctorMeetings();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDeclineWardMeet = async (meetingId) => {
    try {
      const res = await lmsApi.updateProctorMeeting(meetingId, { action: 'cancel' });
      setActionNotice({ type: 'success', message: res.message });
      loadProctorMeetings();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleCompleteMeetSubmit = async (e) => {
    e.preventDefault();
    if (!completingMeeting) return;
    setCompletingLoading(true);
    try {
      const res = await lmsApi.updateProctorMeeting(completingMeeting.id, {
        action: 'complete',
        advisory_notes: advisoryNotesInput || 'Meeting concluded. Ward advised on coursework progress.'
      });
      setActionNotice({ type: 'success', message: res.message });
      setCompletingMeeting(null);
      setAdvisoryNotesInput('');
      loadProctorMeetings();
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
    } finally {
      setCompletingLoading(false);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Faculty Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-8 text-white shadow-xl shadow-blue-600/15">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white mb-3">
            <UserCheck className="w-3.5 h-3.5" /> Faculty Academic Lead
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, Prof. {instructor.first_name} {instructor.last_name} 👨‍🏫
          </h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Department of <strong className="text-white font-bold">{instructor.dept_name}</strong> • Cabin <strong className="text-white font-bold">{instructor.cabin_no}</strong>. 
            You are managing <strong className="text-white font-bold">{teachingCourses.length} course(s)</strong> with 
            <strong className="text-white font-bold"> {metrics.totalEnrolledStudents} active student(s)</strong> enrolled in your classes.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-900 font-bold text-xs sm:text-sm shadow hover:bg-blue-50 transition-transform active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-blue-600" /> My Course Curriculum
            </Link>
            <Link
              to="/submissions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/40 border border-white/20 text-white hover:bg-blue-900/60 font-bold text-xs sm:text-sm transition-colors"
            >
              <Send className="w-4 h-4" /> Review Submissions
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Faculty & Proctor Specific Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Courses Taught</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{metrics.totalCoursesTaught}</div>
          <p className="text-xs text-slate-500 mt-1">{teachingCourses[0]?.course_name || 'DBMS'} (Dept: {instructor.dept_name})</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Students</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-emerald-600">{metrics.totalEnrolledStudents}</div>
          <p className="text-xs text-slate-500 mt-1">Students actively attending lectures</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submissions to Grade</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600">{metrics.totalSubmissionsReceived}</div>
          <p className="text-xs text-slate-500 mt-1">Coursework submissions received</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Feedback</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-purple-700">{metrics.totalFeedbackReceived}</div>
          <p className="text-xs text-slate-500 mt-1">Logged student evaluations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proctor Wards</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-indigo-700">{metrics.totalProctorWards || proctorWards.length}</div>
          <p className="text-xs text-slate-500 mt-1">Assigned faculty mentorship wards</p>
        </div>
      </div>

      {/* Notifications Panel */}
      {(notifLoading || notifications.length > 0) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <BellRing className="w-5 h-5 text-blue-600 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5 text-slate-400" />
              )}
              <h3 className="font-bold text-base text-slate-900">Enrollment Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{unreadCount} new</span>
              )}
            </div>
            <p className="text-xs text-slate-400">Students approved and enrolled in your courses</p>
          </div>
          {notifLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 font-semibold">Loading notifications...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.slice(0, 8).map((n) => (
                <div
                  key={n.notification_id}
                  className={`px-6 py-4 flex items-center justify-between gap-4 transition-colors ${n.is_read ? 'opacity-60' : 'bg-blue-50/40'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                      {n.student_name ? n.student_name[0] : '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{formatNotificationMessage(n.message)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.notification_id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                  {n.is_read && (
                    <CheckCircle2 className="shrink-0 w-4 h-4 text-emerald-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Notice */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl text-xs font-semibold ${actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {actionNotice.message}
        </div>
      )}

      {/* Faculty Proctor Directorate & Assigned Wards Portfolio */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  My Assigned Student Wards ({proctorWards.length})
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  Official Proctor Unit #{proctorProfile.proctor_id || 1}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                You are the appointed University Faculty Proctor for these students. Review academic standing, CGPA, study hours, submissions, and issue advisory or summons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={wardSearch}
                onChange={(e) => setWardSearch(e.target.value)}
                placeholder="Search wards..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Pending Proctor Course Approvals Alert */}
        {proctorPendingRequests.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-xs text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Pending Course Registration Approvals ({proctorPendingRequests.length})
              </span>
              <span className="text-[10px] text-amber-700">Requires Proctor Approval</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proctorPendingRequests.map((req) => (
                <div key={req.request_id} className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{req.student_name}</span>
                    <span className="text-slate-500 text-[11px] block">
                      Course: <strong>{req.course_name}</strong> • CGPA: {req.cgpa || '8.5'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleProctorApproveEnrollment(req.request_id, 'approve')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleProctorApproveEnrollment(req.request_id, 'reject')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wards Grid Cards */}
        {proctorWards.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No student wards assigned to your proctoring group yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proctorWards
              .filter(w => {
                const s = wardSearch.toLowerCase();
                return `${w.first_name} ${w.last_name}`.toLowerCase().includes(s) ||
                  w.student_id.toString().includes(s) ||
                  (w.enrolled_course_names && w.enrolled_course_names.toLowerCase().includes(s));
              })
              .map((w) => {
                const cgpaVal = parseFloat(w.cgpa || 8.5);
                const isDistinction = cgpaVal >= 8.5;
                const isWarning = cgpaVal < 7.0;

                return (
                  <div
                    key={w.student_id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between gap-3 text-xs"
                  >
                    <div>
                      {/* Top Row: Ward Name & CGPA */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                            {w.first_name[0]}{w.last_name[0]}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                              {w.first_name} {w.last_name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Ward #{w.student_id} • {w.email}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 ${
                          isDistinction ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isWarning ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          CGPA {w.cgpa || '8.50'}
                        </span>
                      </div>

                      {/* Phone & Tracker */}
                      <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tracker Status:</span>
                          <span className="font-bold text-slate-700">{w.daily_tracker || 'Active'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Total Study Time:</span>
                          <span className="font-bold text-indigo-700">{Math.round((w.time_spent || 0) / 60)} hrs logged</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Assignments:</span>
                          <span className="font-bold text-slate-700">{w.submission_count || 0} submitted (avg {w.avg_marks || 'N/A'})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Quizzes:</span>
                          <span className="font-bold text-slate-700">{w.quiz_count || 0} attempted (avg {w.avg_quiz_score ? `${w.avg_quiz_score}%` : 'N/A'})</span>
                        </div>
                      </div>

                      {/* Enrolled Courses Badges */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Enrolled Subjects ({w.enrolled_count || 0}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(w.enrolled_course_names ? w.enrolled_course_names.split(',') : ['DBMS', 'Operating Systems']).slice(0, 3).map((cn, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-700 font-semibold truncate max-w-[140px]">
                              {cn.trim()}
                            </span>
                          ))}
                          {(w.enrolled_count || 0) > 3 && (
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-bold">
                              +{(w.enrolled_count || 0) - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => setSelectedWard(w)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 font-bold text-[11px] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" /> Full Dossier
                      </button>
                      <button
                        onClick={() => {
                          setScheduleStudentId(w.student_id);
                          setIsScheduleOpen(true);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Summon
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Proctor Mentorship Meetings & Ward Requests Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Mentorship Sessions & Ward Requests ({proctorMeetings.length})
              </h3>
              <p className="text-xs text-slate-500">
                1-on-1 mentorship meetings requested by your assigned student wards or sessions scheduled by you.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsScheduleOpen(true);
              setScheduleStudentId(proctorWards[0]?.student_id || enrolledStudents[0]?.student_id || '101');
              setScheduleTime('');
              setScheduleNotes('');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <Calendar className="w-4 h-4" /> Summon / Schedule Meet
          </button>
        </div>

        {proctorMeetings.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No active mentorship meetings or ward requests at this time.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proctorMeetings.map((m) => (
              <div key={m.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {m.student_name || `Ward #${m.student_id}`}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      m.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                      m.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">📌 Topic: {m.topic}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    ⏰ Slot: <strong>{m.scheduled_time || m.preferred_time}</strong> • 📍 Venue: <strong>{m.venue || instructor?.cabin_no || 'Cabin 401'}</strong>
                  </div>
                  {m.notes && (
                    <p className="text-[11px] text-slate-600 mt-1 bg-white p-2 rounded-xl border border-slate-100 italic">
                      "{m.notes}"
                    </p>
                  )}
                  {m.advisory_notes && (
                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                      <strong>Advisory Outcome:</strong> {m.advisory_notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  {m.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          setAcceptingMeeting(m);
                          setAcceptScheduledTime(m.preferred_time || 'Tomorrow at 3:00 PM');
                          setAcceptVenue(m.venue || instructor?.cabin_no || 'Cabin 401');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Set Slot
                      </button>
                      <button
                        onClick={() => handleDeclineWardMeet(m.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {(m.status === 'SCHEDULED' || m.status === 'CONFIRMED') && (
                    <button
                      onClick={() => {
                        setCompletingMeeting(m);
                        setAdvisoryNotesInput('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" /> Conclude & Log Advice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: My Course & Submissions Received */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: My Courses & Enrolled Students */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Active Course Curriculum
            </h3>

            <div className="space-y-4">
              {teachingCourses.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No Teaching Courses Assigned Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">An academic administrator will assign courses to your faculty profile in the curriculum catalog.</p>
                </div>
              ) : (
                teachingCourses.map((c) => (
                  <div key={c.course_id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="blue">Code: {c.course_id}</Badge>
                        <Badge variant="purple">{c.dept_name} Department</Badge>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{c.course_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.module_count} Modules • {c.assignment_count} Assignment(s) • {c.quiz_count} Quiz(zes)
                      </p>
                    </div>

                    <Link
                      to={`/courses/${c.course_id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 transition-colors shrink-0 flex items-center gap-1"
                    >
                      View Syllabus & Students <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enrolled Students in My Class */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" /> Students in My Class ({enrolledStudents.length})
              </h3>
              <Link to="/enrollments" className="text-xs font-bold text-blue-600 hover:underline">
                Manage Class
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5">Course</th>
                    <th className="px-6 py-3.5">Contact Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {enrolledStudents.map((st) => (
                    <tr key={st.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                          {st.first_name[0]}
                        </div>
                        {st.first_name} {st.last_name}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-700">#{st.student_id}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800">{st.course_name}</td>
                      <td className="px-6 py-3.5 text-slate-500">{st.email}</td>
                    </tr>
                  ))}
                  {enrolledStudents.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400">No students enrolled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Submissions to Grade & Feedback */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" /> Submissions from My Students
              </h3>
              <Link to="/submissions" className="text-xs font-bold text-purple-600 hover:text-purple-700">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {submissionsToReview.map((sub, idx) => {
                const isGraded = sub.marks_obtained !== null && sub.marks_obtained !== undefined;
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs hover:border-purple-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{sub.first_name} {sub.last_name}</span>
                      {isGraded ? (
                        <Badge variant="green" className="text-[10px]">Graded: {sub.marks_obtained}/{sub.marks}</Badge>
                      ) : (
                        <Badge variant="amber" className="text-[10px]">Needs Grading</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">{sub.assignment_name}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-200/60">
                      <span>Submitted: {sub.submission_date}</span>
                      <Link
                        to={`/submissions?courseId=${sub.course_id}&assignmentId=${sub.assignment_id}`}
                        className="font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
                      >
                        {isGraded ? 'Edit Grade →' : 'Grade Now →'}
                      </Link>
                    </div>
                  </div>
                );
              })}

              {submissionsToReview.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No submissions received yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-purple-600" /> Student Feedback Log
            </h3>

            <div className="space-y-2.5">
              {feedbacks.map((fb, idx) => (
                <div key={idx} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-purple-950">Feedback #{fb.feedback_no}</span>
                    <span className="text-amber-500 font-bold">⭐⭐⭐⭐⭐</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Submitted by: <strong>{fb.student_first} {fb.student_last}</strong>
                  </p>
                </div>
              ))}

              {feedbacks.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No feedback logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Ward Dossier Modal */}
      {selectedWard && (
        <Modal
          isOpen={!!selectedWard}
          onClose={() => setSelectedWard(null)}
          title={`Proctor Dossier: ${selectedWard.first_name} ${selectedWard.last_name} (#${selectedWard.student_id})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header / Profile card */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                  {selectedWard.first_name[0]}{selectedWard.last_name[0]}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {selectedWard.first_name} {selectedWard.last_name}
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Student ID: <strong>#{selectedWard.student_id}</strong> • DOB: {selectedWard.dob || '2004-05-15'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    ✉️ {selectedWard.email} • 📞 {selectedWard.phone_numbers || 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setScheduleStudentId(selectedWard.student_id);
                    setIsScheduleOpen(true);
                    setSelectedWard(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" /> Summon for Meet
                </button>
              </div>
            </div>

            {/* Academic Health Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">CGPA</span>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  {selectedWard.cgpa || '8.50'}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    parseFloat(selectedWard.cgpa || 8.5) >= 8.5 ? 'bg-emerald-100 text-emerald-800' :
                    parseFloat(selectedWard.cgpa || 8.5) >= 7.0 ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {parseFloat(selectedWard.cgpa || 8.5) >= 8.5 ? 'Distinction' : parseFloat(selectedWard.cgpa || 8.5) >= 7.0 ? 'Good' : 'Warning'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Daily Tracker</span>
                <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
                  {selectedWard.daily_tracker || 'Active'}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Study Session Time</span>
                <div className="text-lg font-extrabold text-indigo-600 mt-0.5">
                  {Math.round((selectedWard.time_spent || 0) / 60)} hrs
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Class Rank</span>
                <div className="text-lg font-extrabold text-purple-600 mt-0.5">
                  #{selectedWard.leaderboard_position || 1}
                </div>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="space-y-2">
              <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" /> Enrolled Subjects ({selectedWard.enrolled_count || selectedWard.enrolledCoursesList?.length || 0})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedWard.enrolledCoursesList || []).map((c) => (
                  <div key={c.course_id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{c.course_name}</span>
                      <span className="text-[10px] text-slate-500 block">Code: #{c.course_id} • Dept: {c.dept_name || 'CS'}</span>
                    </div>
                    <Badge variant="blue" className="text-[10px]">Enrolled</Badge>
                  </div>
                ))}
                {(!selectedWard.enrolledCoursesList || selectedWard.enrolledCoursesList.length === 0) && (
                  <p className="text-slate-400 py-2 col-span-2 italic">Enrolled in: {selectedWard.enrolled_course_names || 'None'}</p>
                )}
              </div>
            </div>

            {/* Assignments Breakdown */}
            <div className="space-y-2">
              <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-amber-600" /> Recent Assignment Submissions ({selectedWard.submission_count || selectedWard.recentSubmissions?.length || 0})
              </h5>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(selectedWard.recentSubmissions || []).map((sub, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{sub.assignment_name}</span>
                        <span className="text-[10px] text-slate-500 block">{sub.course_name} • Date: {sub.submission_date}</span>
                      </div>
                      <div>
                        {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {sub.marks_obtained} / {sub.max_marks || sub.marks || 20}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                            Pending Grading
                          </span>
                        )}
                      </div>
                    </div>
                    {sub.submission_content && (
                      <SubmissionContentRenderer content={sub.submission_content} compact={true} />
                    )}
                  </div>
                ))}
                {(!selectedWard.recentSubmissions || selectedWard.recentSubmissions.length === 0) && (
                  <p className="text-slate-400 py-2 italic">No assignment submissions logged yet.</p>
                )}
              </div>
            </div>

            {/* Quiz Performance */}
            <div className="space-y-2">
              <h5 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" /> Quiz Attempts & Scores ({selectedWard.quiz_count || selectedWard.quizAttempts?.length || 0})
              </h5>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(selectedWard.quizAttempts || []).map((qa, i) => (
                  <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{qa.quiz_title}</span>
                      <span className="text-[10px] text-slate-500 block">{qa.course_name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]">
                      Score: {qa.score}
                    </span>
                  </div>
                ))}
                {(!selectedWard.quizAttempts || selectedWard.quizAttempts.length === 0) && (
                  <p className="text-slate-400 py-2 italic">No quiz attempts logged yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedWard(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Faculty Schedule Mentorship Meet Modal */}
      {isScheduleOpen && (
        <Modal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          title="Schedule Mentorship Session with Ward"
        >
          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-slate-700">
              Summon or schedule a 1-on-1 mentorship session with a student ward assigned to your proctoring group.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Student Ward</label>
              {(proctorWards.length > 0 ? proctorWards : enrolledStudents).length > 0 ? (
                <select
                  value={scheduleStudentId}
                  onChange={(e) => setScheduleStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium"
                >
                  {(proctorWards.length > 0 ? proctorWards : enrolledStudents).map((st) => (
                    <option key={st.student_id} value={st.student_id}>
                      {st.first_name} {st.last_name} (#{st.student_id}) {st.cgpa ? `— CGPA: ${st.cgpa}` : ''} {st.course_name ? `(${st.course_name})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={scheduleStudentId}
                  onChange={(e) => setScheduleStudentId(e.target.value)}
                  placeholder="Enter Student ID (e.g. 101)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Session Agenda / Topic</label>
              <select
                value={scheduleTopic}
                onChange={(e) => setScheduleTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium"
              >
                <option value="Academic Performance & CGPA Advisory">Academic Performance & CGPA Advisory</option>
                <option value="Backlog Clearance & Course Counseling">Backlog Clearance & Course Counseling</option>
                <option value="Attendance Warning & Mentorship Checkup">Attendance Warning & Mentorship Checkup</option>
                <option value="Semester Exam & Assignment Preparation">Semester Exam & Assignment Preparation</option>
                <option value="Career, Projects & Internship Guidance">Career, Projects & Internship Guidance</option>
                <option value="Routine Mentorship Review">Routine Mentorship Review</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date & Time</label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="e.g. Friday at 3:00 PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Venue / Location</label>
                <input
                  type="text"
                  value={scheduleVenue}
                  onChange={(e) => setScheduleVenue(e.target.value)}
                  placeholder="e.g. Cabin 401"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Advisory Notes / Instructions for Student</label>
              <textarea
                rows="3"
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Bring mid-term mark sheets and assignment notes..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={scheduleLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
              >
                {scheduleLoading ? 'Scheduling...' : 'Schedule & Notify Student'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Accept Ward Meet Modal */}
      {acceptingMeeting && (
        <Modal
          isOpen={!!acceptingMeeting}
          onClose={() => setAcceptingMeeting(null)}
          title={`Confirm Mentorship Slot: ${acceptingMeeting.student_name || 'Ward'}`}
        >
          <form onSubmit={handleAcceptConfirmSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
              Confirm or adjust the meeting schedule and cabin venue for <strong>{acceptingMeeting.student_name}</strong>.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Topic</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold">
                {acceptingMeeting.topic}
              </div>
            </div>

            {acceptingMeeting.notes && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ward's Note / Request</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 italic">
                  "{acceptingMeeting.notes}"
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Confirmed Date & Time</label>
                <input
                  type="text"
                  value={acceptScheduledTime}
                  onChange={(e) => setAcceptScheduledTime(e.target.value)}
                  placeholder="e.g. Tomorrow at 3:30 PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Meeting Venue / Cabin</label>
                <input
                  type="text"
                  value={acceptVenue}
                  onChange={(e) => setAcceptVenue(e.target.value)}
                  placeholder="e.g. Cabin 401"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptingMeeting(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={acceptLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {acceptLoading ? 'Confirming...' : 'Confirm Meeting Slot'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {completingMeeting && (
        <Modal
          isOpen={!!completingMeeting}
          onClose={() => setCompletingMeeting(null)}
          title={`Conclude Session: ${completingMeeting.student_name || 'Ward'}`}
        >
          <form onSubmit={handleCompleteMeetSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
              Record final advisory remarks and conclude this mentorship meeting. These notes will be saved and visible to the student in their mentorship record.
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Topic</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold">
                {completingMeeting.topic}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mentorship Advice & Action Items</label>
              <textarea
                rows="4"
                value={advisoryNotesInput}
                onChange={(e) => setAdvisoryNotesInput(e.target.value)}
                placeholder="Advised student to attend DBMS remedial classes, complete pending assignments by next Monday, and focus on normalization topics..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompletingMeeting(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completingLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
              >
                {completingLoading ? 'Saving...' : 'Conclude Meeting'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ==========================================
// 3. STUDENT DASHBOARD COMPONENT
// Focuses on Student's own CGPA, assignments, enrolled courses, and proctor
// ==========================================
function StudentDashboard({ data = {}, currentUser, onRefresh }) {
  const { student = {}, analytics = {}, enrolledCourses = [], assignments = [], recentSubmissions = [], metrics = {} } = data || {};
  const [studyMins, setStudyMins] = useState(analytics?.time_spent || 120);
  const [trackerStatus, setTrackerStatus] = useState(analytics?.daily_tracker || 'Good');
  const [logging, setLogging] = useState(false);
  const [logNotice, setLogNotice] = useState(null);

  // Proctor Mentorship Meetings State (Option 1 via instructor_notification)
  const [meetings, setMeetings] = useState([]);
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [meetTopic, setMeetTopic] = useState('Academic Backlog & CGPA Review');
  const [meetTime, setMeetTime] = useState('');
  const [meetNotes, setMeetNotes] = useState('');
  const [meetSubmitting, setMeetSubmitting] = useState(false);
  const [meetNotice, setMeetNotice] = useState(null);

  const loadMeetings = () => {
    if (!currentUser?.id) return;
    lmsApi.getProctorMeetings('student', currentUser.id)
      .then(res => setMeetings(res.meetings || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadMeetings();
  }, [currentUser?.id]);

  const handleRequestMeet = async (e) => {
    e.preventDefault();
    setMeetSubmitting(true);
    try {
      const res = await lmsApi.requestProctorMeeting({
        student_id: currentUser.id,
        topic: meetTopic,
        preferred_time: meetTime || 'Next available slot',
        notes: meetNotes
      });
      setMeetNotice({ type: 'success', text: res.message });
      setIsMeetModalOpen(false);
      setMeetNotes('');
      setMeetTime('');
      loadMeetings();
      setTimeout(() => setMeetNotice(null), 5000);
    } catch (err) {
      setMeetNotice({ type: 'error', text: err.message });
    } finally {
      setMeetSubmitting(false);
    }
  };

  const handleAcknowledgeMeet = async (meetingId) => {
    try {
      await lmsApi.updateProctorMeeting(meetingId, { action: 'acknowledge' });
      loadMeetings();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickLog = async (minutes) => {
    setLogging(true);
    try {
      await lmsApi.logStudySession(currentUser.id, minutes, trackerStatus);
      setStudyMins(prev => prev + minutes);
      setLogNotice(`+${minutes} mins study time recorded in progress_analytics!`);
      if (onRefresh) onRefresh();
      setTimeout(() => setLogNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 p-8 text-white shadow-lg shadow-blue-500/15">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back to your semester
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {student ? `${student.first_name} ${student.last_name}` : currentUser.name}! 👋
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-50 leading-relaxed">
            You have <strong className="text-white font-bold">{metrics.pendingAssignments} pending assignment(s)</strong> and 
            <strong className="text-white font-bold"> {enrolledCourses.length} active course(s)</strong> enrolled for Fall 2026.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs sm:text-sm shadow hover:bg-blue-50 transition-transform active:scale-95"
            >
              <BookOpen className="w-4 h-4" /> Browse Courses
            </Link>
            <Link
              to="/assignments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/30 border border-white/20 text-white hover:bg-blue-900/50 font-bold text-xs sm:text-sm transition-colors"
            >
              <FileText className="w-4 h-4" /> My Assignments
            </Link>
            <Link
              to="/quizzes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/30 border border-white/20 text-white hover:bg-blue-900/50 font-bold text-xs sm:text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Take Quiz
            </Link>
            <Link
              to="/enrollments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/30 border border-white/20 text-white hover:bg-blue-900/50 font-bold text-xs sm:text-sm transition-colors"
            >
              <Layers className="w-4 h-4" /> Register Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Quick Study Logger Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">Live Study Logger (Table: progress_analytics)</h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                {studyMins} Mins Total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {logNotice ? (
                <span className="text-emerald-600 font-bold animate-in fade-in">✓ {logNotice}</span>
              ) : (
                'Track your daily coursework preparation time directly in the database'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickLog(30)}
            disabled={logging}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-transform active:scale-95 disabled:opacity-50"
          >
            + 30m Study
          </button>
          <button
            onClick={() => handleQuickLog(60)}
            disabled={logging}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
          >
            + 1 Hr Study
          </button>
          <Link
            to="/analytics"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Leaderboard &rarr;
          </Link>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current CGPA</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {analytics?.cgpa != null ? Number(analytics.cgpa).toFixed(2) : '0.00'}
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 10.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Badge variant="green">{analytics.daily_tracker || 'Good Standing'}</Badge>
            <span className="text-[11px] text-slate-400">Semester 5</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Courses</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{enrolledCourses.length}</span>
            <span className="text-xs font-semibold text-slate-400">registered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Active courses this semester
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignments Due</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{metrics.pendingAssignments}</span>
            <span className="text-xs font-semibold text-slate-400">pending</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">Check deadlines below</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Rank</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-700">#{analytics.leaderboard_position || 1}</span>
            <span className="text-xs font-semibold text-slate-400">in class</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            <Badge variant="purple">Top 5% Student</Badge>
          </div>
        </div>
      </div>

      {/* Main Grid: Courses & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">My Registered Courses</h2>
              <p className="text-xs text-slate-500">Active coursework for your curriculum</p>
            </div>
            <Link to="/courses" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">No Enrolled Courses Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Welcome to the academic portal! You have not enrolled in any courses for this semester yet.
              </p>
              <Link
                to="/enrollments"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm"
              >
                Browse & Register for Courses &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enrolledCourses.map((c) => (
                <Link
                  key={c.course_id}
                  to={`/courses/${c.course_id}`}
                  className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="blue">Code {c.course_id}</Badge>
                      <span className="text-xs font-bold text-slate-400">{c.dept_name}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.course_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Faculty: Prof. {c.instructor_first || 'Raj'} {c.instructor_last || 'Menon'} (Cabin: {c.instructor_cabin || 'I101'})
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{c.module_count || 1} Modules • {c.assignment_count || 1} Assignment</span>
                    <span className="font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      Enter &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Student Proctor Card */}
          {student && (
            <div className="mt-6 p-5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-blue-700 tracking-wider">Assigned Faculty Proctor</div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Prof. {student.proctor_first || 'Raj'} {student.proctor_last || 'Menon'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Cabin: {student.proctor_cabin || 'Cabin 401'} • Mentorship Ward #{student.proctor_id || 1}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMeetModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Request Meet
                  </button>
                  <Link
                    to="/proctors"
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs"
                  >
                    Proctor Info
                  </Link>
                </div>
              </div>

              {/* Notice Banner */}
              {meetNotice && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-semibold ${meetNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {meetNotice.text}
                </div>
              )}

              {/* Active Mentorship Meetings List */}
              {meetings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-100/60 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mentorship Sessions ({meetings.length})</div>
                  {meetings.slice(0, 3).map((m) => (
                    <div key={m.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{m.topic}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            m.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            m.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            m.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ⏰ {m.scheduled_time || m.preferred_time} • 📍 {m.venue || 'Cabin 401'}
                        </div>
                        {m.advisory_notes && (
                          <div className="mt-1.5 p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-[11px] text-emerald-900">
                            <strong>Mentor Advisory:</strong> {m.advisory_notes}
                          </div>
                        )}
                      </div>
                      {m.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleAcknowledgeMeet(m.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Attendance
                        </button>
                      )}
                      {m.status === 'CONFIRMED' && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Attendance Confirmed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Deadlines & Submissions */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Upcoming Deadlines
              </h3>
              <Link to="/assignments" className="text-[11px] font-bold text-blue-600 hover:underline">
                All
              </Link>
            </div>

            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming assignment deadlines.</p>
              ) : (
                assignments.slice(0, 3).map((a) => (
                  <div key={a.assignment_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{a.name}</span>
                      {a.is_submitted ? (
                        <Badge variant="green">Submitted</Badge>
                      ) : (
                        <Badge variant="amber">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>{a.course_name}</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400" /> Due: {a.due_date}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submissions Activity
              </h3>
              <Link to="/submissions" className="text-[11px] font-bold text-blue-600 hover:underline">
                History
              </Link>
            </div>

            <div className="space-y-3">
              {recentSubmissions.map((sub, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{sub.assignment_name}</p>
                    <p className="text-[11px] text-slate-400">{sub.course_name} • Marks: {sub.marks}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {sub.submission_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student Request Proctor Meet Modal */}
      {isMeetModalOpen && (
        <Modal
          isOpen={isMeetModalOpen}
          onClose={() => setIsMeetModalOpen(false)}
          title={`Request Mentorship Meeting with Prof. ${student.proctor_first || 'Raj'} ${student.proctor_last || 'Menon'}`}
        >
          <form onSubmit={handleRequestMeet} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-slate-700">
              Submit a 1-on-1 mentorship meeting request to your assigned proctor <strong>Prof. {student.proctor_first || 'Raj'} {student.proctor_last || 'Menon'}</strong> ({student.proctor_cabin || 'Cabin 401'}).
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Topic / Concern</label>
              <select
                value={meetTopic}
                onChange={(e) => setMeetTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 font-medium"
              >
                <option value="Academic Backlog & CGPA Review">Academic Backlog & CGPA Review</option>
                <option value="Course Registration & Subject Selection">Course Registration & Subject Selection</option>
                <option value="Assignment & Quiz Performance Advice">Assignment & Quiz Performance Advice</option>
                <option value="Internship, Project & Career Guidance">Internship, Project & Career Guidance</option>
                <option value="Attendance & Leave Advisory">Attendance & Leave Advisory</option>
                <option value="General Academic Mentorship">General Academic Mentorship</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Preferred Time / Day</label>
              <input
                type="text"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                placeholder="e.g. Tomorrow at 3:00 PM, or Friday afternoon"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Notes / Questions for Proctor</label>
              <textarea
                rows="3"
                value={meetNotes}
                onChange={(e) => setMeetNotes(e.target.value)}
                placeholder="Briefly describe what you would like guidance on (e.g. struggling with DBMS queries, need advice on improving grade point)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMeetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={meetSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
              >
                {meetSubmitting ? 'Sending Request...' : 'Send Request to Proctor'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD ROUTER
// Dynamically renders AdminDashboard, InstructorDashboard, or StudentDashboard
// ==========================================
export default function Dashboard() {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = () => {
    lmsApi.getDashboard(currentUser?.role || 'student', currentUser?.id || 101)
      .then(res => {
        setData(res);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboard();
  }, [currentUser?.id, currentUser?.role]);

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <p className="font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          Failed to load dashboard data
        </p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading academic portal...</p>
        </div>
      </div>
    );
  }


  if (currentUser?.role === 'admin') {
    return <AdminDashboard data={data} />;
  }

  if (currentUser?.role === 'instructor') {
    return <InstructorDashboard data={data} onRefresh={fetchDashboard} />;
  }

  return <StudentDashboard data={data} currentUser={currentUser} onRefresh={fetchDashboard} />;
}
