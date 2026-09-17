import express from 'express';
import {
  getDashboardData,
  getCourses,
  getCourseDetails,
  getAssignments,
  createAssignment,
  submitAssignment,
  gradeAssignment,
  getQuizzes,
  getQuizQuestions,
  submitQuiz,
  uploadQuiz,
  getModules,
  getInstructors,
  getProctors,
  getStudents,
  getAnalytics,
  getEnrollments,
  enrollCourse,
  dropCourse,
  getSubmissions,
  submitCourseFeedback,
  getCourseFeedbackSummary,
  getStudentProfile,
  updateStudentPhone,
  updateStudentPassword,
  logStudySession,
  getInstructorProfile,
  updateInstructorPhone,
  updateInstructorCabin,
  updateInstructorPassword,
  // Phase 12: Enrollment Approval Workflow
  requestEnrollment,
  getEnrollmentRequests,
  approveEnrollmentRequest,
  getInstructorNotifications,
  markNotificationRead
} from '../controllers/lmsController.js';


const router = express.Router();

router.get('/dashboard', getDashboardData);
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseDetails);
router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.post('/submissions', submitAssignment);
router.post('/submissions/grade', gradeAssignment);
router.get('/submissions', getSubmissions);
router.get('/quizzes', getQuizzes);
router.post('/quizzes', uploadQuiz);
router.get('/quizzes/:id/questions', getQuizQuestions);
router.post('/quizzes/submit', submitQuiz);
router.get('/modules', getModules);
router.get('/instructors', getInstructors);
router.get('/proctors', getProctors);
router.get('/students', getStudents);
router.get('/analytics', getAnalytics);
router.get('/enrollments', getEnrollments);
router.post('/enroll', enrollCourse);
router.post('/drop', dropCourse);
router.post('/feedback', submitCourseFeedback);
router.get('/feedback/summary', getCourseFeedbackSummary);

// Dedicated Student Profile & Actions
router.get('/student/profile', getStudentProfile);
router.put('/student/phone', updateStudentPhone);
router.put('/student/password', updateStudentPassword);
router.post('/student/study-session', logStudySession);

// Dedicated Instructor Profile & Actions
router.get('/instructor/profile', getInstructorProfile);
router.put('/instructor/phone', updateInstructorPhone);
router.put('/instructor/cabin', updateInstructorCabin);
router.put('/instructor/password', updateInstructorPassword);

// Phase 12: Enrollment Approval Workflow
router.post('/enroll/request',          requestEnrollment);
router.get('/enroll/requests',          getEnrollmentRequests);
router.post('/enroll/approve',          approveEnrollmentRequest);

// Phase 12: Instructor Notifications
router.get('/notifications',            getInstructorNotifications);
router.put('/notifications/:id/read',   markNotificationRead);

export default router;
