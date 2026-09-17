# 🎓 LMS Portal
### Official University Academic & Learning Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Zero--Setup-003B57.svg)](https://www.sqlite.org/)
[![MySQL](https://img.shields.io/badge/MySQL-Supported-4479A1.svg)](https://www.mysql.com/)
[![Tests](https://img.shields.io/badge/Tests-20%2F20%20Passed-brightgreen.svg)]()

**LMS Portal** is a production-grade, full-stack academic Learning Management System designed to demonstrate enterprise **Database Management System (DBMS)** principles and modern web development. Built with a **React 18** frontend, **Node.js/Express** backend, and an intelligent **dual-engine database architecture** supporting both **MySQL** and zero-configuration **SQLite**.

---

## 📑 Table of Contents
1. [Recent Major Updates & Resolved Issues](#-recent-major-updates--resolved-issues)
2. [System Architecture & Operational Layers](#-system-architecture--operational-layers)
3. [Dual-Engine Database Architecture (MySQL + SQLite)](#-dual-engine-database-architecture-mysql--sqlite)
4. [Complete 23-Table Relational Schema](#-complete-23-table-relational-schema)
5. [Database Normalization Analysis (1NF to BCNF)](#-database-normalization-analysis-1nf-to-bcnf)
6. [Entity-Relationship (ER) Architecture](#-entity-relationship-er-architecture)
7. [Advanced DBMS Concepts Implemented](#-advanced-dbms-concepts-implemented)
   - [Stored Procedures](#1-stored-procedures)
   - [Stored Functions](#2-stored-functions)
   - [Database Triggers & Audit Trail](#3-database-triggers--audit-trail)
   - [Database Views](#4-database-views)
   - [ACID Transactions & Failure Recovery](#5-acid-transactions--failure-recovery)
   - [Indexing Strategy & EXPLAIN Optimization](#6-indexing-strategy--explain-optimization)
   - [Security, Cryptographic Hashing & RBAC](#7-security-cryptographic-hashing--rbac)
8. [Coursework Submission & Grading Pipeline](#-coursework-submission--grading-pipeline)
9. [Interactive Quiz & Examination Engine](#-interactive-quiz--examination-engine)
10. [CRUD Studio & Interactive SQL Compiler](#-crud-studio--interactive-sql-compiler)
11. [User Roles & Portals](#-user-roles--portals)
12. [Setup & Quick Start](#-setup--quick-start)
13. [Automated Verification & Test Suites](#-automated-verification--test-suites)
14. [Academic Evaluation Links](#-academic-evaluation-links)

---

## 🛠️ Recent Major Updates & Resolved Issues

### 1. Coursework Submission System Overhaul
- **Multi-Format Submissions**: Students can submit coursework with solution notes/SQL code, project repository URLs (GitHub/GitLab), and local document or code archive attachments (PDF, ZIP, DOCX, SQL, Code files).
- **Interactive File Attachment**: Replaced previously inert file upload elements with a functional file picker, automatic file size calculation (KB/MB), and a clear/remove option.
- **Removed Form Constraints**: Eliminated strict HTML5 `required` constraints on the notes textarea, allowing students to submit files or URLs without mandatory text notes.
- **Controlled URL Binding**: The repository URL input is now bound to reactive component state and included in the database submission content payload.
- **Due-Date & Late Evaluation**: Submissions automatically evaluate the current date against the assignment's `due_date`, assigning `SUBMITTED` or `LATE` accordingly.
- **Grade Preservation**: Resubmitting or updating an already evaluated assignment preserves the existing `GRADED` status and awarded marks.
- **Dual-Portal Live Synchronization**: Both Course Details (`/courses/:id`) and Assignments (`/assignments`) perform a `LEFT JOIN` against the `submits` table for the authenticated student, rendering real-time badges (`Graded: X/Y`, `Submitted`, `Submitted (Late)`, `Pending`) and instructor feedback remarks.

### 2. MySQL & Cross-Dialect Compatibility Resolution
- **Quiz Submission Syntax Fix**: Resolved a MySQL syntax rejection caused by SQLite-specific `datetime('now', '-15 minutes')` by computing standard ISO timestamp strings in Node.js and passing them via parameterized bindings `(?, ?, ?, ?, ?, ?)`.
- **Cross-Dialect Adapter (`adaptSqlForDialect`)**: Added an intelligent query translation bridge in `server/src/config/db.js` (`dbAll`, `dbGet`, `dbRun`, `dbTransaction`) that automatically translates dialect-specific SQL constructs on the fly (e.g. `INSERT OR IGNORE` $\longleftrightarrow$ `INSERT IGNORE`, `datetime('now')` $\longleftrightarrow$ `NOW()`).
- **Standardized Datetime Operations**: Standardized timestamps in `submitCourseFeedback`, `logStudySession`, and `submitAssignment` to ANSI SQL standard ISO format.

### 3. Unified Brand Identity
- Official branding updated to **LMS Portal** (**Official University Academic & Learning Management System**) across Login, Navbar, Sidebar, Page Title, and Documentation.

---

## 🏛️ System Architecture & Operational Layers

LMS Portal models a modern enterprise university environment and provides two tightly integrated operational layers:

```
                  ┌──────────────────────────────────────────┐
                  │          React 18 SPA Frontend           │
                  │  (Vite + Tailwind CSS + Lucide Icons)    │
                  └────────────────────┬─────────────────────┘
                                       │ REST API (JSON / JWT)
                  ┌────────────────────▼─────────────────────┐
                  │          Node.js / Express API           │
                  │   Auth / RBAC / Controllers / Business   │
                  └────────────────────┬─────────────────────┘
                                       │
                  ┌────────────────────▼─────────────────────┐
                  │      Unified Query & Dialect Bridge      │
                  │    adaptSqlForDialect (MySQL / SQLite)   │
                  └──────────────┬──────────────────┬────────┘
                                 │                  │
           ┌─────────────────────▼──┐    ┌──────────▼───────────────┐
           │     MySQL Engine       │    │  Local SQLite Engine     │
           │ (Production / External)│    │ (Zero-Setup / Fallback)  │
           └────────────────────────┘    └──────────────────────────┘
```

1. **Academic Portals**:
   - **Student Portal**: Course registration (Add/Drop with transaction rollback), syllabus and module tracking, multi-format assignment submissions (notes, repository links, file attachments), relational quizzes with automatic scoring, faculty feedback with domain check constraints, and department rank leaderboard.
   - **Instructor Portal**: Course oversight for mapped courses via `teaches`, submission reviewing with mark constraints (marks $\le$ assignment max marks), grading and feedback, and student rating analytics.
   - **Administrator Portal**: Academic control center, user role provisioning, system status monitoring, and audit log inspection.
2. **Database Engine & CRUD Studio**:
   - Complete management of all **23 normalized relational tables**.
   - Interactive SQL compiler with `EXPLAIN QUERY PLAN` visualization, execution timers, and CSV/JSON export.
   - 18 pre-configured DBMS academic demonstration query presets.

---

## 🔄 Dual-Engine Database Architecture (MySQL + SQLite)

The platform supports seamless operation across both **MySQL** and **SQLite** without code duplication or manual SQL modifications:

- **Automatic Dialect Adaptation (`adaptSqlForDialect`)**:
  The unified database interface in `server/src/config/db.js` translates SQL queries dynamically:
  - `INSERT OR IGNORE INTO` $\longleftrightarrow$ `INSERT IGNORE INTO`
  - `datetime('now', '-15 minutes')` $\longleftrightarrow$ `DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
  - `datetime('now', '+15 minutes')` $\longleftrightarrow$ `DATE_ADD(NOW(), INTERVAL 15 MINUTE)`
  - `datetime('now')` $\longleftrightarrow$ `NOW()`
- **Standardized Parameterized Timestamps**:
  All datetime operations construct standard ISO timestamp strings (`'YYYY-MM-DD HH:MM:SS'`) in Node.js and bind them as parameters `(?, ?, ?, ...)`, eliminating syntax ambiguity across database engines.
- **Graceful Fallback**:
  If MySQL is configured in `.env` but unavailable, the backend gracefully falls back to the embedded SQLite database (`server/lms.db`), ensuring zero setup barrier for evaluation.

---

## 🗄️ Complete 23-Table Relational Schema

The database schema is organized into **23 normalized tables**:

| # | Table Name | Primary Key | Foreign Key References | Key Attributes / Constraints |
|---|---|---|---|---|
| 1 | `department` | `dept_id` | — | `dept_name` (UNIQUE) |
| 2 | `proctor` | `proctor_id` | — | `first_name`, `last_name`, `cabin_no` |
| 3 | `proctor_phone` | `(proctor_id, phone_no)` | `proctor_id` $\to$ `proctor` | Multi-valued phone numbers (10 digits) |
| 4 | `student` | `student_id` | `proctor_id` $\to$ `proctor` | `email` (UNIQUE), `dob`, Trigger age $\ge 16$ |
| 5 | `account` | `student_id` | `student_id` $\to$ `student` | `username` (UNIQUE), `password` (PBKDF2 hash) |
| 6 | `student_phone` | `(student_id, phone_no)` | `student_id` $\to$ `student` | Multi-valued student phone numbers |
| 7 | `instructor` | `instructor_id` | `dept_id` $\to$ `department` | `email` (UNIQUE), `cabin_no`, `password` |
| 8 | `instructor_phone` | `(instructor_id, phone_no)` | `instructor_id` $\to$ `instructor` | Multi-valued instructor phones |
| 9 | `course` | `course_id` | `dept_id` $\to$ `department` | `course_name` (UNIQUE) |
| 10 | `teaches` | `(instructor_id, course_id)` | `instructor_id` $\to$ `instructor`, `course_id` $\to$ `course` | M:N associative mapping |
| 11 | `module` | `(course_id, module_no)` | `course_id` $\to$ `course` | Weak entity: `name`, `lecture_hours` |
| 12 | `assignment` | `(course_id, assignment_id)` | `course_id` $\to$ `course` | Weak entity: `name`, `due_date`, `marks` |
| 13 | `quiz` | `(course_id, quiz_id)` | `course_id` $\to$ `course` | Weak entity: `title`, `total_marks` |
| 14 | `quiz_question` | `(course_id, quiz_id, question_id)` | `(course_id, quiz_id)` $\to$ `quiz` | Weak entity: `question_text`, `marks` |
| 15 | `quiz_option` | `option_id` | `(course_id, quiz_id, question_id)` $\to$ `quiz_question` | `option_text`, `is_correct` (0 or 1) |
| 16 | `quiz_attempt` | `attempt_id` | `student_id` $\to$ `student`, `quiz` | Exam session, `score`, timestamps |
| 17 | `quiz_answer` | `(attempt_id, question_id)` | `attempt_id` $\to$ `quiz_attempt` | Selected option response per question |
| 18 | `enrolls` | `(student_id, course_id)` | `student_id` $\to$ `student`, `course_id` $\to$ `course` | M:N student course enrollment |
| 19 | `submits` | `(student_id, course_id, assignment_id)` | `student_id` $\to$ `student`, `assignment` | `submission_content`, `marks_obtained`, `status` |
| 20 | `progress_analytics`| `student_id` | `student_id` $\to$ `student` | `cgpa`, `time_spent`, `daily_tracker` |
| 21 | `study_session` | `session_id` | `student_id` $\to$ `student` | `minutes`, `study_date`, `topic` |
| 22 | `course_feedback` | `(student_id, feedback_no)` | `student_id`, `course_id`, `instructor_id` | `rating` (CHECK 1–5), `comments` |
| 23 | `audit_log` | `audit_id` | — | Automated trigger audit trail |

---

## 📐 Database Normalization Analysis (1NF to BCNF)

### 1NF (First Normal Form)
- **Requirement**: Attributes contain only atomic, indivisible values; no repeating groups.
- **Application**: Multi-valued contact numbers are decomposed into dedicated relations:
  - `student_phone(student_id, phone_no)`
  - `instructor_phone(instructor_id, phone_no)`
  - `proctor_phone(proctor_id, phone_no)`

### 2NF (Second Normal Form)
- **Requirement**: 1NF + No partial functional dependencies (non-prime attributes must depend on the entire candidate key).
- **Application**:
  - In `submits(student_id, course_id, assignment_id)`, attributes `marks_obtained`, `submission_content`, and `submission_date` depend on the whole composite candidate key.
  - In `module(course_id, module_no)`, `lecture_hours` depends on both the course and the specific module number.

### 3NF (Third Normal Form)
- **Requirement**: 2NF + No transitive dependencies ($X \to Y$ and $Y \to Z$ where $Z$ is non-prime).
- **Application**:
  - Department attributes (`dept_name`) are stored in `department(dept_id)`. `student` references only `proctor(proctor_id)` and `course` references `department(dept_id)`, preventing transitive leakage ($course\_id \to dept\_id \to dept\_name$).

### BCNF (Boyce-Codd Normal Form)
- **Requirement**: For every non-trivial functional dependency $X \to Y$, determinant $X$ must be a candidate key (superkey).
- **Application**:
  - In `account(student_id, username, password)`: Both `student_id` and `username` are unique candidate keys. Every determinant is a candidate key.
  - In `teaches(instructor_id, course_id)`: The only functional dependencies have the entire composite candidate key as determinant.

---

## 📊 Entity-Relationship (ER) Architecture

```
  [Department] 1 ──── N [Course] 1 ──── N [Module] (Weak)
       │                    │
       │                    ├──── N [Assignment] (Weak) 1 ──┐
       │                    │                               │
       │                    ├──── N [Quiz] 1 ── N [Question] 1 ── N [Option]
       │                    │        │
       │                    │        └── 1 [Quiz_Attempt] 1 ── N [Quiz_Answer]
       │                    │
  [Instructor] N ──── M [Teaches] ─── Course
       │
  [Proctor] 1 ──── N [Student] 1 ──── 1 [Account]
                       │  │
                       │  └── N [Student_Phone]
                       │
                       ├───── M [Enrolls] ───── N [Course]
                       │
                       ├───── M [Submits] ───── N [Assignment]
                       │
                       ├───── 1 [Progress_Analytics]
                       ├───── N [Study_Session]
                       └───── N [Course_Feedback] ─── [Course] / [Instructor]
```

---

## ⚡ Advanced DBMS Concepts Implemented

### 1. Stored Procedures
| Procedure Name | Arguments | Description |
|---|---|---|
| `GET_STUDENT_DETAILS` | `p_student_id INT` | Returns demographic, proctor, and account information for a student |
| `ENROLL_STUDENT` | `p_student_id INT, p_course_id INT` | Enrolls student with duplicate checks and transaction safety |
| `GET_COURSE_STUDENTS` | `p_course_id INT` | Returns the complete student roster for a course |
| `GET_STUDENT_COURSES` | `p_student_id INT` | Returns all registered courses for a student |
| `GRADE_ASSIGNMENT` | `p_student_id, p_course_id, p_assign_id, p_marks, p_feedback` | Records marks and instructor remarks, updating status to `GRADED` |

### 2. Stored Functions
| Function Name | Arguments | Return Type | Description |
|---|---|---|---|
| `GET_COURSE_STUDENT_COUNT` | `p_course_id INT` | `INT` | Scalar count of students enrolled in a course |
| `GET_ENROLLMENT_COUNT` | `p_student_id INT` | `INT` | Total number of courses enrolled by a student |
| `GET_STUDENT_AVERAGE_SCORE` | `p_student_id INT` | `DECIMAL(5,2)` | Average score across all evaluated coursework submissions |
| `GET_COURSE_AVERAGE_RATING` | `p_course_id INT` | `DECIMAL(3,2)` | Average student feedback rating (1.00 – 5.00 stars) |

### 3. Database Triggers & Audit Trail
1. **`check_student_age`**: `BEFORE INSERT` trigger on `student` enforcing that all registered students must be at least 16 years old.
2. **`trg_submission_marks_check`**: `BEFORE UPDATE / INSERT` trigger on `submits` preventing awarded marks from exceeding assignment maximum marks or being negative.
3. **`audit_student_insert`**: `AFTER INSERT` trigger on `student` logging new student registrations into `audit_log`.

### 4. Database Views
1. **`student_course_view`**: Denormalized join of students, enrolled courses, and departments.
2. **`course_enrollment_summary`**: Aggregate count of enrolled students per course.
3. **`student_performance_view`**: Combined academic performance metrics (CGPA, study time, assignment marks).
4. **`course_feedback_summary`**: Course-level feedback aggregation (average rating and review count).

### 5. ACID Transactions & Failure Recovery
- Course enrollment and grading workflows execute within `dbTransaction(callback)`.
- Automatic `ROLLBACK` on constraint violations and `COMMIT` upon completion.
- Verified in `server/src/testIntegration.js` [TEST 19 & 20].

### 6. Indexing Strategy & EXPLAIN Optimization
- Foreign key indexes: `idx_teaches_course`, `idx_submits_student`, `idx_enrolls_course`, `idx_course_feedback_course`.
- Filter column indexes: `idx_student_dob`, `idx_assignment_due`.
- Optimization verified via `EXPLAIN QUERY PLAN` in CRUD Studio.

### 7. Security, Cryptographic Hashing & RBAC
- **Password Hashing**: Node.js `crypto.pbkdf2Sync` (10,000 iterations, SHA-512) with unique cryptographic salts.
- **JWT Authentication**: Cryptographically signed tokens stored in localStorage and passed via HTTP `Authorization: Bearer <token>`.
- **Role-Based Access Control**: Middleware guards (`requireAuth`, `requireAdmin`, `requireRole`).

---

## 📝 Coursework Submission & Grading Pipeline

The assignment submission system supports full academic coursework workflows:

### Features & Capabilities
1. **Multi-Format Submissions**:
   - **Solution Notes & Code**: Students can type or paste SQL queries, code snippets, or explanation notes.
   - **Project Repository URLs**: Bound input for GitHub, GitLab, or cloud repository links.
   - **File Attachments**: Functional file selector supporting PDF, ZIP, DOCX, SQL, or code archives with real-time file size calculation and remove option.
2. **Due-Date & Late Status Tracking**:
   - Compares the submission timestamp against the assignment's `due_date`.
   - Submissions on or before the due date receive status `SUBMITTED`.
   - Submissions after the due date receive status `LATE`.
3. **Grade Preservation**:
   - If a student updates or resubmits coursework that has already been evaluated, the existing grade (`GRADED`) and marks are preserved.
4. **Dual-Portal Synchronization**:
   - **Course Details (`/courses/:id`)**: Displays live status badges (`Graded: X/Y`, `Submitted`, `Submitted (Late)`, `Pending`), submission dates, instructor remarks, and refetches automatically upon submission.
   - **Assignments Page (`/assignments`)**: Offers global overview of all pending and submitted assignments across all enrolled courses.
   - **Grading Portal (`/submissions`)**: Dedicated faculty interface to evaluate submissions, enter marks ($\le \text{max\_marks}$ enforced by DB trigger), and return feedback.

---

## 🎯 Interactive Quiz & Examination Engine

The examination module evaluates student responses against database-stored option keys:

- **Relational Structure**: Hierarchical structure from `course` $\to$ `quiz` $\to$ `quiz_question` $\to$ `quiz_option`.
- **Exam Session Recording**: Upon submission, an entry is created in `quiz_attempt` with calculated scores and timestamps.
- **Choice Tracking**: Individual responses are logged into `quiz_answer` for student review.
- **Cross-Database Timestamp Safety**: Timestamps are computed as standard ISO date strings in Node.js, ensuring 100% compatibility across both SQLite and MySQL without dialect syntax errors.

---

## 💻 CRUD Studio & Interactive SQL Compiler

Accessible in the web application under **CRUD Studio (`/crud`)**:

- **23-Table Entity Management**: Browse, search, filter, insert, update, and delete records across all database tables.
- **Interactive SQL Compiler**:
  - Execute arbitrary SQL statements (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
  - View detailed execution performance metrics (duration in ms, affected rows).
  - Export query results directly to **CSV** or **JSON**.
  - `EXPLAIN QUERY PLAN` visualization button for performance analysis.
- **18 Pre-Configured Academic DBMS Presets**:
  - Inner Joins (4-table join)
  - Left Outer Joins
  - M:N Teaches associative queries
  - `GROUP BY` and `HAVING` aggregate filters
  - Aggregate Functions (`COUNT`, `AVG`, `MIN`, `MAX`)
  - Nested Non-Correlated Subqueries
  - Correlated Subqueries
  - Relational Division simulation
  - Database Views
  - Stored Procedures (`CALL ...`)
  - Stored Functions (`SELECT ...`)
  - Triggers & Constraint Interceptions
  - Window Functions (`RANK() OVER`)
  - Query Optimization (`EXPLAIN QUERY PLAN`)

---

## 👥 User Roles & Portals

| Role | Default Credentials | Available Features |
|---|---|---|
| **Student** | `akhil_user` / `pass1` | Course catalog, Add/Drop registration, Coursework submission (files + URLs), Relational Quizzes, Faculty Feedback, Study Session Logger, CGPA Leaderboard |
| **Instructor** | `raj@gmail.com` / `prof123` | Assigned courses (via `teaches`), Coursework grading & review with mark validation, Student feedback analytics |
| **Administrator** | `admin` / `admin123` | Full 23-Table CRUD Studio, Interactive SQL Compiler & Execution Engine, Audit log inspector |

*Convenient 1-click **Demo Login Pills** are provided on the `/login` page for fast role switching during demonstrations.*

---

## 🚀 Setup & Quick Start

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- *(Optional)* **MySQL** (v8.0+) if running in MySQL mode

### 1. Installation
Clone the repository and install all frontend and backend dependencies:
```bash
npm run install:all
```

### 2. Start the Development Servers
```bash
npm run dev
```
- **Backend API**: `http://localhost:5001`
- **Frontend Application**: `http://localhost:5173`

### 3. Database Engine Configuration

#### Option A: SQLite (Default — Zero Setup)
No configuration required. The backend automatically creates, migrates, and seeds `server/lms.db`.

#### Option B: MySQL (Production / Lab Environment)
1. Import the schema and seed data into MySQL:
   ```bash
   mysql -u root -p < schema.sql
   ```
2. Configure `server/.env`:
   ```env
   PORT=5001
   DB_TYPE=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=lms
   ```
3. Restart the backend server. The database adapter connects to MySQL, verifies table schema, and applies dialect translation automatically.

---

## 🧪 Automated Verification & Test Suites

The codebase includes comprehensive automated test suites to verify database constraints, triggers, procedures, and API endpoints:

### 1. Database & Backend Integration Suite (20 Tests)
```bash
node server/src/testIntegration.js
```
Verifies:
- Student demographic insertions and trigger age enforcement ($\ge 16$).
- Course creation and `teaches` M:N relationships.
- Enrollment composite primary key uniqueness.
- Coursework submission and trigger marks constraint ($0 \le \text{marks} \le \text{max\_marks}$).
- Relational quiz scoring and attempt evaluation.
- Course feedback CHECK constraint ($1 \le \text{rating} \le 5$).
- Views, Stored Procedures, Stored Functions, and Audit triggers.
- ACID transaction `ROLLBACK` and `COMMIT`.

### 2. Student Portal End-to-End Suite
```bash
node server/src/testStudentPortal.js
```
Verifies student profile updates, phone mutations, study session logging, course drop/add, assignment submission, quiz grading, and feedback recording.

---

## 🔗 Academic Evaluation Links
- [Project Report (Detailed Academic Documentation)](PROJECT_REPORT.md)
- [DBMS Demonstration Guide (Query Copy-Paste Presets)](DBMS_DEMONSTRATION.md)
- [Database Schema DDL (Standalone SQL Script)](schema.sql)
