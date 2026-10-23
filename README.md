# 🎓 LMS Portal
### Official University Academic & Learning Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Zero--Setup-003B57.svg)](https://www.sqlite.org/)
[![MySQL](https://img.shields.io/badge/MySQL-Supported-4479A1.svg)](https://www.mysql.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Graph_DB-018bff.svg)](https://neo4j.com/)
[![Tests](https://img.shields.io/badge/Test_Suites-12%2F12%20Passed-brightgreen.svg)]()

**LMS Portal** is an enterprise-grade academic Learning Management System designed to demonstrate core and advanced **Database Management System (DBMS)** principles, graph knowledge networks, and modern full-stack web engineering. Built with a **React 18** frontend, **Node.js/Express** backend, an intelligent **dual-engine relational database architecture** (supporting **MySQL** and zero-configuration **SQLite**), and a cloud **Neo4j Graph Database** for curriculum dependency traversal and prerequisite cycle detection.

---

## 📑 Table of Contents
1. [Recent Major Updates & Latest Additions](#-recent-major-updates--latest-additions)
2. [Multi-Engine System Architecture](#-multi-engine-system-architecture)
3. [Interactive Curriculum Knowledge Graph (Neo4j)](#-interactive-curriculum-knowledge-graph-neo4j)
4. [Real-Time Notification Center (SSE Stream)](#-real-time-notification-center-sse-stream)
5. [Complete Relational Database Schema & Entities](#-complete-relational-database-schema--entities)
6. [Database Normalization Analysis (1NF to BCNF)](#-database-normalization-analysis-1nf-to-bcnf)
7. [Entity-Relationship (ER) Architecture](#-entity-relationship-er-architecture)
8. [Advanced DBMS Concepts Implemented](#-advanced-dbms-concepts-implemented)
   - [Stored Procedures](#1-stored-procedures)
   - [Stored Functions](#2-stored-functions)
   - [Database Triggers & Audit Trail](#3-database-triggers--audit-trail)
   - [Database Views](#4-database-views)
   - [ACID Transactions & Failure Recovery](#5-acid-transactions--failure-recovery)
   - [Indexing Strategy & EXPLAIN Optimization](#6-indexing-strategy--explain-optimization)
   - [Security, Cryptographic Hashing & RBAC](#7-security-cryptographic-hashing--rbac)
9. [Coursework Submission & Document/Code Viewer](#-coursework-submission--documentcode-viewer)
10. [Two-Tier Enrollment Approval Workflow](#-two-tier-enrollment-approval-workflow)
11. [Instructor-Proctor Mentorship & Advisory Meetings](#-instructor-proctor-mentorship--advisory-meetings)
12. [Interactive Quiz & Examination Engine](#-interactive-quiz--examination-engine)
13. [CRUD Studio & Interactive SQL Compiler](#-crud-studio--interactive-sql-compiler)
14. [User Roles, Permissions & Portals](#-user-roles-permissions--portals)
15. [Setup & Quick Start Guide](#-setup--quick-start-guide)
16. [Automated Verification & Test Suites (12 Suites)](#-automated-verification--test-suites-12-suites)
17. [Academic Evaluation Links](#-academic-evaluation-links)

---

## 🛠️ Recent Major Updates & Latest Additions

### 1. Neo4j Graph Database & Curriculum Knowledge Graph (`/curriculum-graph`)
- **Interactive 2D Force-Directed Graph**: Visual curriculum map powered by `react-force-graph-2d` and Neo4j AuraDB.
- **Prerequisite Transitive Traversal**: Computes direct and multi-hop prerequisites using Cypher graph queries.
- **Shortest Learning Pathway**: Graph pathfinding identifying optimal course progression sequences.
- **Cycle Detection**: Algorithmic detection of circular prerequisite dependencies preventing invalid course definitions.
- **Interactive Cypher Playground**: Admin console to execute raw Cypher queries with node/relationship visualizations.
- **Student Progress Overlay**: Real-time coloring of course nodes based on student status (`COMPLETED`, `ENROLLED`, `ELIGIBLE`, `LOCKED`).

### 2. Real-Time Notification Center (Server-Sent Events)
- **Zero-Polling SSE Stream (`/api/notifications/stream`)**: Pushes instant notifications to connected clients.
- **In-App Notification Drawer & Badge**: Unread counters, audio/toast alerts, and bulk "Mark all as read" capability.
- **Automated Event Triggers**: Dispatches alerts for assignment grading, enrollment request decisions, and proctor meeting bookings.

### 3. Submission Content Renderer & Document/Code Viewer
- **Multi-Format Submissions**: Supports solution notes, GitHub/GitLab repository URLs, and uploaded files.
- **In-App Document & Code Viewer**: Modal with syntax highlighting for code files (`.py`, `.sql`, `.js`, `.json`), text previews, and PDF documents.
- **Security Whitelisting**: Strict MIME-type and extension validation preventing executable or malicious file uploads.

### 4. Two-Tier Enrollment Approval Workflow
- **Enrollment Requests Table (`enrollment_request`)**: Tracks registration requests across stages (`PENDING`, `APPROVED`, `REJECTED`).
- **Faculty & Admin Oversight**: Instructors review student requests for their assigned courses with full audit logging.

### 5. Instructor-Proctor Mentorship & Meeting System
- **Relational Alignment**: Auto-synchronizes instructors with their corresponding proctor identity and cabin locations.
- **Advisory Meeting Scheduling**: Students can request 1-on-1 advisory sessions with meeting topics and status tracking.

### 6. Security Audit & IDOR Protection Hardening
- **Strict Role Boundaries**: Admin-only gates on CRUD Studio and Cypher console; instructor-scoped grading permissions.
- **Quiz Key Confidentiality**: Answer keys are strictly withheld from student responses, regardless of query parameters.
- **IDOR Protections**: Enforces that students cannot modify another student's courses, phone records, or password credentials.

---

## 🏛️ Multi-Engine System Architecture

LMS Portal bridges standard relational DBMS constructs with modern graph topologies:

```
                   ┌──────────────────────────────────────────┐
                   │          React 18 SPA Frontend           │
                   │  (Vite + Tailwind CSS + Lucide Icons)    │
                   └────────────────────┬─────────────────────┘
                                        │ REST API & SSE Stream (JSON / JWT)
                   ┌────────────────────▼─────────────────────┐
                   │          Node.js / Express API           │
                   │   Auth / RBAC / Controllers / Services   │
                   └──────────────┬────────────────────┬──────┘
                                  │                    │
        ┌─────────────────────────▼────────┐  ┌────────▼────────────────┐
        │   Unified Relational Dialect     │  │      Neo4j Driver       │
        │  adaptSqlForDialect (MySQL/Lite) │  │  (Cypher Query Engine)  │
        └──────────────┬───────────────────┘  └────────┬────────────────┘
                       │                               │
        ┌──────────────┴───────────────┐               │
 ┌──────▼─────────────────┐   ┌────────▼──────────────┐│
 │      MySQL 8.0+        │   │     SQLite (Local)    ││
 │ (Production / Lab DB)  │   │ (Zero-Setup / lms.db) ││
 └────────────────────────┘   └───────────────────────┘▼
                                          ┌─────────────────────────────┐
                                          │     Neo4j AuraDB Graph      │
                                          │ (Curriculum Knowledge Graph)│
                                          └─────────────────────────────┘
```

### Relational Dialect Adaptation (`adaptSqlForDialect`)
The unified interface in `server/src/config/db.js` dynamically translates queries across engines:
- `INSERT OR IGNORE INTO` ⟷ `INSERT IGNORE INTO`
- `datetime('now', '-15 minutes')` ⟷ `DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
- `datetime('now', '+15 minutes')` ⟷ `DATE_ADD(NOW(), INTERVAL 15 MINUTE)`
- `datetime('now')` ⟷ `NOW()`
- **Graceful Fallback**: If MySQL is unreachable, the system automatically falls back to `server/lms.db`.

---

## 🌐 Interactive Curriculum Knowledge Graph (Neo4j)

Accessible under **Knowledge Graph (`/curriculum-graph`)**:

- **Node Types**: `Course`, `Department`, `Concept`, `Student`.
- **Relationship Types**:
  - `(:Course)-[:REQUIRES_PREREQUISITE]->(:Course)`
  - `(:Course)-[:BELONGS_TO]->(:Department)`
  - `(:Course)-[:COVERS_CONCEPT]->(:Concept)`
  - `(:Student)-[:COMPLETED]->(:Course)`
  - `(:Student)-[:ENROLLED_IN]->(:Course)`
- **Key Cypher Capabilities**:
  - **Prerequisite Tree**: Multi-hop path finding `MATCH path = (c:Course {course_id: $id})-[:REQUIRES_PREREQUISITE*]->(p:Course) RETURN path`
  - **Cycle Detection**: Detects circular loops before prerequisite relations are saved.
  - **Learning Pathway**: Identifies shortest topological learning sequence between introductory and advanced electives.

---

## 🔔 Real-Time Notification Center (SSE Stream)

- **Endpoint**: `GET /api/notifications/stream?userId=:id&role=:role`
- **Architecture**: Persistent Server-Sent Events (SSE) connection keeping frontend badge counters and toast feeds synchronized in real time.
- **Event Catalog**:
  - `[GRADE_POSTED]`: Notifies student when coursework has been evaluated with remarks.
  - `[ENROLLMENT_DECISION]`: Alerts student upon course registration approval or rejection.
  - `[PROCTOR_MEET]`: Notifies proctor/instructor when a student requests an academic advisory session.
  - `[QUIZ_EVALUATION]`: Summary of exam performance and calculated grade.

---

## 🗄️ Complete Relational Database Schema & Entities

The primary database schema is structured into normalized tables:

| # | Table Name | Primary Key | Foreign Key References | Key Attributes / Constraints |
|---|---|---|---|---|
| 1 | `department` | `dept_id` | — | `dept_name` (UNIQUE) |
| 2 | `proctor` | `proctor_id` | — | `first_name`, `last_name`, `cabin_no` |
| 3 | `proctor_phone` | `(proctor_id, phone_no)` | `proctor_id` → `proctor` | Multi-valued contact numbers (10 digits) |
| 4 | `student` | `student_id` | `proctor_id` → `proctor` | `email` (UNIQUE), `dob`, Trigger age ≥ 16 |
| 5 | `account` | `student_id` | `student_id` → `student` | `username` (UNIQUE), `password` (PBKDF2 hash) |
| 6 | `student_phone` | `(student_id, phone_no)` | `student_id` → `student` | Multi-valued student phone numbers |
| 7 | `instructor` | `instructor_id` | `dept_id` → `department` | `email` (UNIQUE), `cabin_no`, `password` |
| 8 | `instructor_phone` | `(instructor_id, phone_no)` | `instructor_id` → `instructor` | Multi-valued faculty contact numbers |
| 9 | `course` | `course_id` | `dept_id` → `department` | `course_name` (UNIQUE), `credits` |
| 10 | `teaches` | `(instructor_id, course_id)` | `instructor_id` → `instructor`, `course_id` → `course` | M:N associative mapping |
| 11 | `module` | `(course_id, module_no)` | `course_id` → `course` | Weak entity: `name`, `lecture_hours` |
| 12 | `assignment` | `(course_id, assignment_id)` | `course_id` → `course` | Weak entity: `name`, `due_date`, `marks` |
| 13 | `quiz` | `(course_id, quiz_id)` | `course_id` → `course` | Weak entity: `title`, `total_marks` |
| 14 | `quiz_question` | `(course_id, quiz_id, question_id)` | `(course_id, quiz_id)` → `quiz` | Weak entity: `question_text`, `marks` |
| 15 | `quiz_option` | `option_id` | `(course_id, quiz_id, question_id)` → `quiz_question` | `option_text`, `is_correct` (0 or 1) |
| 16 | `quiz_attempt` | `attempt_id` | `student_id` → `student`, `quiz` | Exam session, `score`, timestamps |
| 17 | `quiz_answer` | `(attempt_id, question_id)` | `attempt_id` → `quiz_attempt` | Selected option response per question |
| 18 | `enrolls` | `(student_id, course_id)` | `student_id` → `student`, `course_id` → `course` | M:N student course enrollment |
| 19 | `enrollment_request` | `request_id` | `student_id` → `student`, `course_id` → `course` | Two-tier approval (`PENDING`, `APPROVED`, `REJECTED`) |
| 20 | `submits` | `(student_id, course_id, assignment_id)` | `student_id` → `student`, `assignment` | `submission_content`, `marks_obtained`, `status` |
| 21 | `progress_analytics`| `student_id` | `student_id` → `student` | `cgpa`, `time_spent`, `daily_tracker` |
| 22 | `study_session` | `session_id` | `student_id` → `student` | `minutes`, `study_date`, `topic` |
| 23 | `course_feedback` | `(student_id, feedback_no)` | `student_id`, `course_id`, `instructor_id` | `rating` (CHECK 1–5), `comments` |
| 24 | `instructor_notification` | `notification_id` | `instructor_id` → `instructor` | Faculty event feed, `is_read`, timestamps |
| 25 | `audit_log` | `audit_id` | — | Automated trigger audit trail |

---

## 📐 Database Normalization Analysis (1NF to BCNF)

### 1NF (First Normal Form)
- **Requirement**: Atomic values with no repeating groups.
- **Implementation**: Multi-valued telephone numbers are decomposed into dedicated relations:
  - `student_phone(student_id, phone_no)`
  - `instructor_phone(instructor_id, phone_no)`
  - `proctor_phone(proctor_id, phone_no)`

### 2NF (Second Normal Form)
- **Requirement**: 1NF + No partial functional dependencies (all non-prime attributes depend on the entire candidate key).
- **Implementation**:
  - In `submits(student_id, course_id, assignment_id)`, attributes `marks_obtained`, `submission_content`, and `submission_date` depend on the entire composite key.
  - In `module(course_id, module_no)`, `lecture_hours` depends on both the course and the module number.

### 3NF (Third Normal Form)
- **Requirement**: 2NF + No transitive dependencies (where non-prime attributes depend on other non-prime attributes).
- **Implementation**:
  - Department attributes (`dept_name`) are stored in `department(dept_id)`. `student` references `proctor(proctor_id)` and `course` references `department(dept_id)`, eliminating transitive leakage (`course_id → dept_id → dept_name`).

### BCNF (Boyce-Codd Normal Form)
- **Requirement**: For every non-trivial functional dependency `X → Y`, determinant `X` must be a superkey.
- **Implementation**:
  - In `account(student_id, username, password)`: Both `student_id` and `username` are unique candidate keys.
  - In `teaches(instructor_id, course_id)`: All functional dependencies originate from candidate keys.

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
                       ├───── M [Enrollment_Request] ─── Course
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
| `GET_COURSE_STUDENTS` | `p_course_id INT` | Returns complete student roster for an assigned course |
| `GET_STUDENT_COURSES` | `p_student_id INT` | Returns all registered courses for a student |
| `GRADE_ASSIGNMENT` | `p_student_id, p_course_id, p_assign_id, p_marks, p_feedback` | Records marks and instructor remarks, updating status to `GRADED` |

### 2. Stored Functions
| Function Name | Arguments | Return Type | Description |
|---|---|---|---|
| `GET_COURSE_STUDENT_COUNT` | `p_course_id INT` | `INT` | Scalar count of students enrolled in a course |
| `GET_ENROLLMENT_COUNT` | `p_student_id INT` | `INT` | Total number of courses enrolled by a student |
| `GET_STUDENT_AVERAGE_SCORE` | `p_student_id INT` | `DECIMAL(5,2)` | Average score across evaluated coursework |
| `GET_COURSE_AVERAGE_RATING` | `p_course_id INT` | `DECIMAL(3,2)` | Average student feedback rating (1.00 – 5.00 stars) |

### 3. Database Triggers & Audit Trail
1. **`check_student_age`**: `BEFORE INSERT` trigger on `student` enforcing that all registered students must be at least 16 years old (`dob <= DATE('now', '-16 years')`).
2. **`trg_submission_marks_check`**: `BEFORE UPDATE / INSERT` trigger on `submits` preventing awarded marks from exceeding assignment maximum marks or being negative (`0 <= marks <= max_marks`).
3. **`audit_student_insert`**: `AFTER INSERT` trigger on `student` logging new student registrations into `audit_log`.

### 4. Database Views
1. **`student_course_view`**: Denormalized join of students, enrolled courses, and departments.
2. **`course_enrollment_summary`**: Aggregate count of enrolled students per course.
3. **`student_performance_view`**: Combined academic performance metrics (CGPA, study time, assignment marks).
4. **`course_feedback_summary`**: Course-level feedback aggregation (average rating and review count).

### 5. ACID Transactions & Failure Recovery
- Course registration, Add/Drop, and grading workflows execute within `dbTransaction(callback)`.
- Automatic `ROLLBACK` on constraint violations and `COMMIT` on successful completion.
- Verified in `server/src/testIntegration.js` [TEST 19 & 20].

### 6. Indexing Strategy & EXPLAIN Optimization
- Foreign key indexes: `idx_teaches_course`, `idx_submits_student`, `idx_enrolls_course`, `idx_course_feedback_course`.
- Filter column indexes: `idx_student_dob`, `idx_assignment_due`.
- Optimization verified via `EXPLAIN QUERY PLAN` in CRUD Studio.

### 7. Security, Cryptographic Hashing & RBAC
- **Password Hashing**: Node.js `crypto.pbkdf2Sync` (10,000 iterations, SHA-512) with unique cryptographic salts.
- **JWT Authentication**: Cryptographically signed tokens passed via HTTP `Authorization: Bearer <token>`.
- **Role-Based Access Control**: Middleware guards (`requireAuth`, `requireAdmin`, `requireRole`) separating Student, Instructor, and Admin privileges.

---

## 📝 Coursework Submission & Document/Code Viewer

- **Multi-Format Uploads**: Students can submit code/notes, repository URLs, and uploaded files.
- **Real-Time Grade Preservation**: Resubmissions preserve awarded grades (`GRADED`) and instructor remarks.
- **Due-Date Logic**: Automatically compares submission timestamp with `assignment.due_date`, tagging late submissions as `LATE`.
- **In-App Document & Code Viewer**: Dedicated viewer rendering SQL syntax, Python, JavaScript, and PDFs directly in the browser without third-party plugins.
- **Grading Portal (`/submissions`)**: Faculty interface to review submissions, enter marks (`marks <= max_marks`, enforced by DB trigger), and return remarks.

---

## 📋 Two-Tier Enrollment Approval Workflow

1. **Student Request**: Student submits a registration request for an available course.
2. **Faculty Evaluation**: The assigned instructor reviews the request and ward records.
3. **Admin Verification**: Administrators oversee capacity limits and finalize approvals.
4. **Automated Notification**: Status changes dispatch instant SSE notifications to the student.

---

## 🤝 Instructor-Proctor Mentorship & Advisory Meetings

- **Faculty-Proctor Alignment**: Automatically associates instructor records with their corresponding proctor identity and office cabin.
- **Advisory Meeting Bookings**: Students can schedule academic advisory sessions with their proctor.
- **Meeting Notification Pipeline**: Generates `[PROCTOR_MEET]` notifications for faculty review.

---

## 🎯 Interactive Quiz & Examination Engine

- **Relational Structure**: Hierarchical structure from `course` → `quiz` → `quiz_question` → `quiz_option`.
- **Exam Session Recording**: Upon submission, an entry is created in `quiz_attempt` with calculated scores and timestamps.
- **Choice Tracking**: Individual responses are logged into `quiz_answer` for student review.
- **Answer Key Security**: Answer keys are strictly protected and never leaked to student clients.

---

## 💻 CRUD Studio & Interactive SQL Compiler

Accessible in the web application under **CRUD Studio (`/crud`)**:

- **Complete Table Entity Management**: Browse, search, filter, insert, update, and delete records across all database tables.
- **Interactive SQL Compiler**:
  - Execute arbitrary SQL statements (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
  - View detailed execution performance metrics (duration in ms, affected rows).
  - Export query results directly to **CSV** or **JSON**.
  - `EXPLAIN QUERY PLAN` visualization for performance analysis.
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

## 👥 User Roles, Permissions & Portals

| Role | Default Credentials | Available Portals & Capabilities |
|---|---|---|
| **Student** | `akhil_user` / `pass1` | Course catalog, Add/Drop registration, Coursework submission (files + code + URLs), Relational Quizzes, Faculty Feedback, Study Sessions, CGPA Leaderboard, Proctor Advisory |
| **Instructor** | `raj@gmail.com` / `prof123` | Assigned courses (via `teaches`), Coursework grading with mark triggers, Student feedback analytics, Proctor ward meetings, Enrollment request approvals |
| **Administrator** | `admin` / `admin123` | Full SQL CRUD Studio, Neo4j Curriculum Knowledge Graph & Cypher Playground, University analytics, Audit log inspector |

*Convenient 1-click **Demo Login Pills** are provided on the `/login` page for fast role switching during demonstrations.*

---

## 🚀 Setup & Quick Start Guide

### Prerequisites
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- *(Optional)* **MySQL** (v8.0+) if running in MySQL mode
- *(Optional)* **Neo4j AuraDB** instance (pre-configured in `.env`)

### 1. Installation
Clone the repository and install all dependencies:
```bash
npm run install:all
```

### 2. Start the Application
Run both frontend and backend concurrently:
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

## 🧪 Automated Verification & Test Suites (12 Suites)

Run the full automated test suite containing all 12 systematic verification scripts:

```bash
cd server && npm test
```

### Test Suite Breakdown:
1. **`testIntegration.js`**: Core 20-test DBMS suite (student age trigger `≥ 16`, composite primary keys, quiz scoring, trigger marks constraint `0 ≤ marks ≤ max_marks`, feedback rating constraint `1 ≤ rating ≤ 5`, views, procedures, functions, audit triggers, ACID transactions).
2. **`testInstructorAssignmentFlow.js`**: Instructor coursework assignment creation, editing, and scoping.
3. **`testGradingFlow.js`**: Submission evaluation, marks validation triggers, and status updates.
4. **`testInstructorFlow.js`**: Faculty course mapping via `teaches`, roster generation, and rating analytics.
5. **`testSecurityAndRank.js`**: Window functions (`RANK() OVER`), leaderboards, and salt-based PBKDF2 cryptography.
6. **`testStudentPortal.js`**: Complete student lifecycle (Add/Drop, submissions, quizzes, study sessions).
7. **`testInstructorProfileAndProctor.js`**: Proctor ward allocations, cabin synchronization, and phone records.
8. **`testAdminEnhancements.js`**: Administrative controls, user provisioning, and audit logs.
9. **`testEnrollmentApproval.js`**: Two-tier registration approval workflows (`enrollment_request`).
10. **`testNotifications.js`**: SSE real-time event streaming, unread counters, and mark-as-read transitions.
11. **`testFixes16_14_12_11_9.js`**: Systematic verification of CRUD Studio schemas, deduplicated feedback, and proctor meeting dispatches.
12. **`testSecurityAuditFixes.js`**: Strict IDOR boundary protections, quiz key confidentiality, and upload extension whitelisting.

---

## 🔗 Academic Evaluation Links
- [Project Report (Detailed Academic Documentation)](PROJECT_REPORT.md)
- [DBMS Demonstration Guide (Query Copy-Paste Presets)](DBMS_DEMONSTRATION.md)
- [Database Schema DDL (Standalone SQL Script)](schema.sql)
