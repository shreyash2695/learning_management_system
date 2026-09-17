import React, { useEffect, useState } from 'react';
import { 
  FolderCheck, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  Search, 
  BookOpen, 
  User,
  AlertCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  XCircle
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function Enrollments() {
  const { currentUser, isAdmin, isStudent } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [proctors, setProctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [proctorFilter, setProctorFilter] = useState('');
  const [activeTab, setActiveTab] = useState(isStudent ? 'my-courses' : 'all'); // 'my-courses', 'catalog', 'all'
  const [actionNotice, setActionNotice] = useState(null);

  // Enrollment request state (student view)
  const [myRequests, setMyRequests] = useState([]); // [{course_id, status}, ...]
  const [requestingCourseId, setRequestingCourseId] = useState(null); // loading state per card
  
  // Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);


  const loadData = async () => {
    setLoading(true);
    try {
      const [enrRes, stdRes, crsRes, prcRes] = await Promise.all([
        lmsApi.getEnrollments(),
        lmsApi.getStudents(),
        lmsApi.getCourses(currentUser?.id),
        lmsApi.getProctors().catch(() => ({ proctors: [] }))
      ]);
      setEnrollments(enrRes.enrollments || []);
      setStudents(stdRes.students || []);
      setCourses(crsRes.courses || []);
      setProctors(prcRes.proctors || []);
      if (stdRes.students?.length > 0) setSelectedStudent(String(stdRes.students[0].student_id));
      if (crsRes.courses?.length > 0) setSelectedCourse(String(crsRes.courses[0].course_id));

      // Load existing enrollment requests for this student
      if (isStudent) {
        try {
          const reqRes = await lmsApi.getEnrollmentRequests();
          // Filter to only this student's requests
          const mine = (reqRes.requests || []).filter(r => r.student_id === currentUser?.id);
          setMyRequests(mine);
        } catch {
          // Admin endpoint may 403 for students — load from public endpoint if available
          // Fail silently; catalog will just show "Request" button for all
          setMyRequests([]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const handleAdminEnroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await lmsApi.enrollCourse(Number(selectedStudent), Number(selectedCourse));
      setFeedback({ type: 'success', message: 'Student successfully registered for course!' });
      loadData();
      setTimeout(() => {
        setFeedback(null);
        setIsModalOpen(false);
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Student submits an enrollment request (not a direct enroll)
  const handleStudentRequestEnroll = async (courseId, courseName) => {
    setRequestingCourseId(courseId);
    try {
      await lmsApi.requestEnrollment(currentUser.id, courseId);
      setActionNotice({ type: 'success', message: `Enrollment request submitted for "${courseName}". Awaiting admin & proctor approval.` });
      loadData(); // Refresh to update myRequests
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
      setTimeout(() => setActionNotice(null), 5000);
    } finally {
      setRequestingCourseId(null);
    }
  };

  const handleDrop = async (studentId, courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to drop course "${courseName}"?`)) return;
    try {
      await lmsApi.dropCourse(studentId, courseId);
      setActionNotice({ type: 'success', message: `Course "${courseName}" dropped successfully from enrolls table.` });
      loadData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice({ type: 'error', message: err.message });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const myEnrollments = enrollments.filter(e => e.student_id === currentUser.id);
  const myCourseIds = new Set(myEnrollments.map(e => e.course_id));
  const availableCourses = courses.filter(c => !myCourseIds.has(c.course_id));

  const filteredAll = enrollments.filter(e => {
    const s = search.toLowerCase();
    const stName = `${e.student_first} ${e.student_last}`.toLowerCase();
    const matchesSearch = !s || stName.includes(s) || (e.course_name && e.course_name.toLowerCase().includes(s)) || String(e.student_id).includes(s);
    const matchesCourse = !courseFilter || String(e.course_id) === String(courseFilter);
    const matchesProctor = !proctorFilter || String(e.proctor_id) === String(proctorFilter);
    return matchesSearch && matchesCourse && matchesProctor;
  });

  const filteredMy = myEnrollments.filter(e => {
    const s = search.toLowerCase();
    return e.course_name.toLowerCase().includes(s) || (e.dept_name && e.dept_name.toLowerCase().includes(s));
  });

  const filteredCatalog = availableCourses.filter(c => {
    const s = search.toLowerCase();
    return c.course_name.toLowerCase().includes(s) || (c.dept_name && c.dept_name.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Course Registration Portal</h1>
            <Badge variant="blue">Table: enrolls</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {isStudent 
              ? `Manage your active semester course registrations and register for available curriculum subjects`
              : `Manage university course allocations and add/drop student registrations`
            }
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Admin Manual Enroll
          </button>
        )}
      </div>

      {/* Action Notification Flash */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {actionNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          {actionNotice.message}
        </div>
      )}

      {/* Metric Cards for Student */}
      {isStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Registered Courses</div>
            <div className="mt-2 text-3xl font-extrabold text-blue-600">{myEnrollments.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active courses for Fall 2026</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Catalog Courses</div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-600">{availableCourses.length}</div>
            <p className="text-xs text-slate-500 mt-1">Open for instant enrollment</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registration Status</div>
            <div className="mt-2 text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Add/Drop Active
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-1">No registration holds on account</p>
          </div>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {isStudent && (
            <>
              <button
                onClick={() => setActiveTab('my-courses')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'my-courses'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                📚 My Registered Courses ({myEnrollments.length})
              </button>

              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✨ Add / Register New Courses ({availableCourses.length})
              </button>
            </>
          )}

          {(isAdmin || !isStudent) && (
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🏛️ All University Registrations ({enrollments.length})
            </button>
          )}

          {isStudent && (
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              University Directory ({enrollments.length})
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search course or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading registrations...</div>
      ) : (
        <>
          {/* TAB 1: MY REGISTERED COURSES */}
          {activeTab === 'my-courses' && isStudent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-base text-slate-900">Courses You Are Currently Enrolled In</h3>
                <span className="text-xs text-slate-500">{myEnrollments.length} Course(s) Logged</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMy.map((enr) => (
                  <div
                    key={`${enr.student_id}-${enr.course_id}`}
                    className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="blue">Code: {enr.course_id}</Badge>
                        <Badge variant="purple">{enr.dept_name || 'Academic'}</Badge>
                      </div>

                      <h4 className="text-lg font-extrabold text-slate-900 mt-1">{enr.course_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Registered for Student #{enr.student_id} ({currentUser.name})
                      </p>

                      <div className="mt-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Officially Registered
                        </span>
                        <span className="text-slate-500">Fall 2026</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`/courses/${enr.course_id}`}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Enter Course Syllabus &rarr;
                      </a>

                      <button
                        onClick={() => handleDrop(enr.student_id, enr.course_id, enr.course_name)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Drop Course
                      </button>
                    </div>
                  </div>
                ))}

                {filteredMy.length === 0 && (
                  <div className="col-span-2 p-12 bg-white rounded-2xl border border-slate-200 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700">You are not enrolled in any courses matching your search.</p>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                    >
                      Browse Available Course Catalog &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COURSE CATALOG — REQUEST ENROLLMENT */}
          {activeTab === 'catalog' && isStudent && (() => {
            // Build a lookup map: course_id -> request status
            const requestMap = {};
            myRequests.forEach(r => { requestMap[r.course_id] = r.status; });

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Available Courses — Request Enrollment</h3>
                    <p className="text-xs text-slate-500">Enrollment requires admin &amp; proctor approval before you are officially registered</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    ⏳ Approval Required
                  </span>
                </div>

                {/* Approval process info banner */}
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>How enrollment works:</strong> Submit a request → Admin reviews &amp; approves → Proctor approves → You are officially enrolled and the instructor is notified.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCatalog.map((c) => {
                    const reqStatus = requestMap[c.course_id];
                    const isRequesting = requestingCourseId === c.course_id;

                    let actionButton;
                    if (reqStatus === 'APPROVED') {
                      actionButton = (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                        </span>
                      );
                    } else if (reqStatus === 'PENDING') {
                      actionButton = (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> Pending Approval
                        </span>
                      );
                    } else if (reqStatus === 'ADMIN_APPROVED') {
                      actionButton = (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="w-3.5 h-3.5" /> Awaiting Proctor
                        </span>
                      );
                    } else if (reqStatus === 'REJECTED') {
                      actionButton = (
                        <button
                          onClick={() => handleStudentRequestEnroll(c.course_id, c.course_name)}
                          disabled={isRequesting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rejected — Re-request
                        </button>
                      );
                    } else {
                      actionButton = (
                        <button
                          onClick={() => handleStudentRequestEnroll(c.course_id, c.course_name)}
                          disabled={isRequesting}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {isRequesting ? 'Requesting...' : 'Request Enrollment'}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={c.course_id}
                        className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="blue">Code: {c.course_id}</Badge>
                            <Badge variant="purple">{c.dept_name}</Badge>
                          </div>

                          <h4 className="text-base font-extrabold text-slate-900 leading-snug">{c.course_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Lead: Prof. {c.instructor_first} {c.instructor_last} (Cabin {c.cabin_no})
                          </p>

                          <div className="mt-4 grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-center text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{c.module_count}</div>
                              <div className="text-[10px] text-slate-400">Modules</div>
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{c.assignment_count}</div>
                              <div className="text-[10px] text-slate-400">Tasks</div>
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{c.quiz_count}</div>
                              <div className="text-[10px] text-slate-400">Quizzes</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <a
                            href={`/courses/${c.course_id}`}
                            className="text-xs font-semibold text-slate-500 hover:text-blue-600"
                          >
                            Preview Syllabus
                          </a>
                          {actionButton}
                        </div>
                      </div>
                    );
                  })}

                  {filteredCatalog.length === 0 && (
                    <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <p className="font-bold text-slate-700">You have requested or enrolled in all available courses!</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: ALL UNIVERSITY REGISTRATIONS DIRECTORY */}
          {(activeTab === 'all' || (!isStudent && activeTab !== 'catalog')) && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">University Course Registration Master Records</h3>
                  <p className="text-xs text-slate-400">Database table <code>enrolls</code> linking Student ID to Course ID</p>
                </div>
                
                {/* Subject and Proctor Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="">All Subjects ({courses.length})</option>
                    {courses.map(c => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_name} (Code {c.course_id})
                      </option>
                    ))}
                  </select>

                  <select
                    value={proctorFilter}
                    onChange={(e) => setProctorFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="">All Proctors ({proctors.length})</option>
                    {proctors.map(p => (
                      <option key={p.proctor_id} value={p.proctor_id}>
                        Prof. {p.first_name} {p.last_name} (Cabin {p.cabin_no})
                      </option>
                    ))}
                  </select>

                  {(courseFilter || proctorFilter) && (
                    <button
                      onClick={() => { setCourseFilter(''); setProctorFilter(''); }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 transition-colors"
                    >
                      Reset
                    </button>
                  )}

                  <Badge variant="purple">{filteredAll.length} Records</Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Student ID</th>
                      <th className="px-6 py-4">Course Enrolled</th>
                      <th className="px-6 py-4">Course Code</th>
                      <th className="px-6 py-4">Assigned Proctor</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAll.map((enr) => (
                      <tr key={`${enr.student_id}-${enr.course_id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {enr.student_first ? enr.student_first[0] : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{enr.student_first} {enr.student_last}</span>
                              {enr.student_id === currentUser.id && (
                                <Badge variant="green" className="text-[10px] py-0 px-1.5">You</Badge>
                              )}
                              {enr.cgpa && (
                                <Badge variant="neutral" className="text-[10px] py-0 px-1.5">CGPA: {enr.cgpa}</Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">{enr.student_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">#{enr.student_id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{enr.course_name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="blue">Code {enr.course_id}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {enr.proctor_first ? (
                            <div>
                              <div className="font-bold text-slate-800">Prof. {enr.proctor_first} {enr.proctor_last}</div>
                              <div className="text-[10px] text-slate-400">Cabin {enr.proctor_cabin}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="purple">{enr.dept_name || 'Academic'}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(isAdmin || enr.student_id === currentUser.id) && (
                            <button
                              onClick={() => handleDrop(enr.student_id, enr.course_id, enr.course_name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Drop Registration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredAll.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          No enrollments found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin Manual Enrollment Modal */}
      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setFeedback(null); }}
          title="Register Student for Course (Admin Access)"
        >
          <form onSubmit={handleAdminEnroll} className="space-y-4">
            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {feedback.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {students.map((st) => (
                  <option key={st.student_id} value={st.student_id}>
                    #{st.student_id} - {st.first_name} {st.last_name} ({st.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Course to Enroll</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {courses.map((cr) => (
                  <option key={cr.course_id} value={cr.course_id}>
                    Code {cr.course_id} - {cr.course_name} ({cr.dept_name} Dept)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
