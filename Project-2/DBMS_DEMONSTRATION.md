# 🎓 Academic DBMS Demonstration Guide

This document contains step-by-step SQL queries, relational database concepts, and expected outputs designed for **faculty evaluation**, **lab viva**, and **project demonstration**.

All queries can be executed directly inside the **Interactive SQL Compiler & CRUD Studio** (`/crud`) within the web application, or in any MySQL / SQLite CLI.

---

## 📋 Table of Contents
1. [Basic DDL & Relational Schema (23 Tables)](#1-basic-ddl--relational-schema)
2. [Data Manipulation (DML: INSERT, UPDATE, DELETE)](#2-data-manipulation)
3. [Multi-Table Joins (INNER, LEFT, 4-Table Join)](#3-multi-table-joins)
4. [Aggregation, GROUP BY & HAVING](#4-aggregation-group-by--having)
5. [Subqueries (Nested & Correlated)](#5-subqueries-nested--correlated)
6. [Relational Division Simulation](#6-relational-division-simulation)
7. [Database Views (4 Academic Views)](#7-database-views)
8. [Stored Procedures (5 Procedures)](#8-stored-procedures)
9. [Stored Functions (4 Functions)](#9-stored-functions)
10. [Database Triggers & Audit Logging](#10-database-triggers--audit-logging)
11. [ACID Transactions & Rollback](#11-acid-transactions--rollback)
12. [Window Functions & Dynamic Ranking](#12-window-functions--dynamic-ranking)
13. [Query Optimization & Execution Plan (EXPLAIN)](#13-query-optimization--execution-plan)

---

## 1. Basic DDL & Relational Schema

The LMS schema consists of **23 normalized relational tables**:

```sql
-- View all tables in SQLite
SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY type, name;

-- View all tables in MySQL
SHOW FULL TABLES;
```

### Key Relationships & Foreign Keys
- `student` $\to$ `proctor` (`proctor_id`)
- `account` $\to$ `student` (`student_id` 1:1)
- `student_phone` $\to$ `student` (`student_id` 1:N multi-valued attribute)
- `teaches` $\to$ `instructor` & `course` (M:N mapping resolving faculty assignment)
- `quiz_question` $\to$ `quiz` (`course_id`, `quiz_id`)
- `quiz_option` $\to$ `quiz_question` (`question_id`)
- `quiz_attempt` $\to$ `student` & `quiz`
- `quiz_answer` $\to$ `quiz_attempt` & `quiz_question`
- `submits` $\to$ `student` & `assignment` (with marks check trigger)
- `course_feedback` $\to$ `student`, `course`, `instructor` (with CHECK 1-5 rating)

---

## 2. Data Manipulation

### Insert a Valid Student (DML)
```sql
INSERT INTO student (student_id, first_name, last_name, dob, email, proctor_id) 
VALUES (106, 'Vikram', 'Sharma', '2001-04-10', 'vikram@gmail.com', 1);

-- Verify insertion
SELECT * FROM student WHERE student_id = 106;
```

### Update Student Contact (DML)
```sql
UPDATE student_phone 
SET phone_no = '9876543299' 
WHERE student_id = 101 AND phone_no = '9123456780';
```

### Delete with Referential Integrity
```sql
-- Safe deletion of test student
DELETE FROM student WHERE student_id = 106;
```

---

## 3. Multi-Table Joins

### 3.1 Inner Join (4 Tables: Student + Submissions + Course + Assignment)
Demonstrates multi-table navigation across foreign key relationships:
```sql
SELECT 
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    c.course_name,
    a.name AS assignment_name,
    a.marks AS max_marks,
    sub.marks_obtained,
    sub.status,
    sub.submission_date
FROM student s
JOIN submits sub ON s.student_id = sub.student_id
JOIN course c ON sub.course_id = c.course_id
JOIN assignment a ON sub.course_id = a.course_id AND sub.assignment_id = a.assignment_id
ORDER BY s.student_id, sub.submission_date DESC;
```

### 3.2 Left Outer Join (Instructors, Cabins & Contact Numbers)
Preserves all instructors even if they do not have a recorded phone number:
```sql
SELECT 
    i.instructor_id,
    i.first_name || ' ' || i.last_name AS faculty_name,
    d.dept_name,
    i.cabin_no,
    COALESCE(ip.phone_no, 'No phone registered') AS contact_phone
FROM instructor i
LEFT JOIN department d ON i.dept_id = d.dept_id
LEFT JOIN instructor_phone ip ON i.instructor_id = ip.instructor_id
ORDER BY i.instructor_id;
```

### 3.3 M:N TEACHES Relationship Join
Demonstrates how courses map to one or more faculty instructors:
```sql
SELECT 
    c.course_id,
    c.course_name,
    i.instructor_id,
    i.first_name || ' ' || i.last_name AS instructor_name,
    i.email,
    i.cabin_no
FROM course c
JOIN teaches t ON c.course_id = t.course_id
JOIN instructor i ON t.instructor_id = i.instructor_id
ORDER BY c.course_id, i.instructor_id;
```

---

## 4. Aggregation, GROUP BY & HAVING

### 4.1 Course Enrollment with HAVING Filter ($\ge 2$ Students)
Identifies popular courses having at least 2 students enrolled:
```sql
SELECT 
    c.course_id,
    c.course_name,
    COUNT(e.student_id) AS enrolled_student_count
FROM course c
JOIN enrolls e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
HAVING COUNT(e.student_id) >= 2
ORDER BY enrolled_student_count DESC;
```

### 4.2 Comprehensive Statistical Aggregates
Calculates count, average, minimum, and maximum marks:
```sql
SELECT 
    COUNT(*) AS total_graded_submissions,
    ROUND(AVG(marks_obtained), 2) AS average_score,
    MIN(marks_obtained) AS lowest_score,
    MAX(marks_obtained) AS highest_score
FROM submits
WHERE marks_obtained IS NOT NULL;
```

---

## 5. Subqueries (Nested & Correlated)

### 5.1 Nested Non-Correlated Subquery
Finds students whose CGPA is higher than the university average CGPA:
```sql
SELECT 
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    pa.cgpa
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id
WHERE pa.cgpa > (
    SELECT AVG(cgpa) FROM progress_analytics
)
ORDER BY pa.cgpa DESC;
```

### 5.2 Correlated Subquery
Finds students who spent more study time than the average study time of their cohort:
```sql
SELECT 
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    pa.time_spent AS minutes_logged
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id
WHERE pa.time_spent >= (
    SELECT AVG(pa2.time_spent) 
    FROM progress_analytics pa2
)
ORDER BY pa.time_spent DESC;
```

---

## 6. Relational Division Simulation

Finds students who are enrolled in **all** courses offered by the Computer Science Department (`dept_id = 1`):
```sql
SELECT 
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name
FROM student s
WHERE NOT EXISTS (
    SELECT c.course_id 
    FROM course c 
    WHERE c.dept_id = 1
    AND NOT EXISTS (
        SELECT e.course_id 
        FROM enrolls e 
        WHERE e.student_id = s.student_id 
          AND e.course_id = c.course_id
    )
);
```
*Concept*: Double `NOT EXISTS` expresses Universal Quantification ($\forall c \in \text{CS}: \text{Enrolled}(s, c)$) in First-Order Relational Calculus.

---

## 7. Database Views

The application defines 4 academic views:

### 7.1 Student Performance View
Combines student demographics, CGPA, study hours, and evaluated submissions:
```sql
SELECT * FROM student_performance_view ORDER BY cgpa DESC;
```

### 7.2 Course Feedback Summary View
Aggregates student ratings and review counts per course:
```sql
SELECT * FROM course_feedback_summary;
```

### 7.3 Course Enrollment Summary View
Provides real-time student counts per course:
```sql
SELECT * FROM course_enrollment_summary;
```

### 7.4 Student Course View
Combines student records with their enrolled courses and department names:
```sql
SELECT * FROM student_course_view WHERE student_id = 101;
```

---

## 8. Stored Procedures

In MySQL native mode, these are stored procedures defined with `CREATE PROCEDURE`. In SQLite playground mode, the backend simulates their exact execution signatures:

### 8.1 Student Details Procedure
```sql
CALL GET_STUDENT_DETAILS(101);
```
*Returns*: Full student demographic info, registered proctor name, and username.

### 8.2 Course Students Procedure
```sql
CALL GET_COURSE_STUDENTS(301);
```
*Returns*: All students enrolled in Course #301.

### 8.3 Student Courses Procedure
```sql
CALL GET_STUDENT_COURSES(101);
```
*Returns*: All courses taken by Student #101.

### 8.4 Grade Assignment Procedure
```sql
CALL GRADE_ASSIGNMENT(101, 301, 1, 95, 'Outstanding relational queries.');
```
*Action*: Updates submission marks, feedback, and status in `submits`.

---

## 9. Stored Functions

### 9.1 Course Student Count Function
```sql
SELECT GET_COURSE_STUDENT_COUNT(301) AS enrolled_count;
```
*Returns*: Total number of students registered in course 301.

### 9.2 Course Average Rating Function
```sql
SELECT GET_COURSE_AVERAGE_RATING(301) AS average_rating;
```
*Returns*: Average feedback rating on a 5.0 scale for course 301.

### 9.3 Student Average Score Function
```sql
SELECT GET_STUDENT_AVERAGE_SCORE(101) AS average_score;
```
*Returns*: Average assignment marks achieved by student 101.

---

## 10. Database Triggers & Audit Logging

### 10.1 Student Age Constraint Trigger (`check_student_age`)
Enforces that every student must be $\ge 16$ years old before an INSERT is allowed:
```sql
-- DEMONSTRATE TRIGGER INTERCEPTION (Will fail with constraint error):
INSERT INTO student (student_id, first_name, last_name, dob, email, proctor_id) 
VALUES (999, 'Underage', 'Test', '2020-01-01', 'underage@test.com', 1);
```
*Result*: `Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.`

### 10.2 Assignment Marks Range Trigger (`check_submission_marks`)
Ensures evaluated marks cannot exceed assignment maximum marks or be negative:
```sql
-- DEMONSTRATE OVER-MARK INTERCEPTION (Will fail):
UPDATE submits 
SET marks_obtained = 999 
WHERE student_id = 101 AND course_id = 301 AND assignment_id = 1;
```
*Result*: `Constraint Violation (Trigger trg_submission_marks_check): Marks obtained cannot exceed assignment maximum marks or be negative.`

### 10.3 Automated Audit Log Trigger (`audit_student_insert`)
Captures all student record creations automatically into `audit_log`:
```sql
SELECT * FROM audit_log ORDER BY log_id DESC LIMIT 5;
```

---

## 11. ACID Transactions & Rollback

The LMS backend provides full transaction safety via `dbTransaction(callback)`:
- If any operation fails, the transaction issues `ROLLBACK` to maintain database consistency.
- If all queries succeed, the transaction issues `COMMIT`.

Demonstrated in `server/src/testIntegration.js` [TEST 19 & 20]:
```sql
-- Transaction Simulation in SQLite / MySQL:
BEGIN TRANSACTION;
INSERT INTO enrolls (student_id, course_id) VALUES (101, 303);
-- If course is full or student already enrolled:
ROLLBACK;
-- If valid:
COMMIT;
```

---

## 12. Window Functions & Dynamic Ranking

Dynamically computes real-time department standing without static fields:
```sql
SELECT 
    s.student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    pa.cgpa,
    RANK() OVER (ORDER BY pa.cgpa DESC) AS leaderboard_rank,
    DENSE_RANK() OVER (ORDER BY pa.cgpa DESC) AS dense_rank
FROM student s
JOIN progress_analytics pa ON s.student_id = pa.student_id;
```

---

## 13. Query Optimization & Execution Plan

Analyzes execution engine plan and verifies index usage:
```sql
EXPLAIN QUERY PLAN 
SELECT s.student_id, s.first_name, e.course_id 
FROM student s 
JOIN enrolls e ON s.student_id = e.student_id 
WHERE s.student_id = 101;
```
*Output explains*:
- Search using primary key or index on `student(student_id)`
- Search using composite index on `enrolls(student_id, course_id)`
- Confirms absence of full table scans (O(1) / O(log n) index lookups).

---

## 🏁 How to Run Automated Verification

To run all 20 database & backend integration tests:
```bash
node server/src/testIntegration.js
```

To run student portal end-to-end capabilities verification:
```bash
node server/src/testStudentPortal.js
```
