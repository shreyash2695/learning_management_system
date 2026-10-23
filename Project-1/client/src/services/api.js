// Client API Client Service

const BASE_URL = '/api';

function getAuthHeaders() {
  const headers = {};
  const token = localStorage.getItem('lms_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const userJson = localStorage.getItem('lms_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      headers['x-user-role'] = user.role || 'student';
      headers['x-user-id'] = String(user.id || 101);
    } catch {}
  }
  return headers;
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Network error occurred');
  }
  return data;
}

// Authentication APIs
export const authApi = {
  login: (role, username, password) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password })
    }).then(handleResponse),

  register: (registrationData) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    }).then(handleResponse),

  getRegisterMeta: () =>
    fetch(`${BASE_URL}/auth/register-meta`).then(handleResponse),

  getMe: () =>
    fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),
};

// LMS Portal APIs
export const lmsApi = {
  getDashboard: (role = 'student', userId = 101) => 
    fetch(`${BASE_URL}/lms/dashboard?role=${encodeURIComponent(role)}&userId=${encodeURIComponent(userId)}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),
  
  getCourses: (studentId = null, instructorId = null) => {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (instructorId) params.append('instructorId', instructorId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/lms/courses${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  getCourseDetails: (courseId) => 
    fetch(`${BASE_URL}/lms/courses/${courseId}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getAssignments: (studentId = null, instructorId = null, courseId = null) => {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (instructorId) params.append('instructorId', instructorId);
    if (courseId) params.append('courseId', courseId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/lms/assignments${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  createAssignment: (payload) => 
    fetch(`${BASE_URL}/lms/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  submitAssignment: (payload) => 
    fetch(`${BASE_URL}/lms/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  gradeSubmission: (payload) => 
    fetch(`${BASE_URL}/lms/submissions/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  getSubmissions: (instructorId = null, courseId = null, assignmentId = null, status = null) => {
    const params = new URLSearchParams();
    if (instructorId) params.append('instructorId', instructorId);
    if (courseId) params.append('courseId', courseId);
    if (assignmentId) params.append('assignmentId', assignmentId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/lms/submissions${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  getQuizzes: (courseId = null) => {
    const qs = courseId ? `?courseId=${courseId}` : '';
    return fetch(`${BASE_URL}/lms/quizzes${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  uploadQuiz: (payload) => 
    fetch(`${BASE_URL}/lms/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  getQuizQuestions: (quizId, courseId = 301, showAnswers = false) =>
    fetch(`${BASE_URL}/lms/quizzes/${quizId}/questions?courseId=${courseId}&showAnswers=${showAnswers}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  submitQuiz: (payload) => 
    fetch(`${BASE_URL}/lms/quizzes/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  getModules: () => 
    fetch(`${BASE_URL}/lms/modules`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getInstructors: () => 
    fetch(`${BASE_URL}/lms/instructors`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getProctors: () => 
    fetch(`${BASE_URL}/lms/proctors`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getStudents: (courseId, proctorId, search) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (proctorId) params.append('proctorId', proctorId);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/lms/students${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  getAnalytics: () => 
    fetch(`${BASE_URL}/lms/analytics`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getEnrollments: (courseId, studentId, proctorId) => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (studentId) params.append('studentId', studentId);
    if (proctorId) params.append('proctorId', proctorId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${BASE_URL}/lms/enrollments${qs}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse);
  },

  enrollCourse: (studentId, courseId) => 
    fetch(`${BASE_URL}/lms/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, course_id: courseId })
    }).then(handleResponse),

  dropCourse: (studentId, courseId) => 
    fetch(`${BASE_URL}/lms/drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, course_id: courseId })
    }).then(handleResponse),

  submitFeedback: (payload) => 
    fetch(`${BASE_URL}/lms/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    }).then(handleResponse),

  getFeedbackSummary: () =>
    fetch(`${BASE_URL}/lms/feedback/summary`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getStudentProfile: (studentId) =>
    fetch(`${BASE_URL}/lms/student/profile?studentId=${studentId}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  updateStudentPhone: (studentId, phoneNo) =>
    fetch(`${BASE_URL}/lms/student/phone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, phone_no: phoneNo })
    }).then(handleResponse),

  updateStudentPassword: (studentId, oldPassword, newPassword) =>
    fetch(`${BASE_URL}/lms/student/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, old_password: oldPassword, new_password: newPassword })
    }).then(handleResponse),

  logStudySession: (studentId, minutes, trackerStatus, topic) =>
    fetch(`${BASE_URL}/lms/student/study-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, minutes, tracker_status: trackerStatus, topic })
    }).then(handleResponse),

  getInstructorProfile: (instructorId) =>
    fetch(`${BASE_URL}/lms/instructor/profile?instructorId=${instructorId}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  updateInstructorPhone: (instructorId, phoneNo) =>
    fetch(`${BASE_URL}/lms/instructor/phone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ instructor_id: instructorId, phone_no: phoneNo })
    }).then(handleResponse),

  updateInstructorCabin: (instructorId, cabinNo) =>
    fetch(`${BASE_URL}/lms/instructor/cabin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ instructor_id: instructorId, cabin_no: cabinNo })
    }).then(handleResponse),

  updateInstructorPassword: (instructorId, oldPassword, newPassword) =>
    fetch(`${BASE_URL}/lms/instructor/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ instructor_id: instructorId, old_password: oldPassword, new_password: newPassword })
    }).then(handleResponse),

  // Phase 12: Enrollment Approval Workflow & Notifications
  requestEnrollment: (studentId, courseId) =>
    fetch(`${BASE_URL}/lms/enroll/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, course_id: courseId })
    }).then(handleResponse),

  getEnrollmentRequests: () =>
    fetch(`${BASE_URL}/lms/enroll/requests`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  approveEnrollmentRequest: (requestId, action, notes = '') =>
    fetch(`${BASE_URL}/lms/enroll/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ request_id: requestId, action, notes })
    }).then(handleResponse),

  getInstructorNotifications: (instructorId) =>
    fetch(`${BASE_URL}/lms/notifications?instructorId=${instructorId}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  markNotificationRead: (notificationId) =>
    fetch(`${BASE_URL}/lms/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({})
    }).then(handleResponse),
};


// CRUD Studio APIs (Protected with x-user-role === 'admin')
export const crudApi = {
  getSchema: () => 
    fetch(`${BASE_URL}/crud/schema`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  getTableRecords: (table, search = '') => 
    fetch(`${BASE_URL}/crud/${table}?search=${encodeURIComponent(search)}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  insertRecord: (table, data) => 
    fetch(`${BASE_URL}/crud/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    }).then(handleResponse),

  updateRecord: (table, key, data) => 
    fetch(`${BASE_URL}/crud/${table}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ key, data })
    }).then(handleResponse),

  deleteRecord: (table, key) => 
    fetch(`${BASE_URL}/crud/${table}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(key)
    }).then(handleResponse),

  executeRawQuery: (query) => 
    fetch(`${BASE_URL}/crud/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ query })
    }).then(handleResponse),

  // Phase 12: Enrollment Approval Workflow
  requestEnrollment: (studentId, courseId) =>
    fetch(`${BASE_URL}/lms/enroll/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ student_id: studentId, course_id: courseId })
    }).then(handleResponse),

  getEnrollmentRequests: () =>
    fetch(`${BASE_URL}/lms/enroll/requests`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  approveEnrollmentRequest: (requestId, action, notes = '') =>
    fetch(`${BASE_URL}/lms/enroll/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ request_id: requestId, action, notes })
    }).then(handleResponse),

  getInstructorNotifications: (instructorId) =>
    fetch(`${BASE_URL}/lms/notifications?instructorId=${instructorId}`, {
      headers: { ...getAuthHeaders() }
    }).then(handleResponse),

  markNotificationRead: (notificationId) =>
    fetch(`${BASE_URL}/lms/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({})
    }).then(handleResponse),
};

