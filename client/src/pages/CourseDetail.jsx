import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  HelpCircle, 
  User, 
  Mail, 
  Building, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Send, 
  MessageSquare, 
  Sparkles, 
  ShieldAlert, 
  PlusCircle, 
  Trash2, 
  Check, 
  AlertCircle, 
  Users, 
  FolderCheck,
  Paperclip,
  Upload,
  X,
  Network
} from 'lucide-react';
import { lmsApi, graphApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

const COURSE_PREREQUISITES = {
  301: 'Discrete Mathematics (CS201) & Data Structures and Algorithms (CS202)',
  302: 'Computer Systems Organization (CS203) & Operating Systems (CS204)',
  303: 'Engineering Physics (PH101) & Differential Calculus (MA102)',
  304: 'Engineering Mechanics (CE101) & Strength of Materials (CE201)',
  305: 'Programming in Python (CS105) & Linear Algebra and Statistics (MA205)',
  306: 'Database Management Systems (CS301) & Distributed Systems (CS304)',
  307: 'Basic Electrical & Electronic Engineering (EE101)',
  308: 'Probability, Statistics & Foundations of Data Science (CS210)'
};

export default function CourseDetail() {
  const { id } = useParams();
  const { currentUser, isAdmin, isStudent } = useAuth();
  const isInstructor = currentUser?.role === 'instructor';
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState('modules');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollNotice, setEnrollNotice] = useState(null);
  const [graphPrereqs, setGraphPrereqs] = useState(null);
  
  // Module Reading Material Modal State
  const [viewingModule, setViewingModule] = useState(null);
  const [readingLogged, setReadingLogged] = useState(false);
  
  // Submit Assignment Modal State (Students)
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Quiz Modal State (Take Quiz for Students, Inspector for Faculty)
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);

  // Instructor Upload Test Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadMarks, setUploadMarks] = useState(50);
  const [uploadQuestions, setUploadQuestions] = useState([
    {
      question_text: 'Which normal form eliminates transitive functional dependencies?',
      marks: 10,
      options: [
        { option_text: 'First Normal Form (1NF)', is_correct: 0 },
        { option_text: 'Second Normal Form (2NF)', is_correct: 0 },
        { option_text: 'Third Normal Form (3NF)', is_correct: 1 },
        { option_text: 'Boyce-Codd Normal Form (BCNF)', is_correct: 0 }
      ]
    },
    {
      question_text: 'What is the primary benefit of creating a B-Tree index on a foreign key attribute?',
      marks: 10,
      options: [
        { option_text: 'Accelerates relational JOIN queries and constraint checks', is_correct: 1 },
        { option_text: 'Reduces RAM footprint', is_correct: 0 },
        { option_text: 'Automatically enforces NOT NULL', is_correct: 0 },
        { option_text: 'Eliminates WAL logging', is_correct: 0 }
      ]
    }
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');

  // Feedback Form State
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Instructor Give Assignment Modal State
  const [showCreateAssignModal, setShowCreateAssignModal] = useState(false);
  const [newAssignName, setNewAssignName] = useState('');
  const [newAssignMarks, setNewAssignMarks] = useState(100);
  const [newAssignDueDate, setNewAssignDueDate] = useState('');
  const [creatingAssign, setCreatingAssign] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  const loadCourse = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [res, enrRes, prereqRes] = await Promise.all([
        lmsApi.getCourseDetails(id),
        lmsApi.getEnrollments().catch(() => ({ enrollments: [] })),
        graphApi.getPrerequisites(id).catch(() => null)
      ]);

      if (prereqRes?.success) {
        setGraphPrereqs(prereqRes);
      }

      // If user is instructor, enforce that they teach this course via teaches table
      if (isInstructor && res.course) {
        const teachesCourse = res.course.instructors?.some(
          inst => String(inst.instructor_id) === String(currentUser.id)
        );
        if (!teachesCourse) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      setCourseData(res);
      const enrolled = enrRes.enrollments?.some(e => e.student_id === currentUser.id && e.course_id === parseInt(id, 10));
      setIsEnrolled(Boolean(enrolled));
    } catch (err) {
      console.error('Failed to load course details:', err);
      if (isInstructor && (err.message.includes('Access Restricted') || err.message.includes('403') || err.message.includes('not assigned'))) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [id, currentUser?.id, currentUser?.role]);

  const handleToggleEnroll = async () => {
    setEnrolling(true);
    try {
      if (isEnrolled) {
        if (!window.confirm(`Are you sure you want to drop course ${courseData.course.course_name}?`)) return;
        await lmsApi.dropCourse(currentUser.id, parseInt(id, 10));
        setIsEnrolled(false);
        setEnrollNotice('Course dropped from database table enrolls.');
      } else {
        await lmsApi.enrollCourse(currentUser.id, parseInt(id, 10));
        setIsEnrolled(true);
        setEnrollNotice('Successfully registered for course in database table enrolls!');
      }
      setTimeout(() => setEnrollNotice(null), 3500);
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    setSubmittingAssignment(true);
    try {
      const parts = [];
      if (submissionUrl.trim()) parts.push(`Repository / Online Solution: ${submissionUrl.trim()}`);
      if (attachedFile) parts.push(`Attached File: ${attachedFile.name} (${(attachedFile.size / 1024).toFixed(1)} KB)`);
      if (submissionContent.trim()) parts.push(submissionContent.trim());
      const finalContent = parts.length > 0 ? parts.join('\n\n') : 'Completed coursework solution submitted.';

      await lmsApi.submitAssignment({
        student_id: currentUser?.id || 101,
        course_id: parseInt(id, 10),
        assignment_id: selectedAssignment.assignment_id,
        submission_date: new Date().toISOString().split('T')[0],
        submission_content: finalContent
      });
      setSubmissionSuccess(true);
      setTimeout(() => {
        setSubmissionSuccess(false);
        setSelectedAssignment(null);
        setSubmissionContent('');
        setSubmissionUrl('');
        setAttachedFile(null);
        fetchCourse();
      }, 1500);
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleStartQuiz = async (quiz) => {
    setSelectedQuiz(quiz);
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizAnswers({});
    setQuizAttempts([]);
    setQuizLoading(true);
    try {
      const res = await lmsApi.getQuizQuestions(quiz.quiz_id, parseInt(id, 10), isInstructor);
      setQuizQuestions(res.questions || []);
      setQuizAttempts(res.attempts || []);
    } catch (err) {
      console.error(err);
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleFinishQuiz = async () => {
    try {
      const res = await lmsApi.submitQuiz({
        student_id: currentUser.id,
        course_id: parseInt(id, 10),
        quiz_id: selectedQuiz.quiz_id,
        answers: quizAnswers
      });
      setQuizScore(res);
      setQuizSubmitted(true);
      if (currentUser?.id) {
        lmsApi.logStudySession(currentUser.id, 20, 'Good', `Quiz #${selectedQuiz.quiz_id} Assessment`).catch(() => {});
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Instructor Upload Test Actions
  const handleAddQuestion = () => {
    setUploadQuestions(prev => [
      ...prev,
      {
        question_text: `New Question ${prev.length + 1}`,
        marks: 10,
        options: [
          { option_text: 'Option A', is_correct: 1 },
          { option_text: 'Option B', is_correct: 0 },
          { option_text: 'Option C', is_correct: 0 },
          { option_text: 'Option D', is_correct: 0 }
        ]
      }
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (uploadQuestions.length <= 1) {
      alert('A test must contain at least 1 question.');
      return;
    }
    setUploadQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLoadSampleQuestions = () => {
    setUploadTitle('Database Concurrency & Transaction Test');
    setUploadMarks(30);
    setUploadQuestions([
      {
        question_text: 'Which ACID property guarantees that all database updates in a transaction succeed or all rollback?',
        marks: 10,
        options: [
          { option_text: 'Atomicity', is_correct: 1 },
          { option_text: 'Consistency', is_correct: 0 },
          { option_text: 'Isolation', is_correct: 0 },
          { option_text: 'Durability', is_correct: 0 }
        ]
      },
      {
        question_text: 'Which normal form eliminates transitive functional dependencies on non-prime attributes?',
        marks: 10,
        options: [
          { option_text: '1NF', is_correct: 0 },
          { option_text: '2NF', is_correct: 0 },
          { option_text: '3NF', is_correct: 1 },
          { option_text: 'BCNF', is_correct: 0 }
        ]
      },
      {
        question_text: 'What kind of locking protocol prevents cascading aborts in concurrent transaction execution?',
        marks: 10,
        options: [
          { option_text: 'Strict Two-Phase Locking (Strict 2PL)', is_correct: 1 },
          { option_text: 'Conservative 2PL', is_correct: 0 },
          { option_text: 'Basic Time-stamp Ordering', is_correct: 0 },
          { option_text: 'Optimistic Concurrency Control', is_correct: 0 }
        ]
      }
    ]);
  };

  const handleUploadTest = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      alert('Please enter a test title.');
      return;
    }
    setUploading(true);
    try {
      const res = await lmsApi.uploadQuiz({
        course_id: parseInt(id, 10),
        title: uploadTitle.trim(),
        total_marks: parseInt(uploadMarks, 10) || 50,
        questions: uploadQuestions
      });

      setUploadSuccessMessage(res.message);
      loadCourse();
      setTimeout(() => {
        setUploadSuccessMessage('');
        setShowUploadModal(false);
        setUploadTitle('');
      }, 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await lmsApi.submitFeedback({
        student_id: currentUser.id,
        course_id: parseInt(id, 10),
        instructor_id: courseData?.course?.instructor_id || 201,
        rating: parseInt(feedbackRating, 10),
        comments: feedbackText
      });
      setFeedbackSubmitted(true);
      setFeedbackText('');
      loadCourse();
      setTimeout(() => setFeedbackSubmitted(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCreateAssignmentInCourse = async (e) => {
    e.preventDefault();
    if (!newAssignName.trim() || !newAssignDueDate) {
      alert('Please fill out assignment name and due date.');
      return;
    }
    setCreatingAssign(true);
    try {
      const res = await lmsApi.createAssignment({
        course_id: parseInt(id, 10),
        name: newAssignName.trim(),
        marks: Number(newAssignMarks),
        due_date: newAssignDueDate
      });
      setAssignSuccessMsg(res.message || 'Assignment published successfully!');
      setTimeout(() => {
        setShowCreateAssignModal(false);
        setAssignSuccessMsg('');
        setNewAssignName('');
        setNewAssignMarks(100);
        setNewAssignDueDate('');
        loadCourse();
      }, 1500);
    } catch (err) {
      alert(`Failed to create assignment: ${err.message}`);
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleLoadSampleAssignmentInCourse = () => {
    setNewAssignName('Transactions, ACID Properties & Concurrency Control');
    setNewAssignMarks(100);
    const twoWeeksLater = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setNewAssignDueDate(twoWeeksLater);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold text-slate-500">Loading syllabus and course data...</p>
      </div>
    );
  }

  // Instructor Access Denied Boundary
  if (accessDenied) {
    return (
      <div className="py-12 animate-in fade-in max-w-xl mx-auto">
        <div className="p-8 sm:p-10 bg-white rounded-3xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider">
            Access Restricted
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Instructor Course Boundary
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You are logged in as an Instructor. According to the database relation <code>teaches(instructor_id, course_id)</code>, you are not assigned to teach Course <strong>#{id}</strong>. As an instructor, you can only view details and manage your own courses.
          </p>
          <div className="pt-3">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-transform active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> Return to My Assigned Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!courseData || !courseData.course) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <p className="font-bold text-slate-700">Course not found.</p>
        <Link to="/courses" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to courses
        </Link>
      </div>
    );
  }

  const { course, modules, assignments, quizzes } = courseData;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumb */}
      <Link to="/courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to {isInstructor ? 'my courses' : 'all courses'}
      </Link>

      {/* Bright Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="blue">Code: {course.course_id}</Badge>
              <Badge variant="purple">{course.dept_name} Department</Badge>
              {isInstructor ? (
                <Badge variant="blue" className="flex items-center gap-1">
                  <User className="w-3 h-3" /> You are Primary Instructor
                </Badge>
              ) : isEnrolled ? (
                <Badge variant="green" className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Registered
                </Badge>
              ) : (
                <Badge variant="slate">Available for Registration</Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {course.course_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Comprehensive undergraduate course syllabus, modular content, assignments, and test assessments.
            </p>

            {/* Academic Prerequisites (Powered by Neo4j Graph DAG) */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-2 bg-slate-100/80 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-medium">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Prerequisites:
                </span>
                {graphPrereqs?.allPrerequisites?.length > 0 ? (
                  <span className="flex items-center gap-1.5">
                    {graphPrereqs.allPrerequisites.map((p, idx) => (
                      <React.Fragment key={p.course_id}>
                        <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          {p.name} (CS-{p.course_id})
                        </span>
                        {idx < graphPrereqs.allPrerequisites.length - 1 && <span className="text-slate-400">&rarr;</span>}
                      </React.Fragment>
                    ))}
                  </span>
                ) : (
                  <span>{COURSE_PREREQUISITES[course.course_id] || 'Foundational course. No prior prerequisites required.'}</span>
                )}
              </div>

              {isAdmin && (
                <Link
                  to="/curriculum-graph"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors shadow-xs"
                >
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Explore in Knowledge Graph</span>
                </Link>
              )}
            </div>

            {/* Quick Enroll / Drop Action Button (Students only) */}
            {isStudent && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleToggleEnroll}
                  disabled={enrolling}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95 flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                    isEnrolled
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {enrolling ? 'Updating...' : isEnrolled ? 'Drop Course' : '+ Register in Course'}
                </button>
                {enrollNotice && (
                  <span className="text-xs font-bold text-emerald-700 animate-in fade-in flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {enrollNotice}
                  </span>
                )}
              </div>
            )}
            {isAdmin && (
              <div className="mt-4 flex items-center gap-3">
                <Link
                  to={`/?tab=by-subject&subjectId=${course.course_id}`}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4" /> View Enrolled Students
                </Link>
                <Link
                  to="/enrollments"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1.5"
                >
                  <FolderCheck className="w-4 h-4" /> Manage Registrations
                </Link>
              </div>
            )}
            {isInstructor && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('quizzes');
                    setShowUploadModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> + Upload New Test
                </button>
                <Link
                  to="/submissions"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Grade Submissions
                </Link>
              </div>
            )}
          </div>

          {/* Faculty Leads from teaches M:N */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 min-w-[280px]">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
              Faculty Lead{course.instructors && course.instructors.length > 1 ? 's' : ''} ({course.instructors?.length || 1})
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {(course.instructors && course.instructors.length > 0 ? course.instructors : [course]).map((inst, idx) => (
                <div key={inst.instructor_id || idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {inst.first_name ? inst.first_name[0] : (inst.instructor_first ? inst.instructor_first[0] : 'I')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      Prof. {inst.first_name || inst.instructor_first} {inst.last_name || inst.instructor_last}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 shrink-0" /> Cabin: {inst.cabin_no || 'TBA'}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {inst.email || inst.instructor_email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'modules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" /> Curriculum Modules ({modules.length})
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" /> Assignments ({assignments.length})
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'quizzes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" /> Quizzes & Tests ({quizzes.length})
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'feedback'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Instructor Feedback
          </button>
        </div>
      </div>

      {/* Tab 1: Modules */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Lecture Modules & Syllabus Breakdown</h3>
            <span className="text-xs text-slate-500 font-semibold">Total lecture hours: {modules.reduce((acc, m) => acc + (m.lecture_hours || 0), 0)} hrs</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {modules.map((m) => (
              <div key={m.module_no} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                    M{m.module_no}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {m.lecture_hours} Planned Lecture Hours
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
                    Completed
                  </span>
                  <button
                    onClick={() => {
                      setViewingModule(m);
                      setReadingLogged(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> View Material
                  </button>
                </div>
              </div>
            ))}

            {modules.length === 0 && (
              <p className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No modules registered for this course yet. Add one in the CRUD Studio.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Assignments */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Course Assignments</h3>
              <span className="text-xs text-slate-500">
                {isInstructor ? 'Manage coursework, schedule deadlines, and review submissions' : 'Submit coursework before due date'}
              </span>
            </div>
            {isInstructor && (
              <button
                onClick={() => {
                  setShowCreateAssignModal(true);
                  setAssignSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 shrink-0"
              >
                <PlusCircle className="w-4 h-4" /> + Give New Assignment
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((a) => (
              <div key={a.assignment_id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {a.status === 'GRADED' ? (
                      <Badge variant="green" className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Graded: {a.marks_obtained}/{a.marks} Marks
                      </Badge>
                    ) : a.status === 'LATE' ? (
                      <Badge variant="amber" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Submitted (Late)
                      </Badge>
                    ) : a.is_submitted ? (
                      <Badge variant="green" className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </Badge>
                    ) : (
                      <Badge variant="amber">Assignment #{a.assignment_id}</Badge>
                    )}
                    <span className="text-xs font-bold text-slate-700">Total: {a.marks} Marks</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">{a.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Due Date: <strong>{a.due_date}</strong>
                  </p>

                  {a.is_submitted && a.submission_date && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                      ✓ Submitted on {a.submission_date}
                    </p>
                  )}

                  {a.instructor_feedback && (
                    <div className="mt-2.5 p-2.5 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900">
                      <span className="font-bold block mb-0.5">Faculty Feedback:</span>
                      {a.instructor_feedback}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {a.is_submitted ? (a.status === 'GRADED' ? 'Evaluated' : 'Submitted') : 'Single Submission Allowed'}
                  </span>
                  {isInstructor ? (
                    <Link
                      to={`/submissions?courseId=${course.course_id}&assignmentId=${a.assignment_id}`}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3" /> Review Student Submissions
                    </Link>
                  ) : isAdmin ? (
                    <Link
                      to={`/submissions?courseId=${course.course_id}&assignmentId=${a.assignment_id}`}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3" /> View Submissions
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedAssignment(a);
                        setSubmissionContent(a.submission_content || '');
                        setSubmissionUrl('');
                        setAttachedFile(null);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 ${
                        a.is_submitted 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" /> 
                      {a.is_submitted ? (a.status === 'GRADED' ? 'Resubmit Solution' : 'Resubmit / Update File') : 'Submit Assignment'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {assignments.length === 0 && (
              <div className="col-span-2 p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No assignments scheduled for this course.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Scheduled Quizzes & Online Tests</h3>
              <p className="text-xs text-slate-500">
                {isInstructor 
                  ? 'Manage and upload relational test assessments for this course' 
                  : isAdmin
                    ? 'Curriculum test assessments and examination keys'
                    : 'Auto-graded objective assessments'}
              </p>
            </div>
            {isInstructor && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 shrink-0"
              >
                <PlusCircle className="w-4 h-4" /> + Upload New Test
              </button>
            )}
          </div>

          {uploadSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {uploadSuccessMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((q) => (
              <div key={q.quiz_id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="purple">Quiz #{q.quiz_id}</Badge>
                    <span className="text-xs font-bold text-slate-700">Max: {q.total_marks} Marks</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">{q.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Format: Multiple Choice Questions • Time: 30 Mins
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isInstructor || isAdmin ? 'Active in Curriculum' : 'Ready to Attempt'}
                  </span>
                  {isInstructor || isAdmin ? (
                    <button
                      onClick={() => handleStartQuiz(q)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs transition-transform active:scale-95"
                    >
                      View Test Questions & Key
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartQuiz(q)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95"
                    >
                      Take Quiz
                    </button>
                  )}
                </div>
              </div>
            ))}

            {quizzes.length === 0 && (
              <div className="col-span-2 p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                No quizzes scheduled for this course yet.
                {isInstructor && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                    >
                      <PlusCircle className="w-4 h-4" /> Upload First Test Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Feedback */}
      {activeTab === 'feedback' && (
        <div className={`grid grid-cols-1 ${isStudent ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Submit Feedback Form (Students Only) */}
          {isStudent && (
            !isEnrolled ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200/60">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Enrollment Required for Course Evaluation</h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                  Only students currently enrolled in <strong>{course.course_name}</strong> are authorized to submit curriculum and faculty feedback to database table <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">course_feedback</code>.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base text-slate-900">Course &amp; Faculty Evaluation</h3>
                  <Badge variant="purple">Table: course_feedback</Badge>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  {(courseData?.feedbacks || []).some(f => f.student_id === currentUser.id) 
                    ? `You have already evaluated ${course.course_name}. Submitting below will update your rating and remarks.`
                    : `Your feedback is recorded with check constraints (1-5 stars) and linked to course ${course.course_name}.`}
                </p>

                {feedbackSubmitted && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Feedback recorded and saved successfully in database table course_feedback!
                  </div>
                )}

                <form onSubmit={handleSendFeedback} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Overall Rating (1 - 5 Stars)</label>
                    <select
                      value={feedbackRating}
                      onChange={(e) => setFeedbackRating(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
                      <option value="4">⭐⭐⭐⭐ 4 - Very Good</option>
                      <option value="3">⭐⭐⭐ 3 - Satisfactory</option>
                      <option value="2">⭐⭐ 2 - Needs Improvement</option>
                      <option value="1">⭐ 1 - Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Remarks</label>
                    <textarea
                      rows="3"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="E.g., Great coverage of normalization, transactions, and indexing..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {submittingFeedback 
                      ? 'Saving Feedback...' 
                      : (courseData?.feedbacks || []).some(f => f.student_id === currentUser.id)
                        ? 'Update Evaluation'
                        : 'Submit Feedback'}
                  </button>
                </form>
              </div>
            )
          )}

          {/* Feedback Stats and Reviews History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {isInstructor ? 'Student Feedback & Course Evaluations' : 'Feedback Metrics & Reviews'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isInstructor ? 'Ratings and commentary received from enrolled students' : 'Aggregated student ratings'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-amber-500">★ {courseData.feedbackStats?.averageRating || '5.00'}</span>
                  <span className="text-xs text-slate-400 font-medium">({courseData.feedbackStats?.totalResponses || 0} reviews)</span>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {courseData.feedbacks && courseData.feedbacks.length > 0 ? (
                  courseData.feedbacks.map((fb, idx) => (
                    <div key={fb.feedback_no || idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">
                          {fb.student_first ? `${fb.student_first} ${fb.student_last}` : `Student #${fb.student_id}`}
                        </span>
                        <span className="text-amber-500 font-bold">
                          {'★'.repeat(fb.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (fb.rating || 5)))}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{fb.comments}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{fb.feedback_date ? String(fb.feedback_date).slice(0, 10) : 'Recent'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No student feedback logged for this course yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>View: <code>course_feedback_summary</code></span>
              <Badge variant="blue">Relational SQL View</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Submit Assignment Modal (Students) */}
      <Modal
        isOpen={isStudent && !!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title={`Submit: ${selectedAssignment?.name}`}
      >
        {submissionSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Submission Received!</h4>
            <p className="text-xs text-slate-500">
              Recorded into database table <code>submits</code> with current timestamp and auto-evaluated due-date status.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            <div className="p-3.5 bg-blue-50 rounded-xl text-xs text-blue-900">
              <p><strong>Course:</strong> {course.course_name} (Code: {course.course_id})</p>
              <p><strong>Assignment ID:</strong> {selectedAssignment?.assignment_id} • <strong>Marks:</strong> {selectedAssignment?.marks}</p>
              <p><strong>Due Date:</strong> {selectedAssignment?.due_date} • <strong>Student:</strong> {currentUser?.name || 'Student'} (ID: {currentUser?.id || 101})</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GitHub / Online Solution URL (Optional)</label>
              <input
                type="text"
                placeholder="https://github.com/your-username/solution"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attach File (PDF, SQL, ZIP, Code)
              </label>
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
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-xs truncate">
                      <span className="font-bold text-slate-800 block truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-slate-500">{(attachedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-semibold text-slate-600 block">Click to browse &amp; attach file</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, SQL, ZIP, TXT, DOCX (Max 25MB)</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Submission Notes / Solution Content / SQL Queries
              </label>
              <textarea
                rows="3"
                placeholder="Enter SQL queries, implementation notes, or description of your solution..."
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Saved directly to database table <code>submits.submission_content</code>
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedAssignment(null);
                  setAttachedFile(null);
                  setSubmissionUrl('');
                  setSubmissionContent('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAssignment}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingAssignment ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quiz Modal: Student Test Taking OR Instructor Answer Key Inspection */}
      <Modal
        isOpen={!!selectedQuiz}
        onClose={() => setSelectedQuiz(null)}
        title={isInstructor ? `Test Key & Inspection: ${selectedQuiz?.title}` : `Quiz Assessment: ${selectedQuiz?.title}`}
      >
        {isInstructor ? (
          // ==========================================
          // INSTRUCTOR VIEW: INSPECT QUESTIONS & ANSWER KEYS
          // ==========================================
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 flex justify-between items-center">
              <span><strong>Course:</strong> {course.course_name} (Code: {course.course_id})</span>
              <span><strong>Total:</strong> {selectedQuiz?.total_marks} Marks • <strong>Questions:</strong> {quizQuestions.length}</span>
            </div>

            {quizLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 font-semibold">
                Loading test questions and answer keys from relational tables <code>quiz_question</code> &amp; <code>quiz_option</code>...
              </div>
            ) : quizQuestions.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.question_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900 text-sm">
                        Q{qIdx + 1}. {q.question_text}
                      </p>
                      <span className="text-[11px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg shrink-0">
                        {q.marks} Marks
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options && q.options.map((opt) => {
                        const isCorrect = opt.is_correct === 1 || opt.is_correct === true;
                        return (
                          <div
                            key={opt.option_id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-slate-500 shrink-0">Opt {opt.option_id}:</span>
                              <span className="truncate">{opt.option_text}</span>
                            </div>
                            {isCorrect && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                                <Check className="w-3 h-3 text-emerald-600" /> Correct Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-xs text-slate-500">
                No questions found in <code>quiz_question</code> for this quiz.
              </p>
            )}

            {/* Student Attempts Summary */}
            {quizAttempts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h5 className="font-bold text-xs text-slate-800 mb-2">Student Attempts &amp; Evaluations ({quizAttempts.length})</h5>
                <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px]">
                  {quizAttempts.map((att) => (
                    <div key={att.attempt_id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{att.first_name} {att.last_name} ({att.email})</span>
                      <span className="font-extrabold text-emerald-700">{att.score} / {selectedQuiz?.total_marks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedQuiz(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        ) : (
          // ==========================================
          // STUDENT VIEW: TAKE QUIZ & GET REAL GRADE
          // ==========================================
          quizSubmitted && quizScore ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Quiz Completed!</h4>
              <div className="inline-block px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-3xl font-extrabold text-emerald-700">{quizScore.score} / {quizScore.total_marks}</div>
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mt-0.5">
                  Score: {quizScore.percentage}% Correct
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Your score was evaluated by checking option keys against relational tables <code>quiz_question</code> &amp; <code>quiz_option</code>, then recorded in <code>quiz_attempt</code>.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 flex justify-between items-center">
                <span><strong>Total Marks:</strong> {selectedQuiz?.total_marks}</span>
                <span><strong>Questions:</strong> {quizQuestions.length}</span>
              </div>

              {quizLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 font-semibold">
                  Loading test questions from relational database...
                </div>
              ) : quizQuestions.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.question_id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <p className="font-bold text-slate-900">
                        {qIdx + 1}. {q.question_text} <span className="text-[10px] text-purple-600 font-semibold">({q.marks} Mark{q.marks > 1 ? 's' : ''})</span>
                      </p>
                      <div className="space-y-1.5 text-slate-700">
                        {q.options && q.options.map((opt) => (
                          <label key={opt.option_id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name={`q_${q.question_id}`}
                              value={opt.option_id}
                              checked={quizAnswers[q.question_id] === opt.option_id}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [q.question_id]: opt.option_id }))}
                              className="text-blue-600"
                            />
                            <span className="font-semibold text-slate-800">{opt.option_letter || `Opt ${opt.option_id}`})</span>
                            <span>{opt.option_text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-6 text-center text-xs text-slate-500">
                  No questions found for this quiz in <code>quiz_question</code>.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedQuiz(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Exit
                </button>
                <button
                  type="button"
                  disabled={quizQuestions.length === 0}
                  onClick={handleFinishQuiz}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50"
                >
                  Submit Answers &amp; Grade
                </button>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* Instructor Upload New Test Modal */}
      {isInstructor && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title={`Upload New Test: ${course.course_name}`}
        >
          <form onSubmit={handleUploadTest} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl text-xs text-purple-900">
              <span><strong>Course:</strong> {course.course_name} (Code: {course.course_id})</span>
              <button
                type="button"
                onClick={handleLoadSampleQuestions}
                className="text-[11px] font-bold text-purple-700 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs"
              >
                ⚡ Load Sample DBMS Questions
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Test Title</label>
                <input
                  type="text"
                  placeholder="E.g. Unit 3 Examination on Transactions & Normalization"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={uploadMarks}
                  onChange={(e) => setUploadMarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Questions Builder */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Configured Questions ({uploadQuestions.length})</span>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> + Add Another Question
                </button>
              </div>

              {uploadQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-slate-800">Question #{qIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">Marks:</span>
                        <input
                          type="number"
                          value={q.marks}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 10;
                            setUploadQuestions(prev => prev.map((item, i) => i === qIdx ? { ...item, marks: val } : item));
                          }}
                          className="w-14 px-2 py-0.5 rounded-lg border border-slate-200 text-xs text-center"
                        />
                      </div>
                      {uploadQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows="2"
                    placeholder="Enter question prompt..."
                    value={q.question_text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUploadQuestions(prev => prev.map((item, i) => i === qIdx ? { ...item, question_text: val } : item));
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />

                  {/* 4 Options with Radio Selector for Correct Answer */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 block">Options (Select radio for correct answer):</span>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_opt_${qIdx}`}
                          checked={opt.is_correct === 1}
                          onChange={() => {
                            setUploadQuestions(prev => prev.map((item, i) => {
                              if (i !== qIdx) return item;
                              const updatedOptions = item.options.map((o, oi) => ({
                                ...o,
                                is_correct: oi === optIdx ? 1 : 0
                              }));
                              return { ...item, options: updatedOptions };
                            }));
                          }}
                          className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-500 w-5">{String.fromCharCode(65 + optIdx)})</span>
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUploadQuestions(prev => prev.map((item, i) => {
                              if (i !== qIdx) return item;
                              const updatedOptions = item.options.map((o, oi) => oi === optIdx ? { ...o, option_text: val } : o);
                              return { ...item, options: updatedOptions };
                            }));
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading ? 'Publishing Test...' : 'Upload & Publish Test to Database'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Module Reading Material & Lecture Notes Modal */}
      {viewingModule && (
        <Modal
          isOpen={!!viewingModule}
          onClose={() => {
            setViewingModule(null);
            setReadingLogged(false);
          }}
          title={`Module ${viewingModule.module_no}: ${viewingModule.name} — Reading Material`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-blue-900 text-sm">{viewingModule.name}</span>
                <p className="text-blue-700 mt-0.5">Part of {course.course_name} (Code: #{course.course_id})</p>
              </div>
              <Badge variant="blue">{viewingModule.lecture_hours} Lecture Hours</Badge>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                  📖 Core Curriculum & Conceptual Breakdown
                </h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  This module covers fundamental theoretical formulations and practical query paradigms for <strong>{viewingModule.name}</strong>. Key aspects include entity-relationship abstractions, functional dependencies, schema decomposition, execution plans, and performance optimization techniques.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                  📚 Recommended Textbooks & Academic Citations
                </h4>
                <ul className="list-disc list-inside space-y-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <li><strong>A. Silberschatz, H. F. Korth, S. Sudarshan</strong> — <em>Database System Concepts</em>, 7th Edition, McGraw-Hill.</li>
                  <li><strong>R. Elmasri, S. B. Navathe</strong> — <em>Fundamentals of Database Systems</em>, 7th Edition, Pearson.</li>
                  <li><strong>C. J. Date</strong> — <em>An Introduction to Database Systems</em>, 8th Edition, Addison-Wesley.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">
                  💡 Learning Outcomes & Verification Objectives
                </h4>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <p>• Formulate rigorous conceptual schemas free from modification and deletion anomalies.</p>
                  <p>• Verify primary and candidate superkeys using attribute closure algorithms.</p>
                  <p>• Write high-performance SQL queries conforming to relational algebra operators.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {currentUser?.role === 'student' && (
                <button
                  type="button"
                  disabled={readingLogged}
                  onClick={async () => {
                    try {
                      await lmsApi.logStudySession({
                        student_id: currentUser.id,
                        minutes: 20,
                        topic: `Reviewed Module ${viewingModule.module_no}: ${viewingModule.name}`
                      });
                      setReadingLogged(true);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {readingLogged ? 'Study Time Logged (+20m)' : 'Mark Reviewed & Log 20m Study'}
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setViewingModule(null);
                    setReadingLogged(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Close Handout
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Instructor Give Assignment Modal */}
      {isInstructor && showCreateAssignModal && (
        <Modal
          isOpen={showCreateAssignModal}
          onClose={() => setShowCreateAssignModal(false)}
          title={`Give Assignment for ${course.course_name}`}
        >
          {assignSuccessMsg ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Assignment Published!</h4>
              <p className="text-xs text-slate-500">
                {assignSuccessMsg}
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAssignmentInCourse} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">Coursework Authoring</span>
                  <span className="text-[11px] text-purple-700">Course: #{course.course_id} — {course.course_name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleAssignmentInCourse}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 shadow-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Load Sample
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignment Title / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transactions, ACID Properties & Concurrency Control"
                  value={newAssignName}
                  onChange={(e) => setNewAssignName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                    value={newAssignMarks}
                    onChange={(e) => setNewAssignMarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newAssignDueDate}
                    onChange={(e) => setNewAssignDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssign}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  {creatingAssign ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
