-- ====================================================================
-- LMS PORTAL — OFFICIAL UNIVERSITY ACADEMIC & LEARNING MANAGEMENT SYSTEM
-- Comprehensive Enterprise & Academic Database Architecture
-- Target RDBMS: MySQL 8.0+ / SQLite Dual Compatible
-- ====================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- -----------------------------------------------------
-- 1. DEPARTMENT Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `department`;
CREATE TABLE `department` (
  `dept_id` int NOT NULL,
  `dept_name` varchar(100) NOT NULL,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `uq_dept_name` (`dept_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `department` WRITE;
INSERT INTO `department` VALUES 
  (4,'CIVIL'),
  (1,'CSE'),
  (2,'ECE'),
  (5,'IT'),
  (3,'MECH');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 2. PROCTOR Table (Mentorship)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `proctor`;
CREATE TABLE `proctor` (
  `proctor_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `cabin_no` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`proctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `proctor` WRITE;
INSERT INTO `proctor` VALUES 
  (1,'Anu','M','Nair','C101'),
  (2,'Ravi','K','Menon','C102'),
  (3,'Sara','L','Jose','C103'),
  (4,'John','P','Varghese','C104'),
  (5,'Meera','T','Das','C105');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 3. PROCTOR_PHONE Table (Composite Key, 1NF Multi-value)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `proctor_phone`;
CREATE TABLE `proctor_phone` (
  `proctor_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`proctor_id`,`phone_no`),
  CONSTRAINT `fk_proctor_phone_proctor` FOREIGN KEY (`proctor_id`) REFERENCES `proctor` (`proctor_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_proctor_phone` CHECK (regexp_like(`phone_no`,'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `proctor_phone` WRITE;
INSERT INTO `proctor_phone` VALUES 
  (1,'9876543210'),
  (2,'9876543211'),
  (3,'9876543212'),
  (4,'9876543213'),
  (5,'9876543214');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 4. STUDENT Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `student`;
CREATE TABLE `student` (
  `student_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `dob` date DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `proctor_id` int DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `uq_student_email` (`email`),
  KEY `idx_student_proctor` (`proctor_id`),
  CONSTRAINT `fk_student_proctor` FOREIGN KEY (`proctor_id`) REFERENCES `proctor` (`proctor_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_student_email` CHECK ((`email` like '%@%.%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `student` WRITE;
INSERT INTO `student` VALUES 
  (101,'Akhil','K','Nair','2000-05-10','akhil@gmail.com',1),
  (102,'Neha','R','Das','2001-03-12','neha@gmail.com',2),
  (103,'Rahul','M','Varma','1999-07-22','rahul@gmail.com',3),
  (104,'Sneha','P','Menon','2002-01-15','sneha@gmail.com',4),
  (105,'Arjun','S','Pillai','2000-09-30','arjun@gmail.com',5),
  (106,'Vikram','R','Sharma','2001-04-10','vikram@gmail.com',1),
  (107,'Ananya','V','Iyer','2002-08-14','ananya@gmail.com',2),
  (108,'Rohan','S','Gupta','2000-11-20','rohan@gmail.com',3),
  (109,'Pooja','B','Rao','2001-06-05','pooja@gmail.com',4),
  (110,'Siddharth','N','Patel','1999-12-18','sid@gmail.com',5),
  (111,'Kavya','M','Reddy','2002-02-28','kavya@gmail.com',1),
  (112,'Aditya','C','Joshi','2001-10-10','aditya@gmail.com',2);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 5. ACCOUNT Table (User Authentication)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `account`;
CREATE TABLE `account` (
  `student_id` int NOT NULL,
  `account_id` int NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`student_id`,`account_id`),
  UNIQUE KEY `uq_username` (`username`),
  CONSTRAINT `fk_account_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `account` WRITE;
INSERT INTO `account` VALUES 
  (101,1,'akhil_user','pass1'),
  (102,1,'neha_user','pass2'),
  (103,1,'rahul_user','pass3'),
  (104,1,'sneha_user','pass4'),
  (105,1,'arjun_user','pass5'),
  (106,1,'vikram_user','pass6'),
  (107,1,'ananya_user','pass7'),
  (108,1,'rohan_user','pass8'),
  (109,1,'pooja_user','pass9'),
  (110,1,'sid_user','pass10'),
  (111,1,'kavya_user','pass11'),
  (112,1,'aditya_user','pass12');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 6. STUDENT_PHONE Table (Composite Key)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `student_phone`;
CREATE TABLE `student_phone` (
  `student_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`student_id`,`phone_no`),
  CONSTRAINT `fk_student_phone_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_student_phone` CHECK (regexp_like(`phone_no`,'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `student_phone` WRITE;
INSERT INTO `student_phone` VALUES 
  (101,'9123456780'),
  (102,'9123456781'),
  (103,'9123456782'),
  (104,'9123456783'),
  (105,'9123456784'),
  (106,'9123456785'),
  (107,'9123456786'),
  (108,'9123456787'),
  (109,'9123456788'),
  (110,'9123456789'),
  (111,'9123456790'),
  (112,'9123456791');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 7. INSTRUCTOR Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `instructor`;
CREATE TABLE `instructor` (
  `instructor_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `cabin_no` varchar(20) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `password` varchar(255) DEFAULT 'prof123',
  PRIMARY KEY (`instructor_id`),
  UNIQUE KEY `uq_instructor_email` (`email`),
  UNIQUE KEY `uq_instructor_cabin` (`cabin_no`),
  KEY `idx_instructor_dept` (`dept_id`),
  CONSTRAINT `fk_instructor_dept` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_instructor_email` CHECK ((`email` like '%@%.%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `instructor` WRITE;
INSERT INTO `instructor` VALUES 
  (201,'Raj','K','Menon','raj@gmail.com','I101',1),
  (202,'Anita','S','Nair','anita@gmail.com','I102',2),
  (203,'Thomas','P','Jose','thomas@gmail.com','I103',3),
  (204,'Divya','R','Das','divya@gmail.com','I104',4),
  (205,'Vivek','M','Kumar','vivek@gmail.com','I105',5);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 8. INSTRUCTOR_PHONE Table (Composite Key)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `instructor_phone`;
CREATE TABLE `instructor_phone` (
  `instructor_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`instructor_id`,`phone_no`),
  CONSTRAINT `fk_instructor_phone_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_instructor_phone` CHECK (regexp_like(`phone_no`,'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `instructor_phone` WRITE;
INSERT INTO `instructor_phone` VALUES 
  (201,'9000000001'),
  (202,'9000000002'),
  (203,'9000000003'),
  (204,'9000000004'),
  (205,'9000000005');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 9. COURSE Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `course`;
CREATE TABLE `course` (
  `course_id` int NOT NULL,
  `course_name` varchar(100) NOT NULL,
  `dept_id` int DEFAULT NULL,
  PRIMARY KEY (`course_id`),
  KEY `idx_course_dept` (`dept_id`),
  CONSTRAINT `fk_course_dept` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `course` WRITE;
INSERT INTO `course` VALUES 
  (301,'DBMS',1),
  (302,'Networks',2),
  (303,'Thermodynamics',3),
  (304,'Structures',4),
  (305,'Data Science',5),
  (306,'Operating Systems',1),
  (307,'Digital Electronics',2),
  (308,'Machine Learning',5);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 10. TEACHES Table (PHASE 2: Many-to-Many Relationship)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `teaches`;
CREATE TABLE `teaches` (
  `instructor_id` int NOT NULL,
  `course_id` int NOT NULL,
  PRIMARY KEY (`instructor_id`,`course_id`),
  KEY `idx_teaches_course` (`course_id`),
  CONSTRAINT `fk_teaches_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_teaches_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `teaches` WRITE;
INSERT INTO `teaches` VALUES 
  (201,301),
  (205,301),
  (202,302),
  (203,303),
  (204,304),
  (201,305),
  (205,305),
  (201,306),
  (202,307),
  (205,308);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 11. MODULE Table (Weak Entity on Course)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `module`;
CREATE TABLE `module` (
  `course_id` int NOT NULL,
  `module_no` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `lecture_hours` int DEFAULT NULL,
  PRIMARY KEY (`course_id`,`module_no`),
  CONSTRAINT `fk_module_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_module_hours` CHECK ((`lecture_hours` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `module` WRITE;
INSERT INTO `module` VALUES 
  (301,1,'ER Model & Relational Algebra',10),
  (301,2,'SQL, Normalization & BCNF',12),
  (302,1,'OSI Reference Model',8),
  (302,2,'TCP/IP and Routing Protocols',10),
  (303,1,'Laws of Thermodynamics',9),
  (304,1,'Structural Load & Stress Analysis',7),
  (305,1,'Python for Data Science',12),
  (306,1,'Processes, Threads & Scheduling',10),
  (307,1,'Boolean Logic & Gate Design',8),
  (308,1,'Supervised & Unsupervised Learning',14);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 12. ASSIGNMENT Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `assignment`;
CREATE TABLE `assignment` (
  `course_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `marks` int DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  PRIMARY KEY (`course_id`,`assignment_id`),
  CONSTRAINT `fk_assignment_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_assignment_marks` CHECK ((`marks` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `assignment` WRITE;
INSERT INTO `assignment` VALUES 
  (301,1,'SQL & Normalization Assignment',100,'2026-10-01'),
  (301,2,'Stored Procedures & Triggers',50,'2026-10-15'),
  (302,1,'Routing Protocols & Wireshark Lab',80,'2026-10-02'),
  (303,1,'Heat Transfer Problem Set',70,'2026-10-03'),
  (304,1,'Truss Bridge Structural Analysis',60,'2026-10-04'),
  (305,1,'Exploratory Data Analysis Project',90,'2026-10-05'),
  (306,1,'Process Synchronization in C',75,'2026-10-12'),
  (307,1,'Karnaugh Maps & Combinational Circuits',50,'2026-10-18'),
  (308,1,'Linear Regression & Classification',100,'2026-10-25');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 13. QUIZ Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `quiz`;
CREATE TABLE `quiz` (
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `title` varchar(100) DEFAULT NULL,
  `total_marks` int DEFAULT NULL,
  PRIMARY KEY (`course_id`,`quiz_id`),
  CONSTRAINT `fk_quiz_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_quiz_marks` CHECK ((`total_marks` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz` WRITE;
INSERT INTO `quiz` VALUES 
  (301,1,'DBMS Fundamentals & SQL Quiz',30),
  (302,1,'Computer Networks Protocol Quiz',30),
  (303,1,'Thermodynamics Assessment',30),
  (304,1,'Structural Mechanics Quiz',30),
  (305,1,'Data Science Foundations Quiz',30),
  (306,1,'Operating Systems Concurrency Quiz',30);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 14. QUIZ_QUESTION Table (PHASE 5: Relational Quiz System)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `quiz_question`;
CREATE TABLE `quiz_question` (
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_text` text NOT NULL,
  `marks` int NOT NULL DEFAULT 10,
  PRIMARY KEY (`course_id`,`quiz_id`,`question_id`),
  CONSTRAINT `fk_qq_quiz` FOREIGN KEY (`course_id`,`quiz_id`) REFERENCES `quiz` (`course_id`,`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_qq_marks` CHECK (`marks` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz_question` WRITE;
INSERT INTO `quiz_question` VALUES 
  (301,1,1,'What is the primary purpose of database normalization?',10),
  (301,1,2,'Which normal form eliminates partial dependencies on a composite primary key?',10),
  (301,1,3,'Which SQL clause is executed after GROUP BY to filter aggregate results?',10),
  (302,1,1,'Which layer in the OSI model is responsible for end-to-end packet delivery?',10),
  (302,1,2,'What protocol is connection-oriented and provides reliable stream delivery?',10),
  (302,1,3,'Which port is standard for HTTPS communication?',10),
  (305,1,1,'Which Python library is standard for tabular data manipulation?',10),
  (305,1,2,'What metric measures the spread of numerical values from the mean?',10),
  (305,1,3,'Which algorithm is commonly used for classification tasks?',10),
  (303,1,1,'What does the First Law of Thermodynamics state?',10),
  (303,1,2,'Which thermodynamic process occurs at strictly constant volume?',10),
  (303,1,3,'Which cycle represents the theoretical upper limit of heat engine efficiency?',10),
  (304,1,1,'What is the ratio of lateral strain to longitudinal strain known as?',10),
  (304,1,2,'In a simply supported beam with central point load, where is the maximum bending moment?',10),
  (304,1,3,'Which law defines stress as directly proportional to strain within the elastic limit?',10),
  (306,1,1,'Which condition is NOT one of Coffman four conditions required for deadlock?',10),
  (306,1,2,'Which scheduling algorithm assigns fixed time slices in cyclic order?',10),
  (306,1,3,'Which memory management scheme eliminates external fragmentation via fixed-size blocks?',10);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 15. QUIZ_OPTION Table (PHASE 5: Relational Quiz System)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `quiz_option`;
CREATE TABLE `quiz_option` (
  `option_id` int NOT NULL,
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `question_id` int NOT NULL,
  `option_text` text NOT NULL,
  `is_correct` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`course_id`,`quiz_id`,`question_id`,`option_id`),
  CONSTRAINT `fk_qo_question` FOREIGN KEY (`course_id`,`quiz_id`,`question_id`) REFERENCES `quiz_question` (`course_id`,`quiz_id`,`question_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_qo_correct` CHECK (`is_correct` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz_option` WRITE;
INSERT INTO `quiz_option` VALUES 
  (1,301,1,1,'Eliminate data redundancy and prevent modification anomalies',1),
  (2,301,1,1,'Maximize storage disk space across distributed servers',0),
  (3,301,1,1,'Avoid ever needing SQL JOIN operations',0),
  (4,301,1,1,'Ensure all columns have alphanumeric values',0),
  (1,301,1,2,'First Normal Form (1NF)',0),
  (2,301,1,2,'Second Normal Form (2NF)',1),
  (3,301,1,2,'Third Normal Form (3NF)',0),
  (4,301,1,2,'Boyce-Codd Normal Form (BCNF)',0),
  (1,301,1,3,'WHERE',0),
  (2,301,1,3,'ORDER BY',0),
  (3,301,1,3,'HAVING',1),
  (4,301,1,3,'LIMIT',0),
  (1,302,1,1,'Network Layer',1),
  (2,302,1,1,'Data Link Layer',0),
  (3,302,1,1,'Session Layer',0),
  (4,302,1,1,'Presentation Layer',0),
  (1,302,1,2,'UDP',0),
  (2,302,1,2,'TCP',1),
  (3,302,1,2,'ICMP',0),
  (4,302,1,2,'ARP',0),
  (1,302,1,3,'80',0),
  (2,302,1,3,'443',1),
  (3,302,1,3,'22',0),
  (4,302,1,3,'8080',0),
  (1,303,1,1,'Conservation of Energy principle',1),
  (2,303,1,1,'Entropy always increases',0),
  (3,303,1,1,'Absolute zero is unattainable',0),
  (4,303,1,1,'Ideal gas pressure-volume constancy',0),
  (1,303,1,2,'Isochoric process',1),
  (2,303,1,2,'Isobaric process',0),
  (3,303,1,2,'Isothermal process',0),
  (4,303,1,2,'Adiabatic process',0),
  (1,303,1,3,'Carnot cycle',1),
  (2,303,1,3,'Rankine cycle',0),
  (3,303,1,3,'Diesel cycle',0),
  (4,303,1,3,'Otto cycle',0),
  (1,304,1,1,'Poissons ratio',1),
  (2,304,1,1,'Youngs modulus',0),
  (3,304,1,1,'Shear modulus',0),
  (4,304,1,1,'Bulk modulus',0),
  (1,304,1,2,'At the midpoint of the beam span',1),
  (2,304,1,2,'At the left support',0),
  (3,304,1,2,'At the right support',0),
  (4,304,1,2,'Uniformly along the beam length',0),
  (1,304,1,3,'Hookes Law',1),
  (2,304,1,3,'Newtons Law',0),
  (3,304,1,3,'Bernoullis Law',0),
  (4,304,1,3,'Pascals Law',0),
  (1,305,1,1,'Pandas',1),
  (2,305,1,1,'Flask',0),
  (3,305,1,1,'Pygame',0),
  (4,305,1,1,'BeautifulSoup',0),
  (1,305,1,2,'Standard Deviation',1),
  (2,305,1,2,'Mode',0),
  (3,305,1,2,'Median',0),
  (4,305,1,2,'Correlation Coefficient',0),
  (1,305,1,3,'Logistic Regression',1),
  (2,305,1,3,'K-Means Clustering',0),
  (3,305,1,3,'Principal Component Analysis (PCA)',0),
  (4,305,1,3,'Apriori Algorithm',0),
  (1,306,1,1,'Preemption Allowed',1),
  (2,306,1,1,'Mutual Exclusion',0),
  (3,306,1,1,'Hold and Wait',0),
  (4,306,1,1,'Circular Wait',0),
  (1,306,1,2,'Round Robin (RR)',1),
  (2,306,1,2,'Shortest Job First',0),
  (3,306,1,2,'First Come First Served',0),
  (4,306,1,2,'Priority Scheduling',0),
  (1,306,1,3,'Paging',1),
  (2,306,1,3,'Swapping',0),
  (3,306,1,3,'Contiguous Allocation',0),
  (4,306,1,3,'Dynamic Relocation',0);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 16. QUIZ_ATTEMPT Table (PHASE 5: Verified Scoring)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `quiz_attempt`;
CREATE TABLE `quiz_attempt` (
  `attempt_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `score` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`attempt_id`),
  KEY `idx_qa_student` (`student_id`),
  KEY `idx_qa_quiz` (`course_id`,`quiz_id`),
  CONSTRAINT `fk_qa_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_qa_quiz` FOREIGN KEY (`course_id`,`quiz_id`) REFERENCES `quiz` (`course_id`,`quiz_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_qa_score` CHECK (`score` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz_attempt` WRITE;
INSERT INTO `quiz_attempt` VALUES 
  (1,101,301,1,'2026-09-10 10:00:00','2026-09-10 10:22:00',30),
  (2,102,301,1,'2026-09-10 11:00:00','2026-09-10 11:25:00',20),
  (3,105,301,1,'2026-09-10 14:00:00','2026-09-10 14:18:00',30),
  (4,101,302,1,'2026-09-11 09:30:00','2026-09-11 09:50:00',30);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 17. QUIZ_ANSWER Table (PHASE 5: Stored Selected Choices)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `quiz_answer`;
CREATE TABLE `quiz_answer` (
  `attempt_id` int NOT NULL,
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `question_id` int NOT NULL,
  `selected_option_id` int NOT NULL,
  PRIMARY KEY (`attempt_id`,`question_id`),
  CONSTRAINT `fk_ans_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempt` (`attempt_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ans_option` FOREIGN KEY (`course_id`,`quiz_id`,`question_id`,`selected_option_id`) REFERENCES `quiz_option` (`course_id`,`quiz_id`,`question_id`,`option_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz_answer` WRITE;
INSERT INTO `quiz_answer` VALUES 
  (1,301,1,1,1),
  (1,301,1,2,2),
  (1,301,1,3,3),
  (2,301,1,1,1),
  (2,301,1,2,1),
  (2,301,1,3,3),
  (3,301,1,1,1),
  (3,301,1,2,2),
  (3,301,1,3,3),
  (4,302,1,1,1),
  (4,302,1,2,2),
  (4,302,1,3,2);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 18. ENROLLS Table (Student Course Registration)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `enrolls`;
CREATE TABLE `enrolls` (
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  PRIMARY KEY (`student_id`,`course_id`),
  KEY `idx_enrolls_course` (`course_id`),
  CONSTRAINT `fk_enrolls_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enrolls_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `enrolls` WRITE;
INSERT INTO `enrolls` VALUES 
  (101,301),(102,301),(103,301),(105,301),(106,301),(111,301),(112,301),
  (101,302),(102,302),(104,302),(107,302),(111,302),
  (103,303),(108,303),
  (104,304),(108,304),(109,304),
  (101,305),(105,305),(109,305),(110,305),(112,305),
  (101,306),(103,306),(106,306),
  (102,307),(104,307),(107,307),
  (105,308),(110,308);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 19. SUBMITS Table (PHASE 4: Coursework Submissions & Grading)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `submits`;
CREATE TABLE `submits` (
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `submission_date` date NOT NULL,
  `submission_content` text,
  `marks_obtained` int DEFAULT NULL,
  `instructor_feedback` text,
  `status` varchar(20) NOT NULL DEFAULT 'SUBMITTED',
  PRIMARY KEY (`student_id`,`course_id`,`assignment_id`),
  KEY `idx_submits_assignment` (`course_id`,`assignment_id`),
  CONSTRAINT `fk_submits_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submits_assignment` FOREIGN KEY (`course_id`, `assignment_id`) REFERENCES `assignment` (`course_id`, `assignment_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_submits_marks` CHECK ((`marks_obtained` is null) or (`marks_obtained` >= 0)),
  CONSTRAINT `chk_submits_status` CHECK (`status` IN ('SUBMITTED', 'GRADED', 'LATE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `submits` WRITE;
INSERT INTO `submits` VALUES 
  (101,301,1,'2026-09-01','Implemented 3NF relational schema and verified candidate keys using functional dependency algorithm.',95,'Excellent relational modeling and query clarity.','GRADED'),
  (102,302,1,'2026-09-02','Packet capture analysis of TCP three-way handshake with wireshark trace logs.',75,'Solid analysis, add more details on congestion window.','GRADED'),
  (103,303,1,'2026-09-03','Carnot cycle efficiency derivations and entropy calculations for closed systems.',65,'Good derivations, minor error in equation 4.','GRADED'),
  (104,304,1,'2026-09-04','Truss load calculation matrices with structural strain finite elements.',55,'Review cantilever boundary conditions.','GRADED'),
  (105,305,1,'2026-09-05','Exploratory data analysis on census demographics using pandas and seaborn visualizations.',88,'Comprehensive visualizations and clear executive summary.','GRADED'),
  (106,301,1,'2026-09-06','SQL query optimization report using EXPLAIN and composite indexes.',92,'Great use of indexing for performance.','GRADED'),
  (107,302,1,'2026-09-07','Configured OSPF multi-area routing topology on Cisco Packet Tracer.',78,'Correct area assignments.','GRADED'),
  (101,301,2,'2026-09-10','Implemented stored procedures for student enrollment and trigger audit logging.',NULL,NULL,'SUBMITTED'),
  (102,301,1,'2026-09-11','Comprehensive database normalization write-up.',88,'Well structured.','GRADED'),
  (105,308,1,'2026-09-12','Trained Random Forest and Gradient Boosting models on credit risk dataset.',94,'Superb model metrics and validation curve.','GRADED'),
  (103,306,1,'2026-09-13','Producer-Consumer synchronization with POSIX semaphores and mutexes.',70,'Working implementation, clean code.','GRADED'),
  (104,307,1,'2026-09-14','Designed 4-bit synchronous binary counter using JK flip-flops.',48,'Good circuit schematic.','GRADED'),
  (108,303,1,'2026-09-14','Gas turbine Brayton cycle pressure ratios and thermal efficiency curves.',68,'Accurate numerical calculations.','GRADED'),
  (110,308,1,'2026-09-14','Hyperparameter tuning for Support Vector Classifier using GridSearchCV.',92,'Solid methodology and parameter search grid.','GRADED'),
  (111,301,1,'2026-09-15','Relational database schema diagrams and Boyce-Codd normal form decomposition.',NULL,NULL,'LATE'),
  (112,305,1,'2026-09-14','Customer churn prediction pipeline using logistic regression.',NULL,NULL,'SUBMITTED');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 20. PROGRESS_ANALYTICS Table
-- -----------------------------------------------------
DROP TABLE IF EXISTS `progress_analytics`;
CREATE TABLE `progress_analytics` (
  `student_id` int NOT NULL,
  `progress_id` int NOT NULL,
  `cgpa` decimal(3,2) DEFAULT NULL,
  `daily_tracker` varchar(100) DEFAULT NULL,
  `time_spent` int DEFAULT NULL,
  `leaderboard_position` int DEFAULT NULL,
  PRIMARY KEY (`student_id`,`progress_id`),
  CONSTRAINT `fk_progress_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_progress_cgpa` CHECK ((`cgpa` between 0 and 10)),
  CONSTRAINT `chk_progress_time` CHECK ((`time_spent` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `progress_analytics` WRITE;
INSERT INTO `progress_analytics` VALUES 
  (101,1,8.50,'Excellent',240,1),
  (102,1,7.80,'Good',180,2),
  (103,1,9.10,'Outstanding',280,1),
  (104,1,6.90,'Average',120,4),
  (105,1,8.20,'Good',210,3),
  (106,1,8.70,'Excellent',220,2),
  (107,1,7.95,'Good',175,3),
  (108,1,8.10,'Good',190,3),
  (109,1,7.20,'Average',130,4),
  (110,1,8.40,'Good',205,2),
  (111,1,8.90,'Excellent',250,1),
  (112,1,7.60,'Good',160,3);
UNLOCK TABLES;

-- -----------------------------------------------------
-- 21. COURSE_FEEDBACK Table (PHASE 3: Upgraded Feedback System)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `course_feedback`;
CREATE TABLE `course_feedback` (
  `student_id` int NOT NULL,
  `feedback_no` int NOT NULL,
  `course_id` int NOT NULL,
  `instructor_id` int DEFAULT NULL,
  `rating` int NOT NULL,
  `comments` text,
  `feedback_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`,`feedback_no`),
  KEY `idx_feedback_course` (`course_id`),
  KEY `idx_feedback_instructor` (`instructor_id`),
  CONSTRAINT `fk_feedback_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedback_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_feedback_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_feedback_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `course_feedback` WRITE;
INSERT INTO `course_feedback` VALUES 
  (101,1,301,201,5,'Prof. Raj explains relational calculus and SQL query optimization with tremendous clarity.','2026-09-08 14:20:00'),
  (102,1,302,202,4,'Very engaging computer networking lectures and hands-on lab experiments.','2026-09-08 15:10:00'),
  (103,1,303,203,4,'Rigorous thermodynamics problem sets and helpful office hour assistance.','2026-09-09 10:00:00'),
  (104,1,304,204,3,'Good structural engineering theory, more practical design software demos would help.','2026-09-09 11:30:00'),
  (105,1,305,205,5,'Data science practical assignments with Python and machine learning algorithms are top notch!','2026-09-09 16:45:00'),
  (106,1,301,201,5,'The stored procedure and trigger demonstrations were extremely insightful.','2026-09-10 12:15:00'),
  (101,2,305,205,5,'Excellent machine learning overview and intuitive explanations of gradient descent.','2026-09-11 17:00:00'),
  (102,2,301,205,4,'Great co-instructor coverage for DBMS query optimization.','2026-09-12 09:30:00'),
  (107,1,302,202,5,'Wireshark lab sessions made network packet structure very easy to grasp.','2026-09-12 11:00:00'),
  (108,1,303,203,4,'Clear derivations on steam tables and entropy equations.','2026-09-12 14:20:00'),
  (109,1,304,204,4,'Truss bridge load simulations were very practical.','2026-09-13 10:30:00'),
  (110,1,305,205,5,'Loved the statistical learning and feature engineering modules.','2026-09-13 15:15:00'),
  (111,1,301,201,5,'Best computer science course this semester, fantastic indexing explanations.','2026-09-13 16:40:00'),
  (112,1,305,205,4,'Practical data science exercises with real-world datasets.','2026-09-14 09:10:00'),
  (103,2,306,201,5,'Concurrency mechanisms and thread synchronization were explained brilliantly.','2026-09-14 11:45:00'),
  (105,2,308,205,5,'Supervised learning and ensemble models taught with rigorous mathematics.','2026-09-14 13:00:00');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 22. STUDY_SESSION Table (PHASE 10: Normalized Study Logger)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `study_session`;
CREATE TABLE `study_session` (
  `session_id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `study_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `time_spent` int NOT NULL,
  `topic` varchar(100) DEFAULT 'Course Revision',
  PRIMARY KEY (`session_id`),
  KEY `idx_study_student` (`student_id`),
  CONSTRAINT `fk_study_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_study_time` CHECK (`time_spent` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `study_session` WRITE;
INSERT INTO `study_session` VALUES 
  (1,101,'2026-09-01 10:00:00',60,'Relational Algebra & Normalization'),
  (2,101,'2026-09-03 14:30:00',90,'SQL Subqueries & Views'),
  (3,101,'2026-09-06 18:00:00',90,'Database Indexing & Transactions'),
  (4,102,'2026-09-02 11:00:00',60,'TCP/IP Model Revision'),
  (5,102,'2026-09-05 16:00:00',120,'Wireshark Protocol Capture'),
  (6,103,'2026-09-03 09:00:00',140,'Entropy and Thermodynamics Laws'),
  (7,103,'2026-09-07 15:00:00',140,'Steam Tables & Carnot Engine'),
  (8,104,'2026-09-04 10:30:00',60,'Beam Stress Analysis'),
  (9,104,'2026-09-08 11:00:00',60,'Structural Deflection Calculations'),
  (10,105,'2026-09-05 13:00:00',110,'Pandas DataFrames & Plotting'),
  (11,105,'2026-09-09 17:00:00',100,'Scikit-Learn Classification Models'),
  (12,106,'2026-09-10 14:00:00',110,'Query Execution Plan & B-Tree Indexes'),
  (13,107,'2026-09-11 10:00:00',85,'OSPF & BGP Dynamic Routing Protocols'),
  (14,108,'2026-09-12 11:30:00',95,'Heat Exchanger Sizing & Enthalpy'),
  (15,109,'2026-09-12 16:00:00',65,'Matrix Stiffness Structural Method'),
  (16,110,'2026-09-13 14:00:00',105,'Ensemble Learning & Feature Selection'),
  (17,111,'2026-09-14 09:30:00',125,'Stored Procedures & Relational Division');
UNLOCK TABLES;

-- -----------------------------------------------------
-- 23. AUDIT_LOG Table (PHASE 8: Enterprise Database Audit Logging)
-- -----------------------------------------------------
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `audit_id` int NOT NULL AUTO_INCREMENT,
  `table_name` varchar(50) NOT NULL,
  `operation` varchar(10) NOT NULL,
  `record_id` varchar(50) NOT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `description` text,
  PRIMARY KEY (`audit_id`),
  CONSTRAINT `chk_audit_op` CHECK (`operation` IN ('INSERT', 'UPDATE', 'DELETE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `audit_log` WRITE;
INSERT INTO `audit_log` VALUES 
  (1,'system','INSERT','INIT-001','2026-09-01 00:00:00','LMS Academic Database Schema and Seed Initialization Complete');
UNLOCK TABLES;

-- =====================================================
-- PHASE 9: DATABASE VIEWS
-- =====================================================

-- VIEW 1: STUDENT_COURSE_VIEW
DROP VIEW IF EXISTS `student_course_view`;
CREATE VIEW `student_course_view` AS
SELECT s.student_id, s.first_name, s.last_name, s.email,
       c.course_id, c.course_name, d.dept_name,
       i.instructor_id, i.first_name AS instructor_first, i.last_name AS instructor_last
FROM student s
JOIN enrolls e ON s.student_id = e.student_id
JOIN course c ON e.course_id = c.course_id
LEFT JOIN department d ON c.dept_id = d.dept_id
LEFT JOIN teaches t ON c.course_id = t.course_id
LEFT JOIN instructor i ON t.instructor_id = i.instructor_id;

-- VIEW 2: COURSE_ENROLLMENT_SUMMARY
DROP VIEW IF EXISTS `course_enrollment_summary`;
CREATE VIEW `course_enrollment_summary` AS
SELECT c.course_id, c.course_name, d.dept_name,
       COUNT(e.student_id) AS enrolled_students
FROM course c
LEFT JOIN department d ON c.dept_id = d.dept_id
LEFT JOIN enrolls e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name, d.dept_name;

-- VIEW 3: STUDENT_PERFORMANCE_VIEW
DROP VIEW IF EXISTS `student_performance_view`;
CREATE VIEW `student_performance_view` AS
SELECT s.student_id, s.first_name, s.last_name, s.email,
       COUNT(DISTINCT e.course_id) AS total_courses,
       COUNT(DISTINCT sub.assignment_id) AS assignments_submitted,
       ROUND(AVG(sub.marks_obtained), 2) AS avg_assignment_marks,
       ROUND(AVG(qa.score), 2) AS avg_quiz_score,
       COALESCE(SUM(ss.time_spent), 0) AS total_study_minutes
FROM student s
LEFT JOIN enrolls e ON s.student_id = e.student_id
LEFT JOIN submits sub ON s.student_id = sub.student_id
LEFT JOIN quiz_attempt qa ON s.student_id = qa.student_id
LEFT JOIN study_session ss ON s.student_id = ss.student_id
GROUP BY s.student_id, s.first_name, s.last_name, s.email;

-- VIEW 4: COURSE_FEEDBACK_SUMMARY
DROP VIEW IF EXISTS `course_feedback_summary`;
CREATE VIEW `course_feedback_summary` AS
SELECT c.course_id, c.course_name,
       COUNT(cf.feedback_no) AS total_feedback_count,
       ROUND(AVG(cf.rating), 2) AS average_rating
FROM course c
LEFT JOIN course_feedback cf ON c.course_id = cf.course_id
GROUP BY c.course_id, c.course_name;

-- =====================================================
-- PHASE 8: DATABASE TRIGGERS (MySQL DDL)
-- =====================================================

DELIMITER //

-- TRIGGER 1: Student Age Validation (Age >= 16)
DROP TRIGGER IF EXISTS `trg_student_age_insert` //
CREATE TRIGGER `trg_student_age_insert`
BEFORE INSERT ON `student`
FOR EACH ROW
BEGIN
  IF NEW.dob IS NOT NULL AND TIMESTAMPDIFF(YEAR, NEW.dob, CURDATE()) < 16 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.';
  END IF;
END //

DROP TRIGGER IF EXISTS `trg_student_age_update` //
CREATE TRIGGER `trg_student_age_update`
BEFORE UPDATE ON `student`
FOR EACH ROW
BEGIN
  IF NEW.dob IS NOT NULL AND TIMESTAMPDIFF(YEAR, NEW.dob, CURDATE()) < 16 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Constraint Violation (Trigger check_student_age): Student must be at least 16 years old.';
  END IF;
END //

-- TRIGGER 2: Assignment Submission Marks Validation
DROP TRIGGER IF EXISTS `trg_submission_marks_check` //
CREATE TRIGGER `trg_submission_marks_check`
BEFORE INSERT ON `submits`
FOR EACH ROW
BEGIN
  DECLARE max_marks INT;
  IF NEW.marks_obtained IS NOT NULL THEN
    SELECT marks INTO max_marks 
    FROM assignment 
    WHERE course_id = NEW.course_id AND assignment_id = NEW.assignment_id;
    
    IF NEW.marks_obtained < 0 OR NEW.marks_obtained > max_marks THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Constraint Violation (Trigger trg_submission_marks_check): Marks obtained cannot exceed assignment maximum marks or be negative.';
    END IF;
  END IF;
END //

DROP TRIGGER IF EXISTS `trg_submission_marks_check_update` //
CREATE TRIGGER `trg_submission_marks_check_update`
BEFORE UPDATE ON `submits`
FOR EACH ROW
BEGIN
  DECLARE max_marks INT;
  IF NEW.marks_obtained IS NOT NULL THEN
    SELECT marks INTO max_marks 
    FROM assignment 
    WHERE course_id = NEW.course_id AND assignment_id = NEW.assignment_id;
    
    IF NEW.marks_obtained < 0 OR NEW.marks_obtained > max_marks THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Constraint Violation (Trigger trg_submission_marks_check): Marks obtained cannot exceed assignment maximum marks or be negative.';
    END IF;
  END IF;
END //

-- TRIGGER 3: Audit Logging for STUDENT Table Mutations
DROP TRIGGER IF EXISTS `trg_student_audit_insert` //
CREATE TRIGGER `trg_student_audit_insert`
AFTER INSERT ON `student`
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
  VALUES ('student', 'INSERT', CAST(NEW.student_id AS CHAR), NOW(), CONCAT('New student registered: ', NEW.first_name, ' ', NEW.last_name, ' (', NEW.email, ')'));
END //

DROP TRIGGER IF EXISTS `trg_student_audit_update` //
CREATE TRIGGER `trg_student_audit_update`
AFTER UPDATE ON `student`
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
  VALUES ('student', 'UPDATE', CAST(NEW.student_id AS CHAR), NOW(), CONCAT('Student record updated: ', NEW.first_name, ' ', NEW.last_name));
END //

DROP TRIGGER IF EXISTS `trg_student_audit_delete` //
CREATE TRIGGER `trg_student_audit_delete`
AFTER DELETE ON `student`
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, record_id, changed_at, description)
  VALUES ('student', 'DELETE', CAST(OLD.student_id AS CHAR), NOW(), CONCAT('Student record removed: ', OLD.first_name, ' ', OLD.last_name));
END //

-- =====================================================
-- PHASE 6: STORED PROCEDURES
-- =====================================================

-- PROCEDURE 1: GET_STUDENT_DETAILS
DROP PROCEDURE IF EXISTS `GET_STUDENT_DETAILS` //
CREATE PROCEDURE `GET_STUDENT_DETAILS`(IN p_student_id INT)
BEGIN
  SELECT s.*, 
         p.first_name AS proctor_first, p.last_name AS proctor_last, p.cabin_no AS proctor_cabin,
         pa.cgpa, pa.daily_tracker, pa.time_spent
  FROM student s
  LEFT JOIN proctor p ON s.proctor_id = p.proctor_id
  LEFT JOIN progress_analytics pa ON s.student_id = pa.student_id
  WHERE s.student_id = p_student_id;
END //

-- PROCEDURE 2: ENROLL_STUDENT (With Transaction & Validation)
DROP PROCEDURE IF EXISTS `ENROLL_STUDENT` //
CREATE PROCEDURE `ENROLL_STUDENT`(IN p_student_id INT, IN p_course_id INT)
BEGIN
  DECLARE v_student_exists INT DEFAULT 0;
  DECLARE v_course_exists INT DEFAULT 0;
  DECLARE v_already_enrolled INT DEFAULT 0;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_student_exists FROM student WHERE student_id = p_student_id;
  IF v_student_exists = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student does not exist.';
  END IF;

  SELECT COUNT(*) INTO v_course_exists FROM course WHERE course_id = p_course_id;
  IF v_course_exists = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not exist.';
  END IF;

  SELECT COUNT(*) INTO v_already_enrolled FROM enrolls WHERE student_id = p_student_id AND course_id = p_course_id;
  IF v_already_enrolled > 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is already enrolled in this course.';
  END IF;

  INSERT INTO enrolls (student_id, course_id) VALUES (p_student_id, p_course_id);
  COMMIT;

  SELECT 'SUCCESS' AS status, CONCAT('Student ', p_student_id, ' enrolled in course ', p_course_id) AS message;
END //

-- PROCEDURE 3: GET_COURSE_STUDENTS
DROP PROCEDURE IF EXISTS `GET_COURSE_STUDENTS` //
CREATE PROCEDURE `GET_COURSE_STUDENTS`(IN p_course_id INT)
BEGIN
  SELECT s.student_id, s.first_name, s.last_name, s.email, e.course_id
  FROM enrolls e
  JOIN student s ON e.student_id = s.student_id
  WHERE e.course_id = p_course_id
  ORDER BY s.student_id ASC;
END //

-- PROCEDURE 4: GET_STUDENT_COURSES
DROP PROCEDURE IF EXISTS `GET_STUDENT_COURSES` //
CREATE PROCEDURE `GET_STUDENT_COURSES`(IN p_student_id INT)
BEGIN
  SELECT c.course_id, c.course_name, d.dept_name,
         i.first_name AS instructor_first, i.last_name AS instructor_last
  FROM enrolls e
  JOIN course c ON e.course_id = c.course_id
  LEFT JOIN department d ON c.dept_id = d.dept_id
  LEFT JOIN teaches t ON c.course_id = t.course_id
  LEFT JOIN instructor i ON t.instructor_id = i.instructor_id
  WHERE e.student_id = p_student_id
  ORDER BY c.course_id ASC;
END //

-- PROCEDURE 5: GRADE_ASSIGNMENT
DROP PROCEDURE IF EXISTS `GRADE_ASSIGNMENT` //
CREATE PROCEDURE `GRADE_ASSIGNMENT`(
  IN p_student_id INT,
  IN p_course_id INT,
  IN p_assignment_id INT,
  IN p_marks INT,
  IN p_feedback TEXT
)
BEGIN
  DECLARE v_max_marks INT;
  
  SELECT marks INTO v_max_marks 
  FROM assignment 
  WHERE course_id = p_course_id AND assignment_id = p_assignment_id;

  IF p_marks < 0 OR p_marks > v_max_marks THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks must be non-negative and not exceed maximum assignment marks.';
  END IF;

  UPDATE submits 
  SET marks_obtained = p_marks, 
      instructor_feedback = p_feedback, 
      status = 'GRADED'
  WHERE student_id = p_student_id AND course_id = p_course_id AND assignment_id = p_assignment_id;

  SELECT 'SUCCESS' AS status, p_marks AS marks_awarded, 'GRADED' AS new_status;
END //

-- =====================================================
-- PHASE 7: STORED FUNCTIONS
-- =====================================================

-- FUNCTION 1: GET_ENROLLMENT_COUNT
DROP FUNCTION IF EXISTS `GET_ENROLLMENT_COUNT` //
CREATE FUNCTION `GET_ENROLLMENT_COUNT`(p_student_id INT) 
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;
  SELECT COUNT(*) INTO v_count FROM enrolls WHERE student_id = p_student_id;
  RETURN v_count;
END //

-- FUNCTION 2: GET_COURSE_STUDENT_COUNT
DROP FUNCTION IF EXISTS `GET_COURSE_STUDENT_COUNT` //
CREATE FUNCTION `GET_COURSE_STUDENT_COUNT`(p_course_id INT) 
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_count INT DEFAULT 0;
  SELECT COUNT(*) INTO v_count FROM enrolls WHERE course_id = p_course_id;
  RETURN v_count;
END //

-- FUNCTION 3: GET_STUDENT_AVERAGE_SCORE
DROP FUNCTION IF EXISTS `GET_STUDENT_AVERAGE_SCORE` //
CREATE FUNCTION `GET_STUDENT_AVERAGE_SCORE`(p_student_id INT) 
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_avg DECIMAL(5,2) DEFAULT 0.00;
  SELECT IFNULL(ROUND(AVG(score), 2), 0.00) INTO v_avg 
  FROM quiz_attempt 
  WHERE student_id = p_student_id;
  RETURN v_avg;
END //

-- FUNCTION 4: GET_COURSE_AVERAGE_RATING
DROP FUNCTION IF EXISTS `GET_COURSE_AVERAGE_RATING` //
CREATE FUNCTION `GET_COURSE_AVERAGE_RATING`(p_course_id INT) 
RETURNS DECIMAL(3,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_avg DECIMAL(3,2) DEFAULT 0.00;
  SELECT IFNULL(ROUND(AVG(rating), 2), 0.00) INTO v_avg 
  FROM course_feedback 
  WHERE course_id = p_course_id;
  RETURN v_avg;
END //

DELIMITER ;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- ====================================================================
-- END OF SCHEMA DDL & SEED EXPORTS
-- ====================================================================
