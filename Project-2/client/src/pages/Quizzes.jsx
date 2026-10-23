import React, { useEffect, useState } from 'react';
import { 
  HelpCircle, 
  Clock, 
  Award, 
  CheckCircle2, 
  Sparkles, 
  BookOpen,
  ArrowRight,
  PlusCircle,
  Trash2,
  Check,
  User,
  Users
} from 'lucide-react';
import { lmsApi } from '../services/api';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export default function Quizzes() {
  const { currentUser, isAdmin, isStudent } = useAuth();
  const isInstructor = currentUser?.role === 'instructor';
  const [quizzes, setQuizzes] = useState([]);
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  // Test Inspection / Attempt Modal State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});

  // Instructor Upload Test Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
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

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const [quizRes, coursesRes] = await Promise.all([
        lmsApi.getQuizzes(),
        isInstructor ? lmsApi.getCourses(null, currentUser.id).catch(() => ({ courses: [] })) : Promise.resolve({ courses: [] })
      ]);
      setQuizzes(quizRes.quizzes || []);
      if (isInstructor && coursesRes.courses) {
        setInstructorCourses(coursesRes.courses);
        if (coursesRes.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(coursesRes.courses[0].course_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [currentUser?.id, currentUser?.role]);

  const handleStart = async (quiz) => {
    setActiveQuiz(quiz);
    setCompleted(false);
    setResult(null);
    setAnswers({});
    setQuizAttempts([]);
    setQuizLoading(true);
    try {
      const res = await lmsApi.getQuizQuestions(quiz.quiz_id, quiz.course_id, isInstructor || isAdmin);
      setQuizQuestions(res.questions || []);
      setQuizAttempts(res.attempts || []);
    } catch (err) {
      console.error(err);
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      const res = await lmsApi.submitQuiz({
        student_id: currentUser.id,
        quiz_id: activeQuiz.quiz_id,
        course_id: activeQuiz.course_id,
        answers
      });
      setResult(res);
      setCompleted(true);
      if (currentUser?.id) {
        lmsApi.logStudySession(currentUser.id, 20, 'Good', `Quiz: ${activeQuiz.title}`).catch(() => {});
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
    const courseId = parseInt(selectedCourseId || (instructorCourses[0]?.course_id), 10);
    if (!courseId) {
      alert('Please select a course for this test.');
      return;
    }
    if (!uploadTitle.trim()) {
      alert('Please enter a test title.');
      return;
    }

    setUploading(true);
    try {
      const res = await lmsApi.uploadQuiz({
        course_id: courseId,
        title: uploadTitle.trim(),
        total_marks: parseInt(uploadMarks, 10) || 50,
        questions: uploadQuestions
      });

      setActionNotice(res.message);
      loadQuizzes();
      setTimeout(() => {
        setActionNotice('');
        setShowUploadModal(false);
        setUploadTitle('');
      }, 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isInstructor ? 'Course Tests & Online Assessments' : 'Quizzes & Online Assessments'}
          </h1>
          <p className="text-sm text-slate-500">
            {isInstructor 
              ? 'Upload, configure, and inspect relational test assessments for your assigned courses' 
              : 'Practice tests and graded objective examinations'}
          </p>
        </div>

        {isInstructor && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> + Upload New Test
          </button>
        )}
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {actionNotice}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading quizzes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((q) => (
            <div
              key={`${q.course_id}-${q.quiz_id}`}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-200 hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="purple">{q.course_name}</Badge>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {q.total_marks} Marks
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 leading-snug">
                  {q.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Course ID: {q.course_id} • Assessment #{q.quiz_id}
                </p>

                <div className="mt-4 p-3 rounded-xl bg-purple-50/50 border border-purple-100/80 text-xs text-purple-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-purple-600" /> Duration: 30 mins
                  </span>
                  <span className="font-bold text-purple-700">
                    {q.question_count ? `${q.question_count} Questions` : 'Multiple Choice'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isInstructor || isAdmin ? 'Published Test' : 'Open for Attempt'}
                </span>
                {isInstructor || isAdmin ? (
                  <button
                    onClick={() => handleStart(q)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    View Test &amp; Key <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(q)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    Take Test <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {quizzes.length === 0 && (
            <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No quizzes currently found.</p>
              <p className="text-xs text-slate-400">
                {isInstructor 
                  ? 'Click "+ Upload New Test" above to create and publish a test for your courses.' 
                  : 'Your course instructors have not scheduled active tests yet.'}
              </p>
              {isInstructor && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  <PlusCircle className="w-4 h-4" /> Upload Test Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quiz Modal: Student Test Taking OR Instructor/Admin Inspection */}
      <Modal
        isOpen={!!activeQuiz}
        onClose={() => setActiveQuiz(null)}
        title={isInstructor || isAdmin ? `Test Key & Questions: ${activeQuiz?.title}` : `Examination: ${activeQuiz?.title}`}
      >
        {isInstructor || isAdmin ? (
          // ==========================================
          // INSTRUCTOR & ADMIN VIEW: INSPECT QUESTIONS & ANSWER KEYS
          // ==========================================
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 flex justify-between items-center">
              <span><strong>Course:</strong> {activeQuiz?.course_name} (Code: {activeQuiz?.course_id})</span>
              <span><strong>Total:</strong> {activeQuiz?.total_marks} Marks • <strong>Questions:</strong> {quizQuestions.length}</span>
            </div>

            {quizLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-semibold">
                Loading test questions from relational database...
              </div>
            ) : quizQuestions.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {quizQuestions.map((q, idx) => (
                  <div key={q.question_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900 text-sm">
                        {idx + 1}. {q.question_text}
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
              <div className="p-6 text-center text-xs text-slate-400">
                No questions found in <code>quiz_question</code> for this quiz.
              </div>
            )}

            {/* Student Attempts Summary */}
            {quizAttempts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h5 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-600" /> Student Attempts Recorded ({quizAttempts.length})
                </h5>
                <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px]">
                  {quizAttempts.map((att) => (
                    <div key={att.attempt_id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{att.first_name} {att.last_name} ({att.email})</span>
                      <span className="font-extrabold text-emerald-700">{att.score} / {activeQuiz?.total_marks}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveQuiz(null)}
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
          completed && result ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Score Published!</h3>
              
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl inline-block min-w-[200px]">
                <div className="text-4xl font-extrabold text-emerald-700">
                  {result.score} <span className="text-sm font-bold text-emerald-900">/ {result.total_marks}</span>
                </div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">
                  Accuracy: {result.percentage}%
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Your test has been automatically graded against database table <code>quiz_option</code>.
              </p>

              <button
                onClick={() => setActiveQuiz(null)}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                Close &amp; Return
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-900 flex justify-between items-center">
                <span><strong>Course:</strong> {activeQuiz?.course_name}</span>
                <span><strong>Questions:</strong> {quizQuestions.length} • <strong>Total:</strong> {activeQuiz?.total_marks} Marks</span>
              </div>

              {quizLoading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-semibold">
                  Loading assessment questions from database table <code>quiz_question</code>...
                </div>
              ) : quizQuestions.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {quizQuestions.map((q, idx) => (
                    <div key={q.question_id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <p className="font-bold text-slate-900">
                        {idx + 1}. {q.question_text} <span className="text-[10px] text-purple-600 font-semibold">({q.marks} Mark{q.marks > 1 ? 's' : ''})</span>
                      </p>
                      <div className="space-y-1.5 text-slate-700">
                        {q.options && q.options.map((opt) => (
                          <label key={opt.option_id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-white transition-colors">
                            <input
                              type="radio"
                              name={`quiz_q_${q.question_id}`}
                              value={opt.option_id}
                              checked={answers[q.question_id] === opt.option_id}
                              onChange={() => setAnswers(prev => ({ ...prev, [q.question_id]: opt.option_id }))}
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
                <div className="p-6 text-center text-xs text-slate-400">
                  No questions currently found in <code>quiz_question</code> for this quiz.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={quizQuestions.length === 0}
                  onClick={handleSubmitQuiz}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs disabled:opacity-50"
                >
                  Submit &amp; Calculate Grade
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
          title="Upload / Create New Test"
        >
          <form onSubmit={handleUploadTest} className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl text-xs text-purple-900">
              <span><strong>Instructor:</strong> Prof. {currentUser?.name}</span>
              <button
                type="button"
                onClick={handleLoadSampleQuestions}
                className="text-[11px] font-bold text-purple-700 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs"
              >
                ⚡ Load Sample DBMS Questions
              </button>
            </div>

            {/* Course Selector (Restricted to Instructor's Courses from teaches) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold"
                required
              >
                {instructorCourses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_id} - {c.course_name} ({c.dept_name})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Only courses assigned to you in the <code>teaches</code> table are available.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Test Title</label>
                <input
                  type="text"
                  placeholder="E.g. Unit 3: Normalization & Indexing Examination"
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
                <span className="text-xs font-bold text-slate-800">Test Questions ({uploadQuestions.length})</span>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> + Add Question
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
                    placeholder="Enter question statement..."
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
                    <span className="text-[11px] font-bold text-slate-600 block">Multiple Choice Options (Select radio for correct answer):</span>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`upload_correct_opt_${qIdx}`}
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
    </div>
  );
}
