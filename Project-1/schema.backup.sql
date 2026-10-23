-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: lms
-- ------------------------------------------------------
-- Server version	8.0.46

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

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
CREATE TABLE `department` (
  `dept_id` int NOT NULL,
  `dept_name` varchar(100) NOT NULL,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `dept_name` (`dept_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `department` WRITE;
INSERT INTO `department` VALUES (4,'CIVIL'),(1,'CSE'),(2,'ECE'),(5,'IT'),(3,'MECH');
UNLOCK TABLES;

--
-- Table structure for table `proctor`
--

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
INSERT INTO `proctor` VALUES (1,'Anu','M','Nair','C101'),(2,'Ravi','K','Menon','C102'),(3,'Sara','L','Jose','C103'),(4,'John','P','Varghese','C104'),(5,'Meera','T','Das','C105');
UNLOCK TABLES;

--
-- Table structure for table `proctor_phone`
--

DROP TABLE IF EXISTS `proctor_phone`;
CREATE TABLE `proctor_phone` (
  `proctor_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`proctor_id`,`phone_no`),
  CONSTRAINT `proctor_phone_ibfk_1` FOREIGN KEY (`proctor_id`) REFERENCES `proctor` (`proctor_id`),
  CONSTRAINT `proctor_phone_chk_1` CHECK (regexp_like(`phone_no`,_cp850'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `proctor_phone` WRITE;
INSERT INTO `proctor_phone` VALUES (1,'9876543210'),(2,'9876543211'),(3,'9876543212'),(4,'9876543213'),(5,'9876543214');
UNLOCK TABLES;

--
-- Table structure for table `student`
--

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
  UNIQUE KEY `email` (`email`),
  KEY `proctor_id` (`proctor_id`),
  CONSTRAINT `student_ibfk_1` FOREIGN KEY (`proctor_id`) REFERENCES `proctor` (`proctor_id`),
  CONSTRAINT `chk_student_email` CHECK ((`email` like _cp850'%@%.%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `student` WRITE;
INSERT INTO `student` VALUES (101,'Akhil','K','Nair','2000-05-10','akhil@gmail.com',1),(102,'Neha','R','Das','2001-03-12','neha@gmail.com',2),(103,'Rahul','M','Varma','1999-07-22','rahul@gmail.com',3),(104,'Sneha','P','Menon','2002-01-15','sneha@gmail.com',4),(105,'Arjun','S','Pillai','2000-09-30','arjun@gmail.com',5);
UNLOCK TABLES;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
CREATE TABLE `account` (
  `student_id` int NOT NULL,
  `account_id` int NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`student_id`,`account_id`),
  UNIQUE KEY `username` (`username`),
  CONSTRAINT `fk_account_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `account` WRITE;
INSERT INTO `account` VALUES (101,1,'akhil_user','pass1'),(102,1,'neha_user','pass2'),(103,1,'rahul_user','pass3'),(104,1,'sneha_user','pass4'),(105,1,'arjun_user','pass5');
UNLOCK TABLES;

--
-- Table structure for table `student_phone`
--

DROP TABLE IF EXISTS `student_phone`;
CREATE TABLE `student_phone` (
  `student_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`student_id`,`phone_no`),
  CONSTRAINT `fk_student_phone` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `student_phone_chk_1` CHECK (regexp_like(`phone_no`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `student_phone` WRITE;
INSERT INTO `student_phone` VALUES (101,'9123456780'),(102,'9123456781'),(103,'9123456782'),(104,'9123456783'),(105,'9123456784');
UNLOCK TABLES;

--
-- Table structure for table `instructor`
--

DROP TABLE IF EXISTS `instructor`;
CREATE TABLE `instructor` (
  `instructor_id` int NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `cabin_no` varchar(20) DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  PRIMARY KEY (`instructor_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `cabin_no` (`cabin_no`),
  KEY `dept_id` (`dept_id`),
  CONSTRAINT `instructor_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`),
  CONSTRAINT `chk_instructor_email` CHECK ((`email` like _utf8mb4'%@%.%'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `instructor` WRITE;
INSERT INTO `instructor` VALUES (201,'Raj','K','Menon','raj@gmail.com','I101',1),(202,'Anita','S','Nair','anita@gmail.com','I102',2),(203,'Thomas','P','Jose','thomas@gmail.com','I103',3),(204,'Divya','R','Das','divya@gmail.com','I104',4),(205,'Vivek','M','Kumar','vivek@gmail.com','I105',5);
UNLOCK TABLES;

--
-- Table structure for table `instructor_phone`
--

DROP TABLE IF EXISTS `instructor_phone`;
CREATE TABLE `instructor_phone` (
  `instructor_id` int NOT NULL,
  `phone_no` char(10) NOT NULL,
  PRIMARY KEY (`instructor_id`,`phone_no`),
  CONSTRAINT `instructor_phone_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`),
  CONSTRAINT `instructor_phone_chk_1` CHECK (regexp_like(`phone_no`,_cp850'^[0-9]{10}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `instructor_phone` WRITE;
INSERT INTO `instructor_phone` VALUES (201,'9000000001'),(202,'9000000002'),(203,'9000000003'),(204,'9000000004'),(205,'9000000005');
UNLOCK TABLES;

--
-- Table structure for table `course`
--

DROP TABLE IF EXISTS `course`;
CREATE TABLE `course` (
  `course_id` int NOT NULL,
  `course_name` varchar(100) NOT NULL,
  `dept_id` int DEFAULT NULL,
  PRIMARY KEY (`course_id`),
  KEY `dept_id` (`dept_id`),
  CONSTRAINT `course_ibfk_1` FOREIGN KEY (`dept_id`) REFERENCES `department` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `course` WRITE;
INSERT INTO `course` VALUES (301,'DBMS',1),(302,'Networks',2),(303,'Thermodynamics',3),(304,'Structures',4),(305,'Data Science',5);
UNLOCK TABLES;

--
-- Table structure for table `module`
--

DROP TABLE IF EXISTS `module`;
CREATE TABLE `module` (
  `course_id` int NOT NULL,
  `module_no` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `lecture_hours` int DEFAULT NULL,
  PRIMARY KEY (`course_id`,`module_no`),
  CONSTRAINT `module_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`),
  CONSTRAINT `module_chk_1` CHECK ((`lecture_hours` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `module` WRITE;
INSERT INTO `module` VALUES (301,1,'ER Model',10),(302,1,'OSI Model',8),(303,1,'Laws of Thermo',9),(304,1,'Load Analysis',7),(305,1,'Python Basics',12);
UNLOCK TABLES;

--
-- Table structure for table `assignment`
--

DROP TABLE IF EXISTS `assignment`;
CREATE TABLE `assignment` (
  `course_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `marks` int DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  PRIMARY KEY (`course_id`,`assignment_id`),
  CONSTRAINT `assignment_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`),
  CONSTRAINT `assignment_chk_1` CHECK ((`marks` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `assignment` WRITE;
INSERT INTO `assignment` VALUES (301,1,'SQL Assignment',100,'2026-10-01'),(302,1,'Routing Assignment',80,'2026-10-02'),(303,1,'Heat Assignment',70,'2026-10-03'),(304,1,'Bridge Assignment',60,'2026-10-04'),(305,1,'ML Assignment',90,'2026-10-05');
UNLOCK TABLES;

--
-- Table structure for table `quiz`
--

DROP TABLE IF EXISTS `quiz`;
CREATE TABLE `quiz` (
  `course_id` int NOT NULL,
  `quiz_id` int NOT NULL,
  `title` varchar(100) DEFAULT NULL,
  `total_marks` int DEFAULT NULL,
  PRIMARY KEY (`course_id`,`quiz_id`),
  CONSTRAINT `quiz_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`),
  CONSTRAINT `quiz_chk_1` CHECK ((`total_marks` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `quiz` WRITE;
INSERT INTO `quiz` VALUES (301,1,'DBMS Quiz',50),(302,1,'Networks Quiz',40),(303,1,'Thermo Quiz',45),(304,1,'Structures Quiz',35),(305,1,'DS Quiz',60);
UNLOCK TABLES;

--
-- Table structure for table `enrolls`
--

DROP TABLE IF EXISTS `enrolls`;
CREATE TABLE `enrolls` (
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  PRIMARY KEY (`student_id`,`course_id`),
  KEY `course_id` (`course_id`),
  CONSTRAINT `enrolls_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`course_id`),
  CONSTRAINT `fk_enroll_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `enrolls` WRITE;
INSERT INTO `enrolls` VALUES (101,301),(102,302),(103,303),(104,304),(105,305);
UNLOCK TABLES;

--
-- Table structure for table `submits`
--

DROP TABLE IF EXISTS `submits`;
CREATE TABLE `submits` (
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  `assignment_id` int NOT NULL,
  `submission_date` date NOT NULL,
  PRIMARY KEY (`student_id`,`course_id`,`assignment_id`),
  KEY `course_id` (`course_id`,`assignment_id`),
  CONSTRAINT `fk_submits_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `submits_ibfk_2` FOREIGN KEY (`course_id`, `assignment_id`) REFERENCES `assignment` (`course_id`, `assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `submits` WRITE;
INSERT INTO `submits` VALUES (101,301,1,'2026-09-01'),(102,302,1,'2026-09-02'),(103,303,1,'2026-09-03'),(104,304,1,'2026-09-04'),(105,305,1,'2026-09-05');
UNLOCK TABLES;

--
-- Table structure for table `progress_analytics`
--

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
  CONSTRAINT `progress_analytics_chk_1` CHECK ((`cgpa` between 0 and 10)),
  CONSTRAINT `progress_analytics_chk_2` CHECK ((`time_spent` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `progress_analytics` WRITE;
INSERT INTO `progress_analytics` VALUES (101,1,8.50,'Good',120,1),(102,1,7.80,'Average',100,2),(103,1,9.00,'Excellent',140,1),(104,1,6.50,'Needs Improvement',80,4),(105,1,8.00,'Good',110,3);
UNLOCK TABLES;

--
-- Table structure for table `course_feedback`
--

DROP TABLE IF EXISTS `course_feedback`;
CREATE TABLE `course_feedback` (
  `student_id` int NOT NULL,
  `feedback_no` int NOT NULL,
  `instructor_id` int DEFAULT NULL,
  PRIMARY KEY (`student_id`,`feedback_no`),
  KEY `instructor_id` (`instructor_id`),
  CONSTRAINT `course_feedback_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`),
  CONSTRAINT `fk_feedback_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `course_feedback` WRITE;
INSERT INTO `course_feedback` VALUES (101,1,201),(102,1,202),(103,1,203),(104,1,204),(105,1,205);
UNLOCK TABLES;
