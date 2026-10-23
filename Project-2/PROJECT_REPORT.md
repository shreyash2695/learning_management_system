# 📑 LMS Portal — Comprehensive DBMS Project Report

**Project Title**: LMS Portal (Official University Academic & Learning Management System)  
**Domain**: Database Management Systems (DBMS) & Full-Stack Web Development  
**Architecture**: React 18 (Vite + Tailwind CSS) + Node.js/Express + Dual-Engine (SQLite + MySQL)  
**Verification**: 20/20 Backend & DBMS Integration Tests Passed  

---

## 🎯 Executive Summary

The **LMS Portal** (Official University Academic & Learning Management System) is an enterprise-grade academic web application engineered to bridge real-world university portal requirements (course registration, modular syllabus, coursework submissions, objective evaluations, feedback, and academic standing) with advanced **Relational Database Management System (DBMS)** principles.

The system features a **23-table normalized relational schema** in **3NF / BCNF**, enforcing domain, entity, and referential integrity constraints, automated triggers, stored procedures, user-defined functions, academic database views, ACID transactions, and an interactive **SQL Compiler & CRUD Studio** with 18 categorized academic query demonstrations.

Crucially, the system features an intelligent **Cross-Database Dialect Adaptation Layer** that enables native compatibility with production **MySQL** databases while maintaining a zero-configuration local **SQLite** fallback, guaranteeing flawless execution across evaluation environments.

---

## 🛠️ Key Recent Fixes & Engineering Enhancements

### 1. Coursework Submission Pipeline Overhaul
- **File Upload Support**: Transformed the previously inert attachment container into a functional file picker with real-time file size calculations (KB/MB) and file removal capabilities.
- **Repository URL Integration**: Added a bound input field for external project links (GitHub/GitLab) and combined notes, URL, and attachment metadata into `submission_content`.
- **Validation Relaxations**: Removed strict `required` tag from the notes textarea, allowing submissions with only an attached file or URL.
- **Due-Date & Late Status Logic**: Automated evaluation comparing submission timestamps against assignment `due_date`. Submissions received past the due date receive status `LATE`.
- **Grade Preservation**: Resubmissions of already evaluated assignments preserve existing `GRADED` status and marks.
- **Dual-Portal Live Synchronization**: Added a `LEFT JOIN submits` in `getCourseDetails` for the viewing student and enabled immediate re-fetching so assignment status badges (`Graded: X/Y`, `Submitted`, `Submitted (Late)`, `Pending`) update instantly.

### 2. MySQL & Cross-Dialect Compatibility Resolution
- **Quiz Submission Syntax Fix**: Resolved a MySQL syntax error in `submitQuiz` caused by SQLite-specific `datetime('now', '-15 minutes')`. Both `startedAt` and `submittedAt` are now generated in Node.js as standard ISO timestamp strings and bound via positional parameters `(?, ?, ?, ?, ?, ?)`.
- **Cross-Dialect Adapter (`adaptSqlForDialect`)**: Added automatic SQL translation in `server/src/config/db.js` (`dbAll`, `dbGet`, `dbRun`, `dbTransaction`) to dynamically bridge dialect differences (e.g. `INSERT OR IGNORE` $\longleftrightarrow$ `INSERT IGNORE`, `datetime('now')` $\longleftrightarrow$ `NOW()`).
- **Standardized Datetime Operations**: Updated `submitCourseFeedback` and `logStudySession` to use standard ISO timestamp parameters.

---

## 🏗️ Complete 23-Table Relational Schema Specification

```
+-----------------------------------------------------------------------------------------------+
|                                      RELATIONAL SCHEMA                                        |
+-----------------------------------------------------------------------------------------------+
| 1.  DEPARTMENT         (dept_id [PK], dept_name [UQ])                                         |
| 2.  PROCTOR            (proctor_id [PK], first_name, middle_name, last_name, cabin_no)        |
| 3.  PROCTOR_PHONE      (proctor_id [PK, FK], phone_no [PK])                                   |
| 4.  STUDENT            (student_id [PK], first_name, last_name, dob, email [UQ], proctor_id)  |
| 5.  ACCOUNT            (student_id [PK, FK], account_id [PK], username [UQ], password)        |
| 6.  STUDENT_PHONE      (student_id [PK, FK], phone_no [PK])                                   |
| 7.  INSTRUCTOR         (instructor_id [PK], first_name, last_name, email [UQ], cabin_no, dept)|
| 8.  INSTRUCTOR_PHONE   (instructor_id [PK, FK], phone_no [PK])                                |
| 9.  COURSE             (course_id [PK], course_name [UQ], dept_id [FK])                       |
| 10. TEACHES            (instructor_id [PK, FK], course_id [PK, FK])                           |
| 11. MODULE             (course_id [PK, FK], module_no [PK], name, lecture_hours)              |
| 12. ASSIGNMENT         (course_id [PK, FK], assignment_id [PK], name, marks, due_date)        |
| 13. QUIZ               (course_id [PK, FK], quiz_id [PK], title, total_marks)                 |
| 14. QUIZ_QUESTION      (course_id [PK, FK], quiz_id [PK, FK], question_id [PK], text, marks)  |
| 15. QUIZ_OPTION        (option_id [PK], course_id, quiz_id, question_id [FK], text, is_corr)  |
| 16. QUIZ_ATTEMPT       (attempt_id [PK], student_id [FK], course_id, quiz_id [FK], score)    |
| 17. QUIZ_ANSWER        (attempt_id [PK, FK], question_id [PK], selected_option_id [FK])      |
| 18. ENROLLS            (student_id [PK, FK], course_id [PK, FK])                              |
| 19. SUBMITS            (student_id [PK, FK], course_id, assignment_id [PK, FK], marks, status)|
| 20. PROGRESS_ANALYTICS (student_id [PK, FK], progress_id [PK], cgpa, time_spent, tracker)     |
| 21. STUDY_SESSION      (session_id [PK], student_id [FK], study_date, time_spent, topic)      |
| 22. COURSE_FEEDBACK    (student_id [PK, FK], feedback_no [PK], course_id, instructor_id, rat) |
| 23. AUDIT_LOG          (audit_id [PK], table_name, operation, record_id, changed_at, desc)   |
+-----------------------------------------------------------------------------------------------+
```

---

## 🔍 Database Normalization Formal Proofs

### 1. First Normal Form (1NF)
- **Definition**: A relation $R$ is in 1NF if and only if all underlying domains contain atomic, indivisible values, and there are no repeating groups or nested arrays.
- **Decomposition Proof**:
  - Phone numbers are inherently multi-valued attributes. In unnormalized systems, phone numbers are stored as comma-delimited strings (e.g. `'9123456780, 9876543219'`).
  - In LMS Portal, this is formally decomposed into atomic relations:
    $$STUDENT\_PHONE(\underline{student\_id, phone\_no})$$
    $$INSTRUCTOR\_PHONE(\underline{instructor\_id, phone\_no})$$
    $$PROCTOR\_PHONE(\underline{proctor\_id, phone\_no})$$
  - Each tuple contains exactly one 10-digit number. Entity integrity and atomicity are strictly satisfied.

### 2. Second Normal Form (2NF)
- **Definition**: A relation $R$ is in 2NF if and only if it is in 1NF and no non-prime attribute is partially dependent on any candidate key (i.e. every non-prime attribute depends on the whole composite candidate key).
- **Decomposition Proof**:
  - In `submits(student_id, course_id, assignment_id, submission_date, submission_content, marks_obtained, instructor_feedback, status)`:
    - Candidate Key: $\{student\_id, course\_id, assignment\_id\}$.
    - Attributes `marks_obtained`, `submission_content`, and `status` depend on the specific assignment submitted by that specific student for that course. None of these non-prime attributes depend solely on $\{student\_id\}$ or $\{assignment\_id\}$.
  - In `module(course_id, module_no, name, lecture_hours)`:
    - Candidate Key: $\{course\_id, module\_no\}$.
    - `name` and `lecture_hours` specify a module within a course and do not depend on `course_id` alone.

### 3. Third Normal Form (3NF)
- **Definition**: A relation $R$ is in 3NF if and only if it is in 2NF and for every non-trivial functional dependency $X \to Y$, either $X$ is a superkey or $Y$ is a prime attribute (no transitive dependencies $X \to Y \to Z$).
- **Decomposition Proof**:
  - In `student`, department information is not stored directly. The table references `proctor(proctor_id)` and `course` references `department(dept_id)`.
  - If `student` stored `dept_name`, we would have:
    $$student\_id \to dept\_id \quad \text{and} \quad dept\_id \to dept\_name$$
    resulting in a transitive dependency. By isolating `dept_name` into `department`, transitive functional dependencies are strictly eliminated.

### 4. Boyce-Codd Normal Form (BCNF)
- **Definition**: A relation $R$ is in BCNF if and only if for every non-trivial functional dependency $X \to Y$, determinant $X$ is a candidate key (superkey).
- **Decomposition Proof**:
  - In `account(student_id, account_id, username, password)`:
    $$username \to student\_id \quad \text{and} \quad student\_id \to username$$
    Both `username` and `student_id` are unique candidate keys. Every determinant is a candidate key.
  - In `teaches(instructor_id, course_id)`:
    $$\{instructor\_id, course\_id\} \to \emptyset$$
    There are no partial or non-key determinants.

---

## ⚡ Advanced DBMS Logic Matrix

### 1. Stored Procedures
| Procedure Name | Parameter Signature | Purpose & Architectural Logic |
|---|---|---|
| `GET_STUDENT_DETAILS` | `IN p_student_id INT` | Returns consolidated student profile, proctor details, and authentication record |
| `ENROLL_STUDENT` | `IN p_student_id INT, IN p_course_id INT` | Enrolls student with duplicate registration checks and transaction safety |
| `GET_COURSE_STUDENTS` | `IN p_course_id INT` | Returns complete student roster for a given course |
| `GET_STUDENT_COURSES` | `IN p_student_id INT` | Returns all registered courses for a student |
| `GRADE_ASSIGNMENT` | `p_student, p_course, p_assign, p_marks, p_feedback` | Atomic evaluation of assignment submission, updating status to `GRADED` |

### 2. Stored Functions
| Function Name | Return Type | Description |
|---|---|---|
| `GET_COURSE_STUDENT_COUNT(course_id)` | `INT` | Scalar aggregate count of enrolled students in a course |
| `GET_ENROLLMENT_COUNT(student_id)` | `INT` | Total course registration count for a given student |
| `GET_STUDENT_AVERAGE_SCORE(student_id)` | `DECIMAL(5,2)` | Average score across all evaluated coursework submissions |
| `GET_COURSE_AVERAGE_RATING(course_id)` | `DECIMAL(3,2)` | Average 1–5 star student feedback rating for a course |

### 3. Database Triggers & Integrity Enforcers
1. **`check_student_age`**:
   - **Event**: `BEFORE INSERT ON student`
   - **Enforcement**: Validates `dob` against current date. If `age < 16`, aborts with constraint violation.
2. **`trg_submission_marks_check`**:
   - **Event**: `BEFORE UPDATE / INSERT ON submits`
   - **Enforcement**: Validates that `marks_obtained` satisfies $0 \le marks\_obtained \le assignment.marks$.
3. **`audit_student_insert`**:
   - **Event**: `AFTER INSERT ON student`
   - **Enforcement**: Automatically writes an immutable audit record into `audit_log` with timestamp, entity name, and description.

### 4. Database Views
1. **`student_course_view`**: Denormalized join of students, enrolled courses, and departments.
2. **`course_enrollment_summary`**: Real-time aggregate count of enrolled students per course.
3. **`student_performance_view`**: Combined academic performance metrics (CGPA, study hours, assignment marks).
4. **`course_feedback_summary`**: Course-level feedback aggregation (average rating and total reviews).

---

## 🔄 Dual-Engine Architecture & Cross-Dialect Adaptation Layer

LMS Portal features an innovative dual-engine abstraction layer implemented in `server/src/config/db.js`:

```
           Unified Controller Query Helpers (dbAll, dbGet, dbRun, dbTransaction)
                                         │
                                         ▼
                     Cross-Dialect Adaptor (adaptSqlForDialect)
                       │                                   │
      [isMysql == true]│                                   │[isMysql == false]
                       ▼                                   ▼
        • INSERT IGNORE INTO ...            • INSERT OR IGNORE INTO ...
        • DATE_SUB(NOW(), INTERVAL ...)     • datetime('now', '-... minutes')
        • NOW()                             • datetime('now')
                       │                                   │
                       ▼                                   ▼
              MySQL Database Pool                  SQLite Database Engine
             (mysql2/promise)                        (better-sqlite3)
```

### Key Architectural Safeguards:
1. **ANSI SQL Parameterized Timestamps**:
   All datetime values are computed in Node.js as standard ISO strings (`'YYYY-MM-DD HH:MM:SS'`) and bound as positional parameters `(?, ?, ?, ...)`. This eliminates database-specific date functions and prevents syntax errors in both MySQL and SQLite.
2. **Dynamic Dialect Translation (`adaptSqlForDialect`)**:
   Automatically adapts SQLite-specific date functions (`datetime('now', '-15 minutes')` $\to$ `DATE_SUB(NOW(), INTERVAL 15 MINUTE)`) and `INSERT OR IGNORE` $\to$ `INSERT IGNORE` when operating against MySQL.
3. **Graceful Zero-Setup Fallback**:
   If external MySQL credentials are not provided or the connection fails, the application automatically initializes and seeds `server/lms.db` in SQLite, ensuring seamless evaluation.

---

## 📝 Coursework & Examination Pipelines

### 1. Coursework Submission Pipeline
- **Input Channels**:
  - Solution Notes & SQL queries (textarea).
  - External Repository URL (e.g. GitHub / GitLab).
  - Solution Document / Code Archive (interactive file selector with size calculation).
- **Status Lifecycle**:
  $$\text{PENDING} \xrightarrow{\text{Submit}} \begin{cases} \text{SUBMITTED} & \text{if } \text{date} \le \text{due\_date} \\ \text{LATE} & \text{if } \text{date} > \text{due\_date} \end{cases} \xrightarrow{\text{Instructor Evaluation}} \text{GRADED}$$
- **Grade Preservation**: If a student resubmits coursework that has already been evaluated, existing marks and `GRADED` status are preserved.
- **Dual-Portal Synchronization**: Course Details (`/courses/:id`) and Assignments (`/assignments`) both query the `submits` table for the authenticated student, rendering real-time badges, submission dates, and feedback.

### 2. Examination & Relational Quiz Engine
- **Relational Schema**: Hierarchical composition across `course` $\to$ `quiz` $\to$ `quiz_question` $\to$ `quiz_option`.
- **Atomic Scoring**: Evaluates student choices against `quiz_option.is_correct` in the database.
- **Attempt Persistence**: Records the exam session in `quiz_attempt` and individual question responses in `quiz_answer`.

---

## 🧪 Systematic Testing & Verification Matrix

All automated backend and database integration test suites pass completely:

```
====================================================
🧪 LMS Portal Academic DBMS & Full-Stack Systematic Test Suite
====================================================
[TEST 1] Insert Valid Student                    ✓ PASSED (tanya.test@lms.ac.in)
[TEST 2] Reject Invalid Email                   ✓ PASSED (Regex check enforced)
[TEST 3] Trigger: Student Age (< 16 yrs)        ✓ PASSED (Trigger check_student_age intercepted)
[TEST 4] Insert Valid Course                    ✓ PASSED (Cloud Computing)
[TEST 5] TEACHES M:N Relationship Check         ✓ PASSED (Instructor 201 -> Course 399)
[TEST 6] Student Course Enrollment (enrolls)    ✓ PASSED (Enrolled successfully)
[TEST 7] Prevent Duplicate Enrollment           ✓ PASSED (Composite PK Enforced)
[TEST 8] Assignment Submission with Status      ✓ PASSED (Status: SUBMITTED)
[TEST 9] Trigger: Reject Invalid Marks (> Max)  ✓ PASSED (Trigger trg_submission_marks_check)
[TEST 10] Relational Quiz Hierarchy (Questions) ✓ PASSED (Quiz #1: 3 questions, 12 options)
[TEST 11 & 12] Quiz Attempt & Exact Scoring     ✓ PASSED (Scored 30/50, Attempt #89)
[TEST 13] Course Feedback Submission            ✓ PASSED (Rating 5 logged)
[TEST 14] CHECK Constraint (Rating 1-5)         ✓ PASSED (CHECK constraint verified)
[TEST 15] 4 Database Views Active & Querying    ✓ PASSED (All views verified)
[TEST 16] 5 Stored Procedures Executed          ✓ PASSED (Procedures verified)
[TEST 17] 4 Stored Functions Executed           ✓ PASSED (Functions verified)
[TEST 18] Audit Logging Trigger Fired           ✓ PASSED (audit_log populated)
[TEST 19] Transaction ROLLBACK on Error         ✓ PASSED (Integrity Preserved)
[TEST 20] Transaction COMMIT on Success         ✓ PASSED (Record committed)
[TEST 21] JWT Authentication & PBKDF2 Password  ✓ PASSED (akhil_user authenticated)
====================================================
🎉 ALL 20 DATABASE & BACKEND INTEGRATION TESTS PASSED!
====================================================
```

---

## 💻 Step-by-Step Viva & Evaluation Walkthrough

1. **System Startup**:
   ```bash
   npm run dev
   ```
   Frontend: `http://localhost:5173` | Backend: `http://localhost:5001`
2. **Administrator Demonstration (`admin` / `admin123`)**:
   - Open **CRUD Studio (`/crud`)**: Inspect all 23 database tables.
   - Switch to **SQL Compiler & Playground**:
     - Run 4-Table Inner Join preset.
     - Run Stored Procedure preset: `CALL GET_STUDENT_DETAILS(101)`.
     - Run Stored Function preset: `SELECT GET_COURSE_AVERAGE_RATING(301)`.
     - Run `EXPLAIN QUERY PLAN` to showcase indexing strategy.
3. **Student Demonstration (`akhil_user` / `pass1`)**:
   - Course Add/Drop on `/enrollments` (demonstrating transaction safety).
   - Course Details on `/courses/301`: View syllabus modules, submit assignment (attach file + repository URL).
   - Quizzes on `/quizzes`: Take relational quiz and view instant auto-grading.
   - Profile on `/profile`: Mutate 10-digit phone number in `student_phone`.
4. **Faculty Demonstration (`raj@gmail.com` / `prof123`)**:
   - View assigned courses mapped via `teaches`.
   - Submissions on `/submissions`: Grade student submission, test trigger restriction (try awarding 150/100 marks to show trigger interception), and submit valid score with remarks.
