import Database from 'better-sqlite3';
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sqlitePath = path.resolve(__dirname, '../../lms.db');

console.log('====================================================');
console.log('🚀 LMS Portal: Comprehensive Neo4j AuraDB Seeder');
console.log('====================================================');
console.log(`[Config] SQLite DB: ${sqlitePath}`);
console.log(`[Config] Neo4j URI: ${process.env.NEO4J_URI}`);

const sqlite = new Database(sqlitePath, { readonly: true });
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

async function runSeeder() {
  const session = driver.session();
  try {
    console.log('\n[1/7] Verifying Neo4j AuraDB connection...');
    await driver.getServerInfo();
    console.log('✅ Connected to Neo4j AuraDB successfully.');

    console.log('\n[2/7] Creating uniqueness constraints & indexes...');
    const constraints = [
      `CREATE CONSTRAINT unique_course_id IF NOT EXISTS FOR (c:Course) REQUIRE c.course_id IS UNIQUE`,
      `CREATE CONSTRAINT unique_student_id IF NOT EXISTS FOR (s:Student) REQUIRE s.student_id IS UNIQUE`,
      `CREATE CONSTRAINT unique_instructor_id IF NOT EXISTS FOR (i:Instructor) REQUIRE i.instructor_id IS UNIQUE`,
      `CREATE CONSTRAINT unique_dept_id IF NOT EXISTS FOR (d:Department) REQUIRE d.dept_id IS UNIQUE`,
      `CREATE CONSTRAINT unique_topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE`,
      `CREATE CONSTRAINT unique_skill_name IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.name IS UNIQUE`
    ];

    for (const c of constraints) {
      await session.run(c);
    }
    console.log('✅ Uniqueness constraints established.');

    console.log('\n[3/7] Migrating Departments...');
    const departments = sqlite.prepare(`SELECT dept_id, dept_name FROM department ORDER BY dept_id ASC`).all();
    for (const d of departments) {
      await session.run(`
        MERGE (dept:Department {dept_id: $dept_id})
        SET dept.name = $name
      `, {
        dept_id: neo4j.int(d.dept_id),
        name: d.dept_name
      });
    }
    console.log(`✅ Synced ${departments.length} departments.`);

    console.log('\n[4/7] Migrating Courses and Department linking ([:OFFERS])...');
    const courses = sqlite.prepare(`
      SELECT c.course_id, c.course_name, c.dept_id, COALESCE(d.dept_name, 'General') AS dept_name
      FROM course c
      LEFT JOIN department d ON c.dept_id = d.dept_id
      ORDER BY c.course_id ASC
    `).all();

    for (const c of courses) {
      await session.run(`
        MERGE (course:Course {course_id: $course_id})
        SET course.name = $course_name,
            course.dept = $dept_name,
            course.credits = 4
        WITH course
        MATCH (dept:Department {dept_id: $dept_id})
        MERGE (dept)-[:OFFERS]->(course)
      `, {
        course_id: neo4j.int(c.course_id),
        course_name: c.course_name,
        dept_name: c.dept_name,
        dept_id: neo4j.int(c.dept_id)
      });
    }
    console.log(`✅ Synced ${courses.length} courses with Department [:OFFERS] links.`);

    console.log('\n[5/7] Establishing Prerequisite DAG ([:REQUIRES])...');
    const prerequisites = [
      { course_id: 308, prereq_id: 305, strictness: 'MANDATORY' }, // ML -> Data Science
      { course_id: 305, prereq_id: 301, strictness: 'MANDATORY' }, // Data Science -> DBMS
      { course_id: 302, prereq_id: 306, strictness: 'MANDATORY' }, // Networks -> Operating Systems
      { course_id: 306, prereq_id: 307, strictness: 'MANDATORY' }, // Operating Systems -> Digital Electronics
      { course_id: 304, prereq_id: 301, strictness: 'RECOMMENDED' } // Web Dev -> DBMS
    ];

    for (const p of prerequisites) {
      await session.run(`
        MATCH (c:Course {course_id: $course_id})
        MATCH (req:Course {course_id: $prereq_id})
        MERGE (c)-[r:REQUIRES]->(req)
        SET r.strictness = $strictness,
            r.created_at = datetime()
      `, {
        course_id: neo4j.int(p.course_id),
        prereq_id: neo4j.int(p.prereq_id),
        strictness: p.strictness
      });
    }
    console.log(`✅ Synced ${prerequisites.length} prerequisite DAG edges.`);

    console.log('\n[6/7] Migrating Instructors & Teaching Assignments ([:TEACHES])...');
    const instructors = sqlite.prepare(`
      SELECT i.instructor_id, i.first_name, i.last_name, i.email, i.cabin_no, COALESCE(d.dept_name, 'General') AS dept_name
      FROM instructor i
      LEFT JOIN department d ON i.dept_id = d.dept_id
    `).all();

    for (const inst of instructors) {
      await session.run(`
        MERGE (i:Instructor {instructor_id: $instructor_id})
        SET i.name = $name,
            i.email = $email,
            i.cabin_no = $cabin_no,
            i.dept = $dept
      `, {
        instructor_id: neo4j.int(inst.instructor_id),
        name: `${inst.first_name} ${inst.last_name}`,
        email: inst.email,
        cabin_no: inst.cabin_no,
        dept: inst.dept_name
      });
    }

    const teaches = sqlite.prepare(`SELECT instructor_id, course_id FROM teaches`).all();
    for (const t of teaches) {
      await session.run(`
        MATCH (i:Instructor {instructor_id: $instructor_id})
        MATCH (c:Course {course_id: $course_id})
        MERGE (i)-[:TEACHES]->(c)
      `, {
        instructor_id: neo4j.int(t.instructor_id),
        course_id: neo4j.int(t.course_id)
      });
    }
    console.log(`✅ Synced ${instructors.length} instructors and ${teaches.length} teaching assignments.`);

    console.log('\n[7/7] Adding Industry Skills & Competencies ([:DEVELOPS_SKILL])...');
    const skillMappings = [
      { course_id: 301, skills: ['Relational Algebra', 'SQL Optimization', 'ACID Transactions'] },
      { course_id: 302, skills: ['TCP/IP Protocol Suite', 'Socket Programming', 'Network Security'] },
      { course_id: 303, skills: ['Asymptotic Analysis', 'Graph Algorithms', 'Dynamic Programming'] },
      { course_id: 304, skills: ['RESTful Web Services', 'React Architecture', 'State Management'] },
      { course_id: 305, skills: ['Exploratory Data Analysis', 'Statistical Inference', 'Python NumPy & Pandas'] },
      { course_id: 306, skills: ['Process Scheduling', 'Concurrency & Mutexes', 'Virtual Memory Architecture'] },
      { course_id: 307, skills: ['Boolean Logic', 'Sequential Circuits', 'CPU Arithmetic Units'] },
      { course_id: 308, skills: ['Deep Learning', 'Supervised Classification', 'Neural Architectures'] }
    ];

    for (const sm of skillMappings) {
      for (const skill of sm.skills) {
        await session.run(`
          MATCH (c:Course {course_id: $course_id})
          MERGE (sk:Skill {name: $skill})
          SET sk.domain = c.dept
          MERGE (c)-[:DEVELOPS_SKILL]->(sk)
        `, {
          course_id: neo4j.int(sm.course_id),
          skill
        });
      }
    }
    console.log('✅ Synced industry competency nodes and [:DEVELOPS_SKILL] edges.');

    console.log('\n[8/9] Migrating Students from SQLite...');
    const students = sqlite.prepare(`
      SELECT student_id, first_name, middle_name, last_name, email
      FROM student
      ORDER BY student_id ASC
    `).all();

    for (const stu of students) {
      const fullName = [stu.first_name, stu.middle_name, stu.last_name].filter(Boolean).join(' ');
      await session.run(`
        MERGE (s:Student {student_id: $student_id})
        SET s.name = $name,
            s.email = $email
      `, {
        student_id: neo4j.int(stu.student_id),
        name: fullName,
        email: stu.email
      });
    }
    console.log(`✅ Synced ${students.length} students to Neo4j AuraDB.`);

    console.log('\n[9/9] Migrating Course Enrollments ([:ENROLLED_IN])...');
    const enrollments = sqlite.prepare(`SELECT student_id, course_id FROM enrolls`).all();
    for (const enr of enrollments) {
      await session.run(`
        MATCH (s:Student {student_id: $student_id})
        MATCH (c:Course {course_id: $course_id})
        MERGE (s)-[r:ENROLLED_IN]->(c)
      `, {
        student_id: neo4j.int(enr.student_id),
        course_id: neo4j.int(enr.course_id)
      });
    }
    console.log(`✅ Synced ${enrollments.length} course enrollment relationships.`);

    // Summary query
    const statsResult = await session.run(`
      CALL { MATCH (c:Course) RETURN count(c) AS course_count }
      CALL { MATCH (t:Topic) RETURN count(t) AS topic_count }
      CALL { MATCH (s:Student) RETURN count(s) AS student_count }
      CALL { MATCH (i:Instructor) RETURN count(i) AS instructor_count }
      CALL { MATCH (d:Department) RETURN count(d) AS dept_count }
      CALL { MATCH (sk:Skill) RETURN count(sk) AS skill_count }
      CALL { MATCH ()-[r:REQUIRES]->() RETURN count(r) AS req_count }
      CALL { MATCH ()-[r:TEACHES]->() RETURN count(r) AS teaches_count }
      CALL { MATCH ()-[r:DEVELOPS_SKILL]->() RETURN count(r) AS skill_edges }
      CALL { MATCH ()-[r:ENROLLED_IN]->() RETURN count(r) AS enrolled_edges }
      RETURN course_count, topic_count, student_count, instructor_count, dept_count, skill_count, req_count, teaches_count, skill_edges, enrolled_edges
    `);

    const stats = statsResult.records[0];
    console.log('\n====================================================');
    console.log('🎉 Neo4j Seeding Completed!');
    console.log('====================================================');
    console.log(`• Course Nodes:       ${stats.get('course_count')}`);
    console.log(`• Topic Nodes:        ${stats.get('topic_count')}`);
    console.log(`• Student Nodes:      ${stats.get('student_count')}`);
    console.log(`• Instructor Nodes:   ${stats.get('instructor_count')}`);
    console.log(`• Department Nodes:   ${stats.get('dept_count')}`);
    console.log(`• Skill Nodes:        ${stats.get('skill_count')}`);
    console.log(`• [:REQUIRES] Edges:  ${stats.get('req_count')}`);
    console.log(`• [:TEACHES] Edges:   ${stats.get('teaches_count')}`);
    console.log(`• [:DEVELOPS_SKILL]:  ${stats.get('skill_edges')}`);
    console.log(`• [:ENROLLED_IN]:     ${stats.get('enrolled_edges')}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Error during Neo4j seeding:', err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    sqlite.close();
  }
}

runSeeder();
