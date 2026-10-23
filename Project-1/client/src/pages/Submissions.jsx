import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Send, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Award,
  FileText,
  Filter,
  Clock,
  AlertCircle,
  Edit3,
  BookOpen,
  Sparkles,
  Users,
  Check
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function Submissions() {
  const { currentUser, isStudent, isInstructor, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || 'ALL';
  const initialAssignmentId = searchParams.get('assignmentId') || 'ALL';

  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);
  const [selectedAssignment, setSelectedAssignment] = useState(initialAssignmentId);
  const [statusFilter, setStatusFilter] = useState(isStudent ? 'MY' : 'ALL'); // 'ALL', 'PENDING', 'GRADED', 'MY'

  // Grading Modal State
  const [gradingSub, setGradingSub] = useState(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingNotice, setGradingNotice] = useState(null);

  // Sync state if URL params change
  useEffect(() => {
    const cId = searchParams.get('courseId');
    const aId = searchParams.get('assignmentId');
    if (cId) setSelectedCourse(cId);
    if (aId) setSelectedAssignment(aId);
  }, [searchParams]);

  // Ensure faculty doesn't get locked into 'MY' view
  useEffect(() => {
    if ((isInstructor || isAdmin) && statusFilter === 'MY') {
      setStatusFilter('ALL');
    }
  }, [isInstructor, isAdmin, statusFilter]);

  // Load instructor's assigned courses for the dropdown filter
  useEffect(() => {
    if (currentUser?.id) {
      if (isInstructor) {
        lmsApi.getCourses(null, currentUser.id)
          .then(res => setCourses(res.courses || []))
          .catch(err => console.error('Error fetching courses:', err));
      } else {
        lmsApi.getCourses()
          .then(res => setCourses(res.courses || []))
          .catch(err => console.error('Error fetching courses:', err));
      }
    }
  }, [currentUser?.id, isInstructor]);

  const fetchSubmissions = () => {
    setLoading(true);
    const instId = isInstructor ? currentUser.id : null;
    const cId = selectedCourse !== 'ALL' ? selectedCourse : null;
    const aId = selectedAssignment !== 'ALL' ? selectedAssignment : null;

    lmsApi.getSubmissions(instId, cId, aId)
      .then(res => setSubmissions(res.submissions || []))
      .catch(err => console.error('Error fetching submissions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchSubmissions();
    }
  }, [currentUser?.id, selectedCourse, selectedAssignment]);

  const openGradingModal = (sub) => {
    if (!isInstructor) return;
    setGradingSub(sub);
    setGradeMarks(sub.marks_obtained !== null && sub.marks_obtained !== undefined ? String(sub.marks_obtained) : '');
    setGradeFeedback(sub.instructor_feedback || 'Well structured and accurate coursework submission.');
    setGradingNotice(null);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!isInstructor || !gradingSub) return;
    setGradingLoading(true);
    setGradingNotice(null);
    try {
      const awardedMarks = Number(gradeMarks);
      if (isNaN(awardedMarks) || awardedMarks < 0 || awardedMarks > gradingSub.marks) {
        alert(`Please enter a valid mark between 0 and ${gradingSub.marks}.`);
        setGradingLoading(false);
        return;
      }

      await lmsApi.gradeSubmission({
        student_id: gradingSub.student_id,
        course_id: gradingSub.course_id,
        assignment_id: gradingSub.assignment_id,
        marks_obtained: awardedMarks,
        instructor_feedback: gradeFeedback.trim(),
        status: 'GRADED'
      });

      setGradingNotice(`Marks (${awardedMarks}/${gradingSub.marks}) and feedback successfully committed to database table submits!`);
      fetchSubmissions();
      setTimeout(() => {
        setGradingSub(null);
        setGradingNotice(null);
      }, 1400);
    } catch (err) {
      alert(`Grading Error: ${err.message}`);
    } finally {
      setGradingLoading(false);
    }
  };

  const handleQuickFeedback = (feedbackText) => {
    setGradeFeedback(feedbackText);
  };

  // Derive counts
  const totalCount = submissions.length;
  const pendingCount = submissions.filter(s => s.marks_obtained === null || s.status !== 'GRADED').length;
  const gradedCount = submissions.filter(s => s.marks_obtained !== null || s.status === 'GRADED').length;
  const myCount = submissions.filter(s => s.student_id === currentUser?.id).length;

  // Filter logic
  const filtered = submissions.filter(sub => {
    const s = search.toLowerCase();
    const st = `${sub.first_name} ${sub.last_name}`.toLowerCase();
    const matchesSearch = st.includes(s) || 
                          (sub.assignment_name && sub.assignment_name.toLowerCase().includes(s)) || 
                          (sub.course_name && sub.course_name.toLowerCase().includes(s)) ||
                          (sub.submission_content && sub.submission_content.toLowerCase().includes(s));
    if (!matchesSearch) return false;

    // Course dropdown filter
    if (selectedCourse !== 'ALL' && String(sub.course_id) !== String(selectedCourse)) {
      return false;
    }

    // Assignment dropdown filter
    if (selectedAssignment !== 'ALL' && String(sub.assignment_id) !== String(selectedAssignment)) {
      return false;
    }

    // Status tabs filter
    if (statusFilter === 'MY') {
      return sub.student_id === currentUser?.id;
    }
    if (statusFilter === 'PENDING') {
      return sub.marks_obtained === null || sub.status !== 'GRADED';
    }
    if (statusFilter === 'GRADED') {
      return sub.marks_obtained !== null || sub.status === 'GRADED';
    }

    return true;
  });

  const canGrade = isInstructor;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isInstructor ? (
              <>
                <Badge variant="purple">Faculty Evaluation Portal</Badge>
                <Badge variant="blue">Courses Taught: {courses.length}</Badge>
              </>
            ) : isStudent ? (
              <Badge variant="blue">Student Submissions Record</Badge>
            ) : (
              <Badge variant="green">Administrator Oversight</Badge>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isInstructor ? 'Assignment Submissions & Grading' : isAdmin ? 'University Submissions Records' : 'My Coursework Submissions'}
          </h1>
          <p className="text-sm text-slate-500">
            {isInstructor 
              ? 'Evaluate coursework responses, enter verified marks, and provide constructive feedback logged to table submits'
              : isAdmin
                ? 'Institutional audit record of coursework submissions, timestamps, and faculty grading marks across university curricula.'
                : 'Review submitted assignments, dates, and awarded instructor marks.'}
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
            <span className="font-extrabold text-slate-900 text-sm">{totalCount}</span>
          </div>
          <div className="px-3.5 py-2 bg-amber-50 rounded-xl border border-amber-200/60 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Needs Grading</span>
            <span className="font-extrabold text-amber-800 text-sm">{pendingCount}</span>
          </div>
          <div className="px-3.5 py-2 bg-emerald-50 rounded-xl border border-emerald-200/60 shadow-xs text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Evaluated</span>
            <span className="font-extrabold text-emerald-800 text-sm">{gradedCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, course, or solution..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Course Dropdown Filter */}
          <div className="w-full sm:w-52">
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedAssignment('ALL');
                setSearchParams(e.target.value === 'ALL' ? {} : { courseId: e.target.value });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              <option value="ALL">All Assigned Courses</option>
              {courses.map(c => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_name} (#{c.course_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View / Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {isStudent && (
            <button
              onClick={() => setStatusFilter('MY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'MY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Submissions ({myCount})
            </button>
          )}

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalCount})
          </button>

          {(isInstructor || isAdmin) && (
            <>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Needs Grading ({pendingCount})
              </button>

              <button
                onClick={() => setStatusFilter('GRADED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'GRADED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Graded ({gradedCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Filter Notice if filtered by query params */}
      {(selectedCourse !== 'ALL' || selectedAssignment !== 'ALL') && (
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200/60 text-xs text-purple-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>
              Filtered by: <strong>Course #{selectedCourse}</strong>
              {selectedAssignment !== 'ALL' && <span> • <strong>Assignment #{selectedAssignment}</strong></span>}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedCourse('ALL');
              setSelectedAssignment('ALL');
              setSearchParams({});
            }}
            className="text-purple-700 hover:text-purple-900 font-bold underline"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Submissions Table */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading submissions from database...
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Assignment</th>
                  <th className="px-6 py-4">Submitted Solution / Notes</th>
                  <th className="px-6 py-4">Marks Awarded</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((sub, idx) => {
                  const isGraded = sub.status === 'GRADED' || (sub.marks_obtained !== null && sub.marks_obtained !== undefined);
                  const isLate = sub.status === 'LATE';

                  return (
                    <tr key={`${sub.course_id}-${sub.assignment_id}-${sub.student_id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Student Info */}
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-extrabold shrink-0 border border-purple-200">
                            {sub.first_name ? sub.first_name[0] : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{sub.first_name} {sub.last_name}</span>
                              {sub.student_id === currentUser?.id && (
                                <Badge variant="green" className="text-[10px] py-0 px-1.5">You</Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Roll No / ID: #{sub.student_id} {sub.student_email && `• ${sub.student_email}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {sub.course_name}
                        <span className="block text-[10px] text-slate-400 font-normal">Code: #{sub.course_id}</span>
                      </td>

                      {/* Assignment */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {sub.assignment_name}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Assignment #{sub.assignment_id} • Max Weight: {sub.marks} Marks
                        </span>
                      </td>

                      {/* Submission Solution Preview */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-800 line-clamp-2" title={sub.submission_content}>
                          {sub.submission_content || 'Completed coursework solution.'}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" /> Submitted: {sub.submission_date}
                        </span>
                        {sub.instructor_feedback && (
                          <p className="text-[10px] text-purple-800 italic mt-1 bg-purple-50/80 p-1.5 rounded-lg border border-purple-100">
                            <strong>Feedback:</strong> {sub.instructor_feedback}
                          </p>
                        )}
                      </td>

                      {/* Marks Obtained */}
                      <td className="px-6 py-4">
                        {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="font-extrabold text-emerald-700 text-sm">
                              {sub.marks_obtained}
                            </span>
                            <span className="text-slate-400 font-semibold text-xs">/ {sub.marks}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" /> Pending Grade
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        {isGraded ? (
                          <Badge variant="green" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Graded
                          </Badge>
                        ) : isLate ? (
                          <Badge variant="amber" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Late Submission
                          </Badge>
                        ) : (
                          <Badge variant="blue" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        )}
                      </td>

                      {/* Action Button: Evaluate / Grade (Faculty only) */}
                      <td className="px-6 py-4 text-right">
                        {canGrade ? (
                          <button
                            onClick={() => openGradingModal(sub)}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ml-auto transition-all shadow-xs ${
                              isGraded
                                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            {isGraded ? 'Edit Grade' : 'Evaluate & Grade'}
                          </button>
                        ) : isAdmin ? (
                          <span className="text-xs font-semibold text-slate-500">
                            {isGraded ? `Awarded: ${sub.marks_obtained}/${sub.marks}` : 'Awaiting Faculty Grade'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No submissions found matching criteria.</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isInstructor ? 'No student coursework submitted yet for the selected course or filter.' : 'You have not submitted any assignments matching this view.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade Submission Modal (Instructor only) */}
      <Modal
        isOpen={isInstructor && !!gradingSub}
        onClose={() => setGradingSub(null)}
        title={`Faculty Evaluation & Grading`}
      >
        {gradingNotice ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Graded Successfully!</h4>
            <p className="text-xs text-slate-600">{gradingNotice}</p>
          </div>
        ) : (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            {/* Student & Course Summary Banner */}
            <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1.5">
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-1.5">
                <span className="font-bold text-purple-950 text-sm">
                  {gradingSub?.assignment_name}
                </span>
                <span className="font-bold px-2 py-0.5 bg-purple-200/80 text-purple-900 rounded-lg">
                  Max: {gradingSub?.marks} Marks
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <p><strong>Student:</strong> {gradingSub?.first_name} {gradingSub?.last_name} (#{gradingSub?.student_id})</p>
                <p><strong>Course:</strong> {gradingSub?.course_name} (#{gradingSub?.course_id})</p>
                <p><strong>Submitted On:</strong> {gradingSub?.submission_date}</p>
                <p><strong>Status:</strong> {gradingSub?.status}</p>
              </div>
            </div>

            {/* Student's Submitted Content Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student's Submitted Solution / Code / Notes
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {gradingSub?.submission_content || 'No text notes provided with file upload.'}
              </div>
            </div>

            {/* Marks Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Marks Obtained <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-bold text-purple-700">
                  Allowed Range: 0 to {gradingSub?.marks}
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={gradingSub?.marks}
                value={gradeMarks}
                onChange={(e) => setGradeMarks(e.target.value)}
                placeholder={`Enter marks (0 - ${gradingSub?.marks})`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
                autoFocus
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Enforced by SQL Trigger <code>trg_submission_marks_check_update</code>.
              </span>
            </div>

            {/* Instructor Remarks & Feedback */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Instructor Remarks / Constructive Feedback <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Recorded in submits.instructor_feedback</span>
              </div>
              
              {/* Quick preset buttons */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => handleQuickFeedback('Outstanding solution! Query execution plan and relational design are well executed.')}
                  className="px-2 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 rounded-lg text-[10px] font-medium transition-colors"
                >
                  ⭐ Outstanding
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFeedback('Good effort. Review BCNF normal form decomposition for further optimization.')}
                  className="px-2 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 rounded-lg text-[10px] font-medium transition-colors"
                >
                  👍 Good with remarks
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFeedback('Incomplete submission. Missing relational algebra and SQL DDL statements.')}
                  className="px-2 py-1 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-lg text-[10px] font-medium transition-colors"
                >
                  ⚠️ Incomplete
                </button>
              </div>

              <textarea
                rows="3"
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder="Type constructive evaluation feedback for the student..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGradingSub(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={gradingLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {gradingLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Grade...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Grade &amp; Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
