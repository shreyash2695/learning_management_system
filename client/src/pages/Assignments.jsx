import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  Send, 
  Sparkles,
  Filter,
  PlusCircle,
  Users,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Edit3,
  Check,
  Upload,
  X,
  Paperclip
} from 'lucide-react';
import { lmsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import DocumentCodeViewer from '../components/common/DocumentCodeViewer';

export default function Assignments() {
  const { currentUser, isAdmin, isInstructor, isStudent } = useAuth();
  
  const [assignments, setAssignments] = useState([]);
  const [teachingCourses, setTeachingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, SUBMITTED / NEEDS_GRADING, GRADED
  const [search, setSearch] = useState('');
  
  // Student Submit modal state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Instructor Give Assignment modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCourseId, setCreateCourseId] = useState('');
  const [createName, setCreateName] = useState('');
  const [createMarks, setCreateMarks] = useState(100);
  const [createDueDate, setCreateDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // Instructor Review & Grade Submissions Modal State
  const [reviewAssignment, setReviewAssignment] = useState(null);
  const [reviewSubmissions, setReviewSubmissions] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [gradingSub, setGradingSub] = useState(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingNotice, setGradingNotice] = useState('');

  const handleOpenReviewModal = async (assign) => {
    setReviewAssignment(assign);
    setGradingSub(null);
    setGradingNotice('');
    setReviewLoading(true);
    try {
      const res = await lmsApi.getSubmissions(currentUser.id, assign.course_id, assign.assignment_id);
      setReviewSubmissions(res.submissions || []);
    } catch (err) {
      console.error('Failed to load assignment submissions:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleStartGrading = (sub) => {
    setGradingSub(sub);
    setGradeMarks(sub.marks_obtained !== null && sub.marks_obtained !== undefined ? String(sub.marks_obtained) : '');
    setGradeFeedback(sub.instructor_feedback || 'Well structured coursework solution.');
    setGradingNotice('');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSub) return;
    setGradingLoading(true);
    setGradingNotice('');
    try {
      const awardedMarks = Number(gradeMarks);
      if (isNaN(awardedMarks) || awardedMarks < 0 || awardedMarks > reviewAssignment.marks) {
        alert(`Marks must be between 0 and ${reviewAssignment.marks}.`);
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

      setGradingNotice('Grade and feedback saved into submits table!');
      // Update local state
      setReviewSubmissions(prev => prev.map(s => 
        s.student_id === gradingSub.student_id ? { ...s, marks_obtained: awardedMarks, instructor_feedback: gradeFeedback.trim(), status: 'GRADED' } : s
      ));
      loadAssignments();
      setTimeout(() => {
        setGradingSub(null);
        setGradingNotice('');
      }, 1200);
    } catch (err) {
      alert(err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  const loadAssignments = async () => {
    setLoading(true);
    try {
      if (isInstructor) {
        const [assignRes, courseRes] = await Promise.all([
          lmsApi.getAssignments(null, currentUser.id),
          lmsApi.getCourses(null, currentUser.id)
        ]);
        setAssignments(assignRes.assignments || []);
        const courses = courseRes.courses || [];
        setTeachingCourses(courses);
        if (courses.length > 0 && !createCourseId) {
          setCreateCourseId(String(courses[0].course_id));
        }
      } else if (isAdmin) {
        const res = await lmsApi.getAssignments();
        setAssignments(res.assignments || []);
      } else {
        const res = await lmsApi.getAssignments(currentUser?.id || 101);
        setAssignments(res.assignments || []);
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadAssignments();
    }
  }, [currentUser?.id, currentUser?.role]);

  // Student Submits Coursework
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setSubmitting(true);
    try {
      let contentPayload = submissionContent?.trim() || '';
      if (solutionUrl?.trim()) {
        contentPayload = contentPayload ? `${contentPayload}\n\nRepository/Solution URL: ${solutionUrl.trim()}` : `Repository/Solution URL: ${solutionUrl.trim()}`;
      }
      if (attachedFile) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(attachedFile);
          });
          const base64 = await base64Promise;
          const uploadRes = await lmsApi.uploadFile(attachedFile.name, base64);
          if (uploadRes.success && uploadRes.fileUrl) {
            contentPayload = contentPayload 
              ? `${contentPayload}\n\nAttached File: ${uploadRes.fileUrl} (${attachedFile.name})`
              : `Attached File: ${uploadRes.fileUrl} (${attachedFile.name})`;
          }
        } catch (uploadErr) {
          console.warn('File upload fallback:', uploadErr.message);
          contentPayload = contentPayload 
            ? `${contentPayload}\n[Attached File: ${attachedFile.name} (${Math.round(attachedFile.size / 1024)} KB)]` 
            : `[Attached File: ${attachedFile.name} (${Math.round(attachedFile.size / 1024)} KB)]`;
        }
      }
      if (!contentPayload) {
        contentPayload = 'Assignment completed and submitted.';
      }

      await lmsApi.submitAssignment({
        student_id: currentUser?.id || 101,
        course_id: selectedAssignment.course_id,
        assignment_id: selectedAssignment.assignment_id,
        submission_date: new Date().toISOString().split('T')[0],
        submission_content: contentPayload
      });
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        setSelectedAssignment(null);
        setSubmissionContent('');
        setSolutionUrl('');
        setAttachedFile(null);
        loadAssignments();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Instructor Gives / Publishes New Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!createCourseId || !createName.trim() || !createDueDate) {
      alert('Please fill out all required fields.');
      return;
    }
    setCreating(true);
    try {
      const res = await lmsApi.createAssignment({
        course_id: parseInt(createCourseId, 10),
        name: createName.trim(),
        marks: Number(createMarks),
        due_date: createDueDate
      });
      setCreateSuccessMsg(res.message || 'Assignment published successfully!');
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccessMsg('');
        setCreateName('');
        setCreateMarks(100);
        setCreateDueDate('');
        loadAssignments();
      }, 1500);
    } catch (err) {
      alert(`Failed to create assignment: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleLoadSampleAssignment = () => {
    setCreateName('Relational Indexing & Query Execution Analysis');
    setCreateMarks(100);
    const twoWeeksLater = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setCreateDueDate(twoWeeksLater);
    if (teachingCourses.length > 0) {
      setCreateCourseId(String(teachingCourses[0].course_id));
    }
  };

  const filtered = assignments.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          (a.course_name && a.course_name.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    if (isInstructor) {
      if (filter === 'NEEDS_GRADING') return (a.submission_count || 0) > (a.graded_count || 0);
      if (filter === 'GRADED') return (a.submission_count || 0) > 0 && (a.submission_count === a.graded_count);
      return true;
    } else {
      if (filter === 'PENDING') return !a.is_submitted;
      if (filter === 'SUBMITTED') return a.is_submitted;
      return true;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isInstructor ? (
              <>
                <Badge variant="purple">Faculty Coursework Lead</Badge>
                <Badge variant="blue">{teachingCourses.length} Assigned Course(s)</Badge>
              </>
            ) : isAdmin ? (
              <Badge variant="purple">Institutional Coursework Oversight</Badge>
            ) : (
              <Badge variant="blue">Student Coursework</Badge>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isInstructor ? 'Course Assignments & Grading' : isAdmin ? 'University Curriculum Assignments' : 'Assignments & Submissions'}
          </h1>
          <p className="text-sm text-slate-500">
            {isInstructor 
              ? 'Author and give assignments, schedule deadlines and maximum marks, and evaluate student coursework submissions.'
              : isAdmin
                ? 'Master institutional catalog of all course assignments, deadlines, maximum marks, and submissions across university curricula.'
                : 'Track semester coursework deadlines, total marks, and submit responses.'}
          </p>
        </div>

        {isInstructor && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateSuccessMsg('');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-transform active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> + Give New Assignment
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignment or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({assignments.length})
          </button>

          {isInstructor ? (
            <>
              <button
                onClick={() => setFilter('NEEDS_GRADING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === 'NEEDS_GRADING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Needs Grading ({assignments.filter(a => (a.submission_count || 0) > (a.graded_count || 0)).length})
              </button>
              <button
                onClick={() => setFilter('GRADED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === 'GRADED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Evaluated ({assignments.filter(a => (a.submission_count || 0) > 0 && (a.submission_count === a.graded_count)).length})
              </button>
            </>
          ) : isAdmin ? null : (
            <>
              <button
                onClick={() => setFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending ({assignments.filter(a => !a.is_submitted).length})
              </button>
              <button
                onClick={() => setFilter('SUBMITTED')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === 'SUBMITTED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Submitted ({assignments.filter(a => a.is_submitted).length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading coursework assignments...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div
              key={`${a.course_id}-${a.assignment_id}`}
              className={`bg-white rounded-2xl border shadow-xs transition-all p-6 flex flex-col justify-between ${
                isInstructor ? 'border-slate-200 hover:border-purple-300 hover:shadow-md' : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="blue">{a.course_name}</Badge>
                  {isInstructor ? (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                      Assignment #{a.assignment_id}
                    </span>
                  ) : a.status === 'GRADED' ? (
                    <Badge variant="green" className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Graded: {a.marks_obtained ?? 0}/{a.marks}
                    </Badge>
                  ) : a.status === 'LATE' ? (
                    <Badge variant="amber" className="flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3" /> Submitted (Late)
                    </Badge>
                  ) : a.is_submitted ? (
                    <Badge variant="green" className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Submitted
                    </Badge>
                  ) : (
                    <Badge variant="amber" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </Badge>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                  {a.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Course ID: #{a.course_id} • {a.dept_name || 'Academic'} Department
                </p>

                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Weight</span>
                    <span className="font-extrabold text-slate-800 text-sm">{a.marks} Marks</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Due Date</span>
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> {a.due_date}
                    </span>
                  </div>
                </div>

                {/* Submission Metrics for Instructors */}
                {isInstructor && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled</span>
                      <span className="font-bold text-slate-800 text-xs">{a.total_students || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-[10px] uppercase font-bold text-blue-600 block">Submitted</span>
                      <span className="font-bold text-blue-700 text-xs">{a.submission_count || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Graded</span>
                      <span className="font-bold text-emerald-700 text-xs">{a.graded_count || 0}</span>
                    </div>
                  </div>
                )}

                {!isInstructor && !isAdmin && a.is_submitted && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      ✓ Submitted on {a.submission_date || 'Recently'}
                    </p>
                    {a.instructor_feedback && (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-900">
                        <span className="text-purple-700 font-bold block text-[10px] uppercase tracking-wider">Instructor Feedback</span>
                        <p className="mt-0.5">{a.instructor_feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                {isInstructor ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReviewModal(a)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-98"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Review &amp; Grade ({a.submission_count || 0})
                    </button>
                    <Link
                      to={`/submissions?courseId=${a.course_id}&assignmentId=${a.assignment_id}`}
                      title="Open in Submissions Workspace"
                      className="p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : isAdmin ? (
                  <Link
                    to={`/submissions?courseId=${a.course_id}&assignmentId=${a.assignment_id}`}
                    className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Student Submissions ({a.submission_count || 0})
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedAssignment(a);
                      setSubmissionContent(a.submission_content || '');
                      setSolutionUrl('');
                      setAttachedFile(null);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      a.is_submitted
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {a.is_submitted ? 'Resubmit / Update File' : 'Submit Assignment'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No assignments found matching your filter.</p>
              {isInstructor && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white"
                >
                  <PlusCircle className="w-4 h-4" /> + Give Your First Assignment
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* STUDENT SUBMISSION MODAL */}
      {!isInstructor && !isAdmin && selectedAssignment && (
        <Modal
          isOpen={!isInstructor && !isAdmin && !!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          title={`Submit Coursework: ${selectedAssignment?.name}`}
        >
          {successNotice ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Submission Recorded!</h4>
              <p className="text-xs text-slate-500">
                Your submission has been logged to table <code>submits</code> in the database.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-900">
                <p><strong>Course:</strong> {selectedAssignment?.course_name}</p>
                <p><strong>Marks:</strong> {selectedAssignment?.marks} • <strong>Due:</strong> {selectedAssignment?.due_date}</p>
                <p><strong>Student:</strong> {currentUser.name} (ID: {currentUser.id})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GitHub / Project Repository URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/username/project-repo"
                  value={solutionUrl}
                  onChange={(e) => setSolutionUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Solution Notes / SQL Code / Implementation Details
                </label>
                <textarea
                  rows="3"
                  placeholder="Type or paste your coursework solution, SQL queries, or implementation notes..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Saved into relational database table <code>submits.submission_content</code>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attach Solution Document / Code Archive (Optional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                {attachedFile ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-blue-900 truncate">{attachedFile.name}</p>
                        <p className="text-[10px] text-blue-600">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white/60 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-center bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-slate-600">Choose a file or click to browse</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, ZIP, DOCX, SQL, or Code files (Max 25MB)</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  {submitting ? 'Uploading...' : 'Confirm Submit'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* INSTRUCTOR GIVE / CREATE ASSIGNMENT MODAL */}
      {isInstructor && showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Give New Coursework Assignment"
        >
          {createSuccessMsg ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Assignment Published!</h4>
              <p className="text-xs text-slate-500">
                {createSuccessMsg}
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">Faculty Assignment Authoring</span>
                  <span className="text-[11px] text-purple-700">Inserts atomically into table <code>assignment</code> with audit trail</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleAssignment}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 shadow-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Load Sample DBMS Assignment
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Course to Assign
                </label>
                <select
                  value={createCourseId}
                  onChange={(e) => setCreateCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  required
                >
                  {teachingCourses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      Course #{c.course_id} — {c.course_name} ({c.dept_name || 'Dept'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Restricted to courses assigned to you in table <code>teaches</code>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignment Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. B-Tree Indexing & Query Execution Assignment"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={createMarks}
                    onChange={(e) => setCreateMarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Governs trigger checks on student grading.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Submissions after date marked LATE.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  {creating ? 'Publishing...' : 'Give & Publish Assignment'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* INSTRUCTOR REVIEW & GRADE SUBMISSIONS MODAL */}
      {isInstructor && reviewAssignment && (
        <Modal
          isOpen={!!reviewAssignment}
          onClose={() => {
            setReviewAssignment(null);
            setGradingSub(null);
          }}
          title={gradingSub ? `Evaluate Submission: ${gradingSub.first_name} ${gradingSub.last_name}` : `Submissions: ${reviewAssignment.name}`}
          maxWidth={gradingSub ? "max-w-5xl" : "max-w-2xl"}
        >
          {gradingSub ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Solution Previewer (Code / Document / Repo) */}
              <div className="lg:col-span-7 flex flex-col">
                <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Submission Inspector &amp; Code Previewer
                </label>
                <div className="flex-1 min-h-[380px]">
                  <DocumentCodeViewer
                    content={gradingSub.submission_content}
                    filename={gradingSub.assignment_name || reviewAssignment.name}
                    height="h-[430px]"
                  />
                </div>
              </div>

              {/* Right Column: Grading & Feedback Controls */}
              <div className="lg:col-span-5">
                <form onSubmit={handleSaveGrade} className="space-y-4">
                  <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200/70 text-xs text-purple-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-purple-950">
                        {gradingSub.first_name} {gradingSub.last_name}
                      </span>
                      <Badge variant="purple">Roll #{gradingSub.student_id}</Badge>
                    </div>
                    <p><strong>Course:</strong> {reviewAssignment.course_name} (#{reviewAssignment.course_id})</p>
                    <p><strong>Max Marks:</strong> {reviewAssignment.marks} Marks • <strong>Due:</strong> {reviewAssignment.due_date}</p>
                    <p><strong>Submitted:</strong> {gradingSub.submission_date} ({gradingSub.status})</p>
                  </div>

                  {/* Marks input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Marks Awarded <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-purple-700">
                        Max: {reviewAssignment.marks} Marks
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={reviewAssignment.marks}
                      value={gradeMarks}
                      onChange={(e) => setGradeMarks(e.target.value)}
                      placeholder={`0 to ${reviewAssignment.marks}`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instructor Remarks / Evaluation Feedback <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setGradeFeedback('Outstanding solution! Clean schema, optimized queries, and correct business logic.')}
                        className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-purple-700 hover:bg-purple-100"
                      >
                        ⭐ Outstanding
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeFeedback('Good effort. Verify edge cases and index performance.')}
                        className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-purple-700 hover:bg-purple-100"
                      >
                        👍 Good Work
                      </button>
                    </div>
                    <textarea
                      rows="3"
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      placeholder="Constructive feedback on query design, schema, or implementation..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      required
                    />
                  </div>

                  {gradingNotice && (
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 font-bold border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {gradingNotice}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setGradingSub(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      ← Back to List
                    </button>
                    <button
                      type="submit"
                      disabled={gradingLoading}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {gradingLoading ? 'Saving...' : 'Save Grade & Feedback'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between text-xs text-purple-900">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{reviewAssignment.name}</span>
                  <span className="text-purple-700 font-medium">{reviewAssignment.course_name} • Max: {reviewAssignment.marks} Marks</span>
                </div>
                <Link
                  to={`/submissions?courseId=${reviewAssignment.course_id}&assignmentId=${reviewAssignment.assignment_id}`}
                  className="px-3 py-1.5 bg-white text-purple-700 font-bold rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 shadow-xs"
                >
                  Submissions Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {reviewLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading submissions...</div>
              ) : reviewSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No Student Submissions Yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Students enrolled in {reviewAssignment.course_name} have not yet submitted responses for Assignment #{reviewAssignment.assignment_id}.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {reviewSubmissions.map((sub, sIdx) => {
                    const isGraded = sub.marks_obtained !== null && sub.marks_obtained !== undefined;
                    return (
                      <div key={sIdx} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {sub.first_name} {sub.last_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">#{sub.student_id}</span>
                            {isGraded ? (
                              <Badge variant="green" className="text-[10px]">Graded: {sub.marks_obtained}/{reviewAssignment.marks}</Badge>
                            ) : (
                              <Badge variant="amber" className="text-[10px]">Needs Grading</Badge>
                            )}
                          </div>

                          <p className="text-xs font-mono text-slate-600 mt-1 line-clamp-1 bg-slate-50 p-1 rounded">
                            {sub.submission_content || 'Assignment uploaded.'}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                            <span>Submitted: {sub.submission_date}</span>
                            {sub.instructor_feedback && (
                              <span className="text-purple-700 italic">Feedback: {sub.instructor_feedback}</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleStartGrading(sub)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                            isGraded
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isGraded ? 'Edit Grade' : 'Grade Submission'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReviewAssignment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
