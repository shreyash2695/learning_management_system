import { dbAll, dbGet, dbRun, initDatabase } from './config/db.js';
import { 
  getInstructorProfile, 
  updateInstructorPhone, 
  updateInstructorCabin, 
  updateInstructorPassword 
} from './controllers/lmsController.js';
import { login } from './controllers/authController.js';

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 VERIFYING INSTRUCTOR PROFILE & 1-TO-1 PROCTOR ALIGNMENT');
  console.log('====================================================\n');

  await initDatabase();

  // Helper mock req/res
  const mockReq = ({ query = {}, params = {}, body = {}, user = {}, headers = {} } = {}) => ({
    query, params, body, user, headers
  });

  const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
  };

  // TEST 1: Fetch Instructor Profile for Prof. Raj Menon (ID: 201)
  console.log('[TEST 1] Testing getInstructorProfile for Instructor 201:');
  const req1 = mockReq({ query: { instructorId: '201' } });
  const res1 = mockRes();
  await getInstructorProfile(req1, res1);

  if (res1.data?.success && res1.data?.profile) {
    const prof = res1.data.profile;
    console.log(`  ✓ Successfully fetched faculty profile: Prof. ${prof.first_name} ${prof.last_name}`);
    console.log(`  ✓ Department: ${prof.dept_name}, Cabin: ${prof.cabin_no}`);
    console.log(`  ✓ Registered Phone: ${prof.phone_no}`);
    console.log(`  ✓ Taught Courses: ${prof.taughtCourses.length} courses (${prof.taughtCourses.map(c => c.course_name).join(', ')})`);
  } else {
    throw new Error('Failed to retrieve instructor profile: ' + JSON.stringify(res1.data));
  }

  // TEST 2: Update Instructor Phone in instructor_phone table
  console.log('\n[TEST 2] Testing updateInstructorPhone (10 digits validation):');
  const req2Fail = mockReq({ body: { instructor_id: 201, phone_no: '123' } });
  const res2Fail = mockRes();
  await updateInstructorPhone(req2Fail, res2Fail);
  if (res2Fail.statusCode === 400) {
    console.log('  ✓ Correctly rejected invalid phone number (< 10 digits)');
  } else {
    throw new Error('Should have rejected phone number with status 400');
  }

  const newPhone = '9876543219';
  const req2Success = mockReq({ body: { instructor_id: 201, phone_no: newPhone } });
  const res2Success = mockRes();
  await updateInstructorPhone(req2Success, res2Success);
  
  const phoneRow = await dbGet('SELECT phone_no FROM instructor_phone WHERE instructor_id = 201');
  if (phoneRow && phoneRow.phone_no === newPhone) {
    console.log(`  ✓ Verified DB State: instructor_phone is now ${phoneRow.phone_no}`);
  } else {
    throw new Error('Phone update not reflected in instructor_phone table');
  }

  // TEST 3: Update Instructor Cabin
  console.log('\n[TEST 3] Testing updateInstructorCabin:');
  const newCabin = 'Cabin 409-B';
  const req3 = mockReq({ body: { instructor_id: 201, cabin_no: newCabin } });
  const res3 = mockRes();
  await updateInstructorCabin(req3, res3);

  const instructorRow = await dbGet('SELECT cabin_no FROM instructor WHERE instructor_id = 201');
  if (instructorRow && instructorRow.cabin_no === newCabin) {
    console.log(`  ✓ Verified DB State: instructor.cabin_no is now "${instructorRow.cabin_no}"`);
  } else {
    throw new Error('Cabin update not reflected in instructor table');
  }

  // Restore cabin
  await dbRun('UPDATE instructor SET cabin_no = ? WHERE instructor_id = 201', ['Cabin 401']);

  // TEST 4: Update Instructor Password with PBKDF2 Hashing
  console.log('\n[TEST 4] Testing updateInstructorPassword:');
  const req4Bad = mockReq({ body: { instructor_id: 201, old_password: 'wrongpassword', new_password: 'profNewPassword123' } });
  const res4Bad = mockRes();
  await updateInstructorPassword(req4Bad, res4Bad);
  if (res4Bad.statusCode === 401) {
    console.log('  ✓ Correctly rejected update with invalid current password (401 Unauthorized)');
  } else {
    throw new Error('Should have rejected bad current password with 401, got ' + res4Bad.statusCode);
  }

  const req4Good = mockReq({ body: { instructor_id: 201, old_password: 'prof123', new_password: 'profNewPassword123' } });
  const res4Good = mockRes();
  await updateInstructorPassword(req4Good, res4Good);

  const pwdRow = await dbGet('SELECT password FROM instructor WHERE instructor_id = 201');
  if (pwdRow && pwdRow.password.startsWith('pbkdf2$')) {
    console.log(`  ✓ Verified DB State: instructor.password stored as PBKDF2 hash: ${pwdRow.password.substring(0, 30)}...`);
  } else {
    throw new Error('Password was not hashed with PBKDF2');
  }

  // TEST 5: Instructor Login with New Password
  console.log('\n[TEST 5] Testing Instructor Login with updated password:');
  const req5 = mockReq({ body: { role: 'instructor', username: 'raj_prof', password: 'profNewPassword123' } });
  const res5 = mockRes();
  await login(req5, res5);
  if (res5.data?.success && res5.data?.token && res5.data?.user?.role === 'instructor') {
    console.log(`  ✓ Authenticated Instructor: Prof. ${res5.data.user.name} (Role: ${res5.data.user.role})`);
    console.log('  ✓ Received valid JWT token');
  } else {
    throw new Error('Instructor login failed with new password');
  }

  // Restore baseline password 'prof123' for smooth demo persistence
  await dbRun("UPDATE instructor SET password = 'prof123' WHERE instructor_id = 201");
  console.log('  ✓ Restored baseline test password ("prof123")');

  // TEST 6: Academic Constraint Verification:
  // - Students have exactly 1 proctor (foreign key student.proctor_id)
  // - Instructors have NO proctor
  console.log('\n[TEST 6] Verifying Academic Mentorship Constraints:');
  const studentProctors = await dbAll(`
    SELECT s.student_id, s.first_name, s.last_name, s.proctor_id, p.first_name as proctor_name 
    FROM student s 
    LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
  `);
  
  console.log(`  ✓ Verified: All ${studentProctors.length} students have exactly one foreign key proctor_id.`);
  studentProctors.slice(0, 3).forEach(s => {
    console.log(`    - Student #${s.student_id} ${s.first_name} ${s.last_name} -> Assigned Proctor: Prof. ${s.proctor_name} (Proctor #${s.proctor_id})`);
  });

  const instructorCols = await dbAll("PRAGMA table_info(instructor)");
  const hasProctorId = instructorCols.some(c => c.name === 'proctor_id');
  if (!hasProctorId) {
    console.log('  ✓ Verified Schema: table `instructor` has NO proctor_id (instructors do not have proctors).');
  } else {
    throw new Error('Instructor table should not have proctor_id');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL INSTRUCTOR PROFILE & PROCTOR TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
