import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Filter, 
  CheckCircle2, 
  Layers, 
  FileText, 
  HelpCircle, 
  User, 
  Users,
  ArrowRight,
  PlusCircle,
  GraduationCap
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Courses() {
  const { currentUser, isAdmin, isInstructor, isStudent } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState('');

  // Admin view enrolled students modal state
  const [selectedCourseForModal, setSelectedCourseForModal] = useState(null);
  const [modalStudents, setModalStudents] = useState([]);
  const [loadingModalStudents, setLoadingModalStudents] = useState(false);

  const handleOpenCourseStudents = async (course) => {
    setSelectedCourseForModal(course);
    setLoadingModalStudents(true);
    try {
      const res = await lmsApi.getStudents(course.course_id);
      setModalStudents(res.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModalStudents(false);
    }
  };

  const loadCourses = () => {
    setLoading(true);
    const promise = isInstructor 
      ? lmsApi.getCourses(null, currentUser?.id)
      : isAdmin
        ? lmsApi.getCourses()
        : lmsApi.getCourses(currentUser?.id);

    promise
      .then(res => setCourses(res.courses || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCourses();
  }, [currentUser?.id, currentUser?.role]);

  const handleQuickEnroll = async (courseId) => {
    try {
      await lmsApi.enrollCourse(currentUser.id, courseId);
      setActionMessage('Enrolled successfully!');
      loadCourses();
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCourses = courses.filter(c => {
    const courseName = (c.course_name || '').toLowerCase();
    const deptName = (c.dept_name || '').toLowerCase();
    const matchesSearch = courseName.includes(search.toLowerCase()) || 
                          deptName.includes(search.toLowerCase()) ||
                          String(c.course_id || '').includes(search);
    const matchesDept = deptFilter === 'ALL' || (c.dept_name || '') === deptFilter;
    return matchesSearch && matchesDept;
  });

  const departments = ['ALL', ...new Set(courses.map(c => c.dept_name).filter(Boolean))];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isInstructor 
              ? 'My Assigned Courses & Curriculum' 
              : isAdmin 
                ? 'University Course Catalog & Subject Directory' 
                : 'My Enrolled Courses & Curriculum'}
          </h1>
          <p className="text-sm text-slate-500">
            {isInstructor 
              ? 'Manage course syllabus, assignments, and test assessments for your assigned classes (via teaches table)' 
              : isAdmin
                ? 'Institutional master catalog of all academic subjects, curriculum modules, and enrolled student cohorts'
                : 'Explore and manage your registered course enrollments and syllabus across academic departments'}
          </p>
        </div>
        
        {isInstructor ? (
          <Link
            to="/quizzes"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Upload / Manage Tests
          </Link>
        ) : isAdmin ? (
          <Link
            to="/?tab=by-subject"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95"
          >
            <Users className="w-4 h-4" /> Enrolled Students by Subject
          </Link>
        ) : (
          <Link
            to="/enrollments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Registration Center
          </Link>
        )}
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses or course code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                deptFilter === dept
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading courses...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => (
            <div
              key={c.course_id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                    Code: {c.course_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="purple">{c.dept_name}</Badge>
                    {isInstructor ? (
                      <Badge variant="blue">Faculty in Charge</Badge>
                    ) : isAdmin ? (
                      <Badge variant="purple">{c.enrolled_count || 0} Enrolled</Badge>
                    ) : c.is_enrolled ? (
                      <Badge variant="green">Enrolled</Badge>
                    ) : (
                      <Badge variant="slate">Available</Badge>
                    )}
                  </div>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 leading-snug">
                  {c.course_name}
                </h3>
                
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isInstructor 
                      ? `You are primary instructor (Cabin ${currentUser.cabin_no || c.cabin_no || 'N/A'})` 
                      : `Prof. ${c.instructor_first || 'Staff'} ${c.instructor_last || ''} (Cabin ${c.cabin_no || 'N/A'})`}
                  </span>
                </div>

                {/* Course Metrics */}
                <div className="mt-6 grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <div className="font-extrabold text-slate-800">{c.module_count}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                      <Layers className="w-3 h-3 text-slate-400" /> Modules
                    </div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800">{c.assignment_count}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 text-slate-400" /> Assignments
                    </div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-800">{c.quiz_count}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                      <HelpCircle className="w-3 h-3 text-slate-400" /> Quizzes
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer / Action */}
              <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/courses/${c.course_id}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
                >
                  {isInstructor ? 'Manage Course & Tests' : 'View Details & Syllabus'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {!isInstructor && !isAdmin && !c.is_enrolled && (
                  <button
                    onClick={() => handleQuickEnroll(c.course_id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Quick Enroll
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => handleOpenCourseStudents(c)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" /> Enrolled Students ({c.enrolled_count || 0})
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredCourses.length === 0 && (
            <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No courses match your query.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search keywords.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin View Enrolled Students Modal */}
      {selectedCourseForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-md">
                  Code #{selectedCourseForModal.course_id} • {selectedCourseForModal.dept_name}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Enrolled Students: {selectedCourseForModal.course_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Lead Instructor: Prof. {selectedCourseForModal.instructor_first || 'Staff'} {selectedCourseForModal.instructor_last || ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingModalStudents ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                  Fetching enrolled students from database...
                </div>
              ) : modalStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No students are currently enrolled in this course.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {modalStudents.map(st => (
                    <div key={st.student_id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                          {st.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{st.first_name} {st.last_name}</div>
                          <div className="text-[11px] text-slate-400">ID: #{st.student_id} • {st.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">CGPA: {st.cgpa ? Number(st.cgpa).toFixed(2) : 'N/A'}</div>
                        <div className="text-[10px] text-slate-500">
                          Proctor: {st.proctor_first ? `Prof. ${st.proctor_first} ${st.proctor_last}` : 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Total Enrolled: {modalStudents.length} Student(s)
              </span>
              <Link
                to={`/?tab=by-subject&subjectId=${selectedCourseForModal.course_id}`}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                Open in Admin Oversight Dashboard →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
