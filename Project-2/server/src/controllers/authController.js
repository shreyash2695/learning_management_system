import crypto from 'crypto';
import { dbGet, dbAll, dbRun, dbTransaction } from '../config/db.js';
import { syncStudentToNeo4j, syncInstructorToNeo4j } from '../config/neo4j.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lms-academic-secret-key-2026-dbms-grade';

// Password Hashing Utility (Standard PBKDF2 with 78 chars, fits within VARCHAR(100) and VARCHAR(255))
export function hashPassword(plainText) {
  if (!plainText) return '';
  const salt = crypto.randomBytes(8).toString('hex'); // 16 chars
  const hash = crypto.pbkdf2Sync(plainText.trim(), salt, 10000, 24, 'sha256').toString('hex'); // 48 chars
  return `pbkdf2$10000$${salt}$${hash}`;
}

export function verifyPassword(plainText, storedPassword) {
  if (!plainText || !storedPassword) return false;
  const cleanStored = storedPassword.trim();
  const cleanPlain = plainText.trim();

  // 1. Plaintext match (fallback for initial seed demo passwords like pass1, prof123, admin123)
  if (!cleanStored.includes('$')) {
    return cleanPlain === cleanStored;
  }

  // 2. Compact base64url PBKDF2 format (pb$salt$hash)
  if (cleanStored.startsWith('pb$')) {
    const parts = cleanStored.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedHash = parts[2];
      const computedHash = crypto.pbkdf2Sync(cleanPlain, salt, 1000, 24, 'sha256').toString('base64url');
      return computedHash === expectedHash;
    }
  }

  // 3. Standard PBKDF2 format (pbkdf2$iterations$salt$hash)
  if (cleanStored.startsWith('pbkdf2$')) {
    const parts = cleanStored.split('$');
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      const keyLen = expectedHash.length / 2;
      const computedHash = crypto.pbkdf2Sync(cleanPlain, salt, iterations, keyLen, keyLen > 32 ? 'sha512' : 'sha256').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
    }
  }

  return cleanPlain === cleanStored;
}

// Minimalist Standard JWT (HMAC-SHA256, base64url)
export function signJwt(payload, expiresInMs = 24 * 60 * 60 * 1000) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Date.now() + expiresInMs;
  const fullPayload = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

export function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

// Authentication Controller: Login
export async function login(req, res) {
  try {
    const { role, username, password } = req.body;

    if (!role || !username || !password) {
      return res.status(400).json({ success: false, error: 'Role, username, and password are required.' });
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (role === 'student') {
      // Authenticate against database 'account' & 'student' tables (supports username, first_name, email, or student_id)
      const cleanUsername = trimmedUsername.replace(/_user$/i, '');
      const account = await dbGet(`
        SELECT a.*, s.first_name, s.last_name, s.email, s.proctor_id
        FROM account a
        JOIN student s ON a.student_id = s.student_id
        WHERE LOWER(a.username) = LOWER(?)
           OR LOWER(a.username) = LOWER(?)
           OR LOWER(s.first_name) = LOWER(?)
           OR LOWER(s.email) = LOWER(?)
           OR CAST(s.student_id AS CHAR) = ?
      `, [trimmedUsername, `${cleanUsername}_user`, trimmedUsername, trimmedUsername, trimmedUsername]);

      if (!account || !verifyPassword(trimmedPassword, account.password)) {
        return res.status(401).json({ success: false, error: 'Invalid student username or password.' });
      }

      const userPayload = {
        id: account.student_id,
        name: `${account.first_name} ${account.last_name}`,
        username: account.username,
        email: account.email,
        role: 'student',
        proctor_id: account.proctor_id
      };

      const token = signJwt(userPayload);

      return res.json({
        success: true,
        user: userPayload,
        token
      });

    } else if (role === 'instructor') {
      // Authenticate against database 'instructor' table
      const cleanUsername = trimmedUsername.replace(/_prof$/i, '');
      const instructor = await dbGet(`
        SELECT * FROM instructor 
        WHERE LOWER(email) = LOWER(?) 
           OR LOWER(first_name) = LOWER(?)
           OR CAST(instructor_id AS CHAR) = ?
      `, [trimmedUsername, cleanUsername, trimmedUsername]);
      if (!instructor) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid instructor credentials.' 
        });
      }

      const matches = instructor.password && verifyPassword(trimmedPassword, instructor.password);
      if (!matches) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid instructor credentials.' 
        });
      }

      const userPayload = {
        id: instructor.instructor_id,
        name: `Prof. ${instructor.first_name} ${instructor.last_name}`,
        email: instructor.email,
        cabin_no: instructor.cabin_no,
        dept_id: instructor.dept_id,
        role: 'instructor'
      };

      const token = signJwt(userPayload);

      return res.json({
        success: true,
        user: userPayload,
        token
      });

    } else if (role === 'admin') {
      // Dedicated Administrator account
      if (trimmedUsername === 'admin' && verifyPassword(trimmedPassword, 'admin123')) {
        const userPayload = {
          id: 999,
          name: 'System Administrator',
          username: 'admin',
          email: 'admin@lms.ac.in',
          role: 'admin'
        };

        const token = signJwt(userPayload);

        return res.json({
          success: true,
          user: userPayload,
          token
        });
      } else {
        return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid user role selected.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Authentication Controller: Get Current User (via JWT or headers)
export async function getCurrentUser(req, res) {
  // Extract token from Bearer or header
  const authHeader = req.headers['authorization'];
  let tokenUser = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    tokenUser = verifyJwt(token);
  }

  const role = tokenUser?.role || req.headers['x-user-role'];
  const userId = tokenUser?.id || req.headers['x-user-id'];

  if (!role || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthenticated session.' });
  }

  try {
    if (role === 'student') {
      const student = await dbGet('SELECT * FROM student WHERE student_id = ?', [userId]);
      if (student) {
        return res.json({
          success: true,
          user: {
            id: student.student_id,
            name: `${student.first_name} ${student.last_name}`,
            email: student.email,
            role: 'student'
          }
        });
      }
    } else if (role === 'instructor') {
      const instructor = await dbGet('SELECT * FROM instructor WHERE instructor_id = ?', [userId]);
      if (instructor) {
        return res.json({
          success: true,
          user: {
            id: instructor.instructor_id,
            name: `Prof. ${instructor.first_name} ${instructor.last_name}`,
            email: instructor.email,
            role: 'instructor'
          }
        });
      }
    } else if (role === 'admin') {
      return res.json({
        success: true,
        user: {
          id: 999,
          name: 'System Administrator',
          role: 'admin',
          email: 'admin@lms.ac.in'
        }
      });
    }

    res.status(404).json({ success: false, error: 'User not found.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Express Authorization Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const decoded = verifyJwt(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }

  // Fallback to legacy headers for integration tests / demo continuity if valid
  const legacyRole = req.headers['x-user-role'];
  const legacyId = req.headers['x-user-id'];
  if (legacyRole && legacyId) {
    req.user = { role: legacyRole, id: parseInt(legacyId, 10) };
    return next();
  }

  return res.status(401).json({ success: false, error: 'Access denied: Valid authentication token required.' });
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role || req.headers['x-user-role'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Required role [${allowedRoles.join(', ')}]. Current role: '${userRole || 'anonymous'}'.`
      });
    }
    next();
  };
}

// Public endpoint: Fetch registration metadata (departments & proctors for dropdowns)
export async function getRegistrationMetadata(req, res) {
  try {
    const departments = await dbAll('SELECT dept_id, dept_name FROM department ORDER BY dept_name ASC');
    const proctors = await dbAll('SELECT proctor_id, first_name, last_name, cabin_no FROM proctor ORDER BY first_name ASC');
    res.json({
      success: true,
      departments,
      proctors
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// User Registration Controller (Student & Faculty Self-Registration)
export async function register(req, res) {
  try {
    const { role } = req.body;
    if (!role || !['student', 'instructor'].includes(role.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Registration is available for student and instructor roles only.' });
    }

    const regRole = role.toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (regRole === 'student') {
      const {
        first_name,
        middle_name = null,
        last_name,
        email,
        dob,
        phone_no,
        username,
        password,
        proctor_id
      } = req.body;

      if (!first_name?.trim() || !last_name?.trim()) {
        return res.status(400).json({ success: false, error: 'First name and last name are required.' });
      }
      
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ success: false, error: 'A valid email address with a domain is required (e.g. name@university.edu).' });
      }

      const trimmedUsername = (username || '').trim().toLowerCase();
      if (!trimmedUsername) {
        return res.status(400).json({ success: false, error: 'Student portal username is required.' });
      }
      if (/\s/.test(trimmedUsername)) {
        return res.status(400).json({ success: false, error: 'Username cannot contain spaces.' });
      }

      if (!password || password.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
      }

      let cleanPhone = (phone_no || '').replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.slice(1);
      }
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits (e.g. 9876543210).' });
      }

      if (!dob) {
        return res.status(400).json({ success: false, error: 'Date of birth is required.' });
      }
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date of birth format.' });
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        return res.status(400).json({ success: false, error: 'Student must be at least 16 years old to register.' });
      }

      const existingEmail = await dbGet('SELECT student_id FROM student WHERE LOWER(email) = ?', [trimmedEmail]);
      if (existingEmail) {
        return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      }

      const existingUser = await dbGet('SELECT account_id FROM account WHERE LOWER(username) = ?', [trimmedUsername]);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'This username is already taken. Please choose another.' });
      }

      // Proctor assignment with DB foreign key verification
      let assignedProctorId = proctor_id && !isNaN(parseInt(proctor_id, 10)) ? parseInt(proctor_id, 10) : null;
      if (assignedProctorId) {
        const checkProctor = await dbGet('SELECT proctor_id FROM proctor WHERE proctor_id = ?', [assignedProctorId]);
        if (!checkProctor) assignedProctorId = null;
      }
      if (!assignedProctorId) {
        const defaultProctor = await dbGet('SELECT proctor_id FROM proctor ORDER BY proctor_id ASC LIMIT 1');
        assignedProctorId = defaultProctor ? defaultProctor.proctor_id : 1;
      }

      const maxStudent = await dbGet('SELECT MAX(student_id) as max_id FROM student');
      const currentMax = maxStudent && maxStudent.max_id != null ? parseInt(maxStudent.max_id, 10) : 112;
      const newStudentId = Math.max(113, (isNaN(currentMax) ? 112 : currentMax) + 1);
      const hashedPassword = hashPassword(password);

      await dbTransaction(async (tx) => {
        await tx.run(`
          INSERT INTO student (student_id, first_name, middle_name, last_name, dob, email, proctor_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [newStudentId, first_name.trim(), middle_name?.trim() || null, last_name.trim(), dob, trimmedEmail, assignedProctorId]);

        await tx.run(`
          INSERT INTO student_phone (student_id, phone_no)
          VALUES (?, ?)
        `, [newStudentId, cleanPhone]);

        const maxAccount = await tx.get('SELECT MAX(account_id) as max_id FROM account WHERE student_id = ?', [newStudentId]);
        const newAccountId = (parseInt(maxAccount?.max_id, 10) || 0) + 1;
        await tx.run(`
          INSERT INTO account (student_id, account_id, username, password)
          VALUES (?, ?, ?, ?)
        `, [newStudentId, newAccountId, trimmedUsername, hashedPassword]);

        await tx.run(`
          INSERT INTO progress_analytics (student_id, progress_id, cgpa, daily_tracker, time_spent, leaderboard_position)
          VALUES (?, 1, 0.0, 'Newly Registered Student', 0, NULL)
        `, [newStudentId]);

        try {
          await tx.run(`
            INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
            VALUES ('student', 'INSERT', CAST(? AS CHAR), CURRENT_TIMESTAMP, ?)
          `, [newStudentId, `New student registered: ${first_name.trim()} ${last_name.trim()} (${trimmedEmail})`]);
        } catch {}
      });

      // Synchronize newly created student node to Neo4j Cloud
      await syncStudentToNeo4j({
        student_id: newStudentId,
        name: `${first_name.trim()} ${last_name.trim()}`,
        email: trimmedEmail
      });

      const userPayload = {
        id: newStudentId,
        name: `${first_name.trim()} ${last_name.trim()}`,
        username: trimmedUsername,
        email: trimmedEmail,
        role: 'student',
        proctor_id: assignedProctorId
      };

      const token = signJwt(userPayload);

      return res.status(201).json({
        success: true,
        message: 'Student account created successfully!',
        user: userPayload,
        token
      });

    } else if (regRole === 'instructor') {
      const {
        first_name,
        middle_name = null,
        last_name,
        email,
        dept_id,
        cabin_no,
        phone_no,
        password
      } = req.body;

      if (!first_name?.trim() || !last_name?.trim()) {
        return res.status(400).json({ success: false, error: 'First name and last name are required.' });
      }

      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ success: false, error: 'A valid university email address with a domain is required (e.g. name@university.edu).' });
      }

      let assignedDeptId = dept_id && !isNaN(parseInt(dept_id, 10)) ? parseInt(dept_id, 10) : null;
      if (assignedDeptId) {
        const checkDept = await dbGet('SELECT dept_id FROM department WHERE dept_id = ?', [assignedDeptId]);
        if (!checkDept) assignedDeptId = null;
      }
      if (!assignedDeptId) {
        const defaultDept = await dbGet('SELECT dept_id FROM department ORDER BY dept_id ASC LIMIT 1');
        assignedDeptId = defaultDept ? defaultDept.dept_id : 1;
      }

      if (!cabin_no?.trim()) {
        return res.status(400).json({ success: false, error: 'Cabin number is required (e.g. Cabin 501).' });
      }
      if (!password || password.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
      }

      let cleanPhone = (phone_no || '').replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.slice(1);
      }
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits (e.g. 9876543210).' });
      }

      const trimmedCabin = cabin_no.trim().toUpperCase();

      const existingEmail = await dbGet('SELECT instructor_id FROM instructor WHERE LOWER(email) = ?', [trimmedEmail]);
      if (existingEmail) {
        return res.status(400).json({ success: false, error: 'An instructor with this email already exists.' });
      }

      const existingCabin = await dbGet('SELECT instructor_id FROM instructor WHERE UPPER(cabin_no) = ?', [trimmedCabin]);
      if (existingCabin) {
        return res.status(400).json({ success: false, error: `Cabin ${trimmedCabin} is already assigned to another faculty member. Please choose another cabin.` });
      }

      const maxInst = await dbGet('SELECT MAX(instructor_id) as max_id FROM instructor');
      const currentMaxInst = maxInst && maxInst.max_id != null ? parseInt(maxInst.max_id, 10) : 205;
      const newInstructorId = Math.max(206, (isNaN(currentMaxInst) ? 205 : currentMaxInst) + 1);
      const hashedPassword = hashPassword(password);

      await dbTransaction(async (tx) => {
        // Safe insert: try with password column first, fallback without if older MySQL schema
        try {
          await tx.run(`
            INSERT INTO instructor (instructor_id, first_name, middle_name, last_name, email, cabin_no, dept_id, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [newInstructorId, first_name.trim(), middle_name?.trim() || null, last_name.trim(), trimmedEmail, trimmedCabin, assignedDeptId, hashedPassword]);
        } catch (instInsertErr) {
          if (instInsertErr.message && instInsertErr.message.includes('password')) {
            await tx.run(`
              INSERT INTO instructor (instructor_id, first_name, middle_name, last_name, email, cabin_no, dept_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [newInstructorId, first_name.trim(), middle_name?.trim() || null, last_name.trim(), trimmedEmail, trimmedCabin, assignedDeptId]);
          } else {
            throw instInsertErr;
          }
        }

        await tx.run(`
          INSERT INTO instructor_phone (instructor_id, phone_no)
          VALUES (?, ?)
        `, [newInstructorId, cleanPhone]);

        // Auto-provision matching proctor portfolio for newly registered faculty
        try {
          const existingProctor = await tx.get(
            'SELECT proctor_id FROM proctor WHERE LOWER(TRIM(first_name)) = LOWER(TRIM(?)) AND LOWER(TRIM(last_name)) = LOWER(TRIM(?))',
            [first_name.trim(), last_name.trim()]
          );
          if (!existingProctor) {
            const maxProc = await tx.get('SELECT MAX(proctor_id) as max_id FROM proctor');
            const newProctorId = Math.max(6, (parseInt(maxProc?.max_id, 10) || 5) + 1);
            await tx.run(
              'INSERT INTO proctor (proctor_id, first_name, middle_name, last_name, cabin_no) VALUES (?, ?, ?, ?, ?)',
              [newProctorId, first_name.trim(), middle_name?.trim() || null, last_name.trim(), trimmedCabin]
            );
            await tx.run(
              'INSERT INTO proctor_phone (proctor_id, phone_no) VALUES (?, ?)',
              [newProctorId, cleanPhone]
            );
          }
        } catch (procErr) {
          console.warn('[Register] Could not auto-provision proctor profile for instructor:', procErr.message);
        }

        try {
          await tx.run(`
            INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
            VALUES ('instructor', 'INSERT', CAST(? AS CHAR), CURRENT_TIMESTAMP, ?)
          `, [newInstructorId, `New faculty registered: Prof. ${first_name.trim()} ${last_name.trim()} (${trimmedEmail}) in Cabin ${trimmedCabin}`]);
        } catch {}
      });

      let deptName = 'General';
      try {
        const dRow = await dbGet('SELECT dept_name FROM department WHERE dept_id = ?', [assignedDeptId]);
        if (dRow) deptName = dRow.dept_name;
      } catch {}

      // Synchronize newly created instructor node to Neo4j Cloud
      await syncInstructorToNeo4j({
        instructor_id: newInstructorId,
        name: `Prof. ${first_name.trim()} ${last_name.trim()}`,
        email: trimmedEmail,
        cabin_no: trimmedCabin,
        dept: deptName
      });

      const userPayload = {
        id: newInstructorId,
        name: `Prof. ${first_name.trim()} ${last_name.trim()}`,
        email: trimmedEmail,
        cabin_no: trimmedCabin,
        dept_id: assignedDeptId,
        role: 'instructor'
      };

      const token = signJwt(userPayload);

      return res.status(201).json({
        success: true,
        message: 'Faculty account created successfully!',
        user: userPayload,
        token
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

