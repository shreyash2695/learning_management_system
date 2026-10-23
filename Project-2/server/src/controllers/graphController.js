import { runCypher, verifyNeo4jConnection } from '../config/neo4j.js';

/**
 * 1. Health check & Graph metadata
 */
export async function getGraphHealth(req, res) {
  try {
    const health = await verifyNeo4jConnection();
    res.json({ success: true, health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 2. Get Full Knowledge Graph (Courses, Topics, Students, Instructors, Departments, Skills)
 */
export async function getCurriculumGraph(req, res) {
  try {
    // 1. Fetch all nodes with rich attributes
    const nodesQuery = `
      MATCH (n)
      WHERE n:Course OR n:Topic OR n:Student OR n:Instructor OR n:Department OR n:Skill
      RETURN 
        elementId(n) AS element_id,
        labels(n)[0] AS label,
        n.course_id AS course_id,
        n.student_id AS student_id,
        n.instructor_id AS instructor_id,
        n.dept_id AS dept_id,
        n.name AS name,
        n.email AS email,
        n.dept AS dept,
        n.cabin_no AS cabin_no,
        n.credits AS credits,
        n.category AS category,
        n.domain AS domain
    `;
    const rawNodes = await runCypher(nodesQuery);

    const nodes = rawNodes.map(r => {
      let id;
      if (r.label === 'Course') id = `course-${r.course_id}`;
      else if (r.label === 'Topic') id = `topic-${r.name}`;
      else if (r.label === 'Student') id = `student-${r.student_id}`;
      else if (r.label === 'Instructor') id = `instructor-${r.instructor_id}`;
      else if (r.label === 'Department') id = `dept-${r.dept_id}`;
      else if (r.label === 'Skill') id = `skill-${r.name}`;
      else id = r.element_id;

      return {
        id,
        element_id: r.element_id,
        label: r.name || (r.course_id ? `Course ${r.course_id}` : id),
        type: r.label,
        course_id: r.course_id,
        student_id: r.student_id,
        instructor_id: r.instructor_id,
        dept_id: r.dept_id,
        dept: r.dept,
        email: r.email,
        cabin_no: r.cabin_no,
        credits: r.credits,
        category: r.category,
        domain: r.domain
      };
    });

    // 2. Fetch all graph edges
    const linksQuery = `
      MATCH (source)-[r]->(target)
      WHERE (source:Course OR source:Topic OR source:Student OR source:Instructor OR source:Department OR source:Skill)
        AND (target:Course OR target:Topic OR target:Student OR target:Instructor OR target:Department OR target:Skill)
      RETURN 
        labels(source)[0] AS source_label,
        source.course_id AS source_course_id,
        source.student_id AS source_student_id,
        source.instructor_id AS source_instructor_id,
        source.dept_id AS source_dept_id,
        source.name AS source_name,
        type(r) AS rel_type,
        r.strictness AS strictness,
        labels(target)[0] AS target_label,
        target.course_id AS target_course_id,
        target.student_id AS target_student_id,
        target.instructor_id AS target_instructor_id,
        target.dept_id AS target_dept_id,
        target.name AS target_name
    `;
    const rawLinks = await runCypher(linksQuery);

    const links = rawLinks.map(r => {
      const getFormattedId = (label, courseId, stuId, instId, deptId, name) => {
        if (label === 'Course') return `course-${courseId}`;
        if (label === 'Topic') return `topic-${name}`;
        if (label === 'Student') return `student-${stuId}`;
        if (label === 'Instructor') return `instructor-${instId}`;
        if (label === 'Department') return `dept-${deptId}`;
        if (label === 'Skill') return `skill-${name}`;
        return name;
      };

      return {
        source: getFormattedId(r.source_label, r.source_course_id, r.source_student_id, r.source_instructor_id, r.source_dept_id, r.source_name),
        target: getFormattedId(r.target_label, r.target_course_id, r.target_student_id, r.target_instructor_id, r.target_dept_id, r.target_name),
        type: r.rel_type,
        strictness: r.strictness || 'STANDARD'
      };
    });

    // Compute node counts per label for the UI pills
    const labelCounts = {};
    for (const n of nodes) {
      labelCounts[n.type] = (labelCounts[n.type] || 0) + 1;
    }

    res.json({
      success: true,
      stats: { 
        totalNodes: nodes.length, 
        totalLinks: links.length,
        labelCounts
      },
      graph: { nodes, links }
    });
  } catch (err) {
    console.error('getCurriculumGraph error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 3. Interactive Cypher Query Runner (Neo4j Console Studio)
 */
export async function executeCypherQuery(req, res) {
  const startTime = Date.now();
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Cypher query string is required' });
    }

    const trimmed = query.trim();
    // Safety check: block destructive statements in standard playground
    const forbidden = [/\bDROP\b/i, /\bDELETE\b/i, /\bDETACH\s+DELETE\b/i, /\bREMOVE\b/i, /\bCREATE\s+DATABASE\b/i];
    for (const pat of forbidden) {
      if (pat.test(trimmed)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Destructive Cypher commands (DROP, DELETE, REMOVE) are prohibited in the visual sandbox.' 
        });
      }
    }

    const records = await runCypher(trimmed);
    const executionTimeMs = Date.now() - startTime;

    // Extract graph nodes and edges if returned in the Cypher query result
    const nodesMap = new Map();
    const elementToCanonicalId = new Map();
    const rawRelationships = [];

    const getCanonicalId = (val) => {
      if (!val || typeof val !== 'object') return null;
      const label = (val.labels && val.labels[0]) || val.type || 'Node';
      const props = val.properties || {};
      if (label === 'Course' && props.course_id) return `course-${props.course_id}`;
      if (label === 'Student' && props.student_id) return `student-${props.student_id}`;
      if (label === 'Instructor' && props.instructor_id) return `instructor-${props.instructor_id}`;
      if (label === 'Department' && props.dept_id) return `dept-${props.dept_id}`;
      if (label === 'Topic' && props.name) return `topic-${props.name}`;
      if (label === 'Skill' && props.name) return `skill-${props.name}`;
      if (props.name) return `${label.toLowerCase()}-${props.name}`;
      return val.id ? String(val.id) : (val.elementId || null);
    };

    const processEntity = (val) => {
      if (!val || typeof val !== 'object') return;

      // Neo4j Path
      if (val.__isPath && Array.isArray(val.segments)) {
        val.segments.forEach(seg => {
          processEntity(seg.start);
          processEntity(seg.relationship);
          processEntity(seg.end);
        });
        return;
      }

      // Neo4j Node
      if (val.labels && Array.isArray(val.labels)) {
        const label = val.labels[0] || 'Node';
        const props = val.properties || {};
        const id = getCanonicalId(val);

        if (id) {
          if (val.elementId) elementToCanonicalId.set(String(val.elementId), id);
          if (val.id !== undefined) elementToCanonicalId.set(String(val.id), id);

          if (!nodesMap.has(id)) {
            nodesMap.set(id, {
              id,
              element_id: val.elementId,
              label: props.name || (props.course_id ? `Course ${props.course_id}` : id),
              type: label,
              ...props
            });
          }
        }
        return;
      }

      // Neo4j Relationship
      if (val.type && (val.start !== undefined || val.end !== undefined)) {
        rawRelationships.push(val);
        return;
      }

      // Arrays (like collect(...) or path node arrays)
      if (Array.isArray(val)) {
        val.forEach(processEntity);
      }
    };

    records.forEach(row => {
      // 1. Process all values in row
      const entries = Object.entries(row);
      entries.forEach(([key, val]) => processEntity(val));

      // 2. Also check if row has pair of nodes connected by relationship in same row
      const nodesInRow = [];
      const relsInRow = [];
      entries.forEach(([key, val]) => {
        if (val && val.labels && Array.isArray(val.labels)) nodesInRow.push(val);
        if (val && val.type && (val.start !== undefined || val.end !== undefined)) relsInRow.push(val);
      });

      // If a row has 2 nodes and 1 relationship (e.g. RETURN s, r, c):
      if (nodesInRow.length === 2 && relsInRow.length >= 1) {
        const idA = getCanonicalId(nodesInRow[0]);
        const idB = getCanonicalId(nodesInRow[1]);
        const rel = relsInRow[0];
        if (idA && idB && rel) {
          rawRelationships.push({
            type: rel.type,
            sourceCanonical: idA,
            targetCanonical: idB,
            properties: rel.properties
          });
        }
      }
    });

    // Resolve relationships to canonical node IDs
    const linksList = [];
    const seenLinks = new Set();

    rawRelationships.forEach(rel => {
      let source = rel.sourceCanonical;
      let target = rel.targetCanonical;

      if (!source && rel.start) source = elementToCanonicalId.get(String(rel.start));
      if (!target && rel.end) target = elementToCanonicalId.get(String(rel.end));

      if (source && target && nodesMap.has(source) && nodesMap.has(target)) {
        const linkKey = `${source}->${rel.type}->${target}`;
        if (!seenLinks.has(linkKey)) {
          seenLinks.add(linkKey);
          linksList.push({
            source,
            target,
            type: rel.type,
            strictness: rel.properties?.strictness || 'STANDARD'
          });
        }
      }
    });

    const nodesList = Array.from(nodesMap.values());
    const labelCounts = {};
    nodesList.forEach(n => {
      labelCounts[n.type] = (labelCounts[n.type] || 0) + 1;
    });

    res.json({
      success: true,
      query: trimmed,
      recordCount: records.length,
      executionTimeMs,
      records,
      extractedGraph: {
        nodes: nodesList,
        links: linksList,
        labelCounts
      }
    });
  } catch (err) {
    console.error('executeCypherQuery error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      executionTimeMs: Date.now() - startTime
    });
  }
}

/**
 * 4. Multi-hop Prerequisite Tree Traversal for a Course
 */
export async function getCoursePrerequisites(req, res) {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ success: false, error: 'Valid courseId is required' });
    }

    const directQuery = `
      MATCH (c:Course {course_id: $courseId})-[r:REQUIRES]->(req:Course)
      RETURN req.course_id AS course_id, req.name AS name, req.dept AS dept, r.strictness AS strictness
    `;
    const direct = await runCypher(directQuery, { courseId });

    const transitiveQuery = `
      MATCH path = (c:Course {course_id: $courseId})-[:REQUIRES*1..5]->(prereq:Course)
      WITH prereq, length(path) AS depth
      RETURN DISTINCT 
        prereq.course_id AS course_id, 
        prereq.name AS name, 
        prereq.dept AS dept,
        min(depth) AS depth
      ORDER BY depth ASC
    `;
    const allPrerequisites = await runCypher(transitiveQuery, { courseId });

    res.json({
      success: true,
      courseId,
      hasPrerequisites: allPrerequisites.length > 0,
      directPrerequisites: direct,
      allPrerequisites
    });
  } catch (err) {
    console.error('getCoursePrerequisites error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 5. Shortest Learning Pathway Discovery
 */
export async function getLearningPath(req, res) {
  try {
    const fromId = parseInt(req.query.from, 10);
    const toId = parseInt(req.query.to, 10);

    if (isNaN(fromId) || isNaN(toId)) {
      return res.status(400).json({ success: false, error: 'Query parameters "from" and "to" course IDs are required' });
    }

    const query = `
      MATCH (start:Course {course_id: $fromId})
      MATCH (target:Course {course_id: $toId})
      MATCH p = shortestPath((target)-[:REQUIRES*..10]->(start))
      RETURN [n in nodes(p) | { course_id: n.course_id, name: n.name, dept: n.dept }] AS path
    `;
    const results = await runCypher(query, { fromId, toId });

    if (results.length === 0) {
      return res.json({
        success: true,
        pathFound: false,
        message: `No prerequisite dependency path leads from Course ${fromId} to Course ${toId}`,
        path: []
      });
    }

    const learningSequence = results[0].path.reverse();

    res.json({
      success: true,
      pathFound: true,
      totalSteps: learningSequence.length,
      path: learningSequence
    });
  } catch (err) {
    console.error('getLearningPath error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 6. Check Student Enrollment Prerequisite Eligibility
 */
export async function checkStudentEligibility(req, res) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const courseId = parseInt(req.params.courseId, 10);

    if (isNaN(studentId) || isNaN(courseId)) {
      return res.status(400).json({ success: false, error: 'Valid studentId and courseId are required' });
    }

    const prereqQuery = `
      MATCH (target:Course {course_id: $courseId})-[:REQUIRES]->(req:Course)
      RETURN req.course_id AS course_id, req.name AS name
    `;
    const requiredCourses = await runCypher(prereqQuery, { courseId });

    if (requiredCourses.length === 0) {
      return res.json({
        success: true,
        studentId,
        courseId,
        eligible: true,
        message: 'No prerequisite courses required for this course.',
        required: [],
        completed: [],
        missing: []
      });
    }

    const completedQuery = `
      MATCH (s:Student {student_id: $studentId})-[:COMPLETED]->(c:Course)
      WHERE c.course_id IN $requiredIds
      RETURN c.course_id AS course_id, c.name AS name
    `;
    const requiredIds = requiredCourses.map(c => c.course_id);
    const completedCourses = await runCypher(completedQuery, { studentId, requiredIds });

    const completedIds = new Set(completedCourses.map(c => c.course_id));
    const missingCourses = requiredCourses.filter(c => !completedIds.has(c.course_id));

    const eligible = missingCourses.length === 0;

    res.json({
      success: true,
      studentId,
      courseId,
      eligible,
      message: eligible 
        ? 'Prerequisites satisfied! Student is eligible to enroll.' 
        : `Missing ${missingCourses.length} prerequisite course(s).`,
      required: requiredCourses,
      completed: completedCourses,
      missing: missingCourses
    });
  } catch (err) {
    console.error('checkStudentEligibility error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 7. Personalized Student Progress Status Map
 */
export async function getStudentProgressMap(req, res) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'Valid studentId is required' });
    }

    // 1. All completed courses
    const compQuery = `
      MATCH (s:Student {student_id: $studentId})-[:COMPLETED]->(c:Course)
      RETURN c.course_id AS id
    `;
    const compRows = await runCypher(compQuery, { studentId });
    const completedIds = new Set(compRows.map(r => r.id));

    // 2. All currently enrolled courses
    const enrQuery = `
      MATCH (s:Student {student_id: $studentId})-[:ENROLLED_IN]->(c:Course)
      RETURN c.course_id AS id
    `;
    const enrRows = await runCypher(enrQuery, { studentId });
    const enrolledIds = new Set(enrRows.map(r => r.id));

    // 3. All courses with prerequisites satisfied vs missing
    const allCoursesQuery = `
      MATCH (c:Course)
      OPTIONAL MATCH (c)-[:REQUIRES]->(req:Course)
      RETURN c.course_id AS course_id, collect(req.course_id) AS required_ids
    `;
    const allCourses = await runCypher(allCoursesQuery);

    const statusMap = {};
    for (const c of allCourses) {
      const cid = c.course_id;
      if (completedIds.has(cid)) {
        statusMap[cid] = 'COMPLETED';
      } else if (enrolledIds.has(cid)) {
        statusMap[cid] = 'ENROLLED';
      } else {
        const reqs = c.required_ids.filter(x => x !== null);
        const hasUnmet = reqs.some(reqId => !completedIds.has(reqId));
        statusMap[cid] = hasUnmet ? 'LOCKED' : 'ELIGIBLE';
      }
    }

    res.json({
      success: true,
      studentId,
      statusMap
    });
  } catch (err) {
    console.error('getStudentProgressMap error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 8. Curriculum Integrity & Prerequisite Cycle Detection
 */
export async function detectPrerequisiteCycles(req, res) {
  try {
    const cycleQuery = `
      MATCH path = (c:Course)-[:REQUIRES*1..10]->(c)
      RETURN DISTINCT 
        c.course_id AS course_id, 
        c.name AS name,
        [n in nodes(path) | n.name] AS cycle_path
    `;
    const cycles = await runCypher(cycleQuery);

    res.json({
      success: true,
      hasCycles: cycles.length > 0,
      status: cycles.length === 0 ? 'VALID_DAG' : 'CYCLE_DETECTED',
      message: cycles.length === 0 
        ? 'Curriculum graph is a strictly valid Directed Acyclic Graph (DAG) with zero circular deadlocks.'
        : `Detected ${cycles.length} circular prerequisite deadlock(s)!`,
      cycles
    });
  } catch (err) {
    console.error('detectPrerequisiteCycles error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * 9. Peer Course Recommendations (Collaborative Filtering via Graph)
 */
export async function getPeerRecommendations(req, res) {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ success: false, error: 'Valid studentId is required' });
    }

    const recQuery = `
      MATCH (s:Student {student_id: $studentId})-[:COMPLETED]->(common:Course)<-[:COMPLETED]-(peer:Student)
      WHERE peer.student_id <> s.student_id
      MATCH (peer)-[:COMPLETED]->(rec:Course)
      WHERE NOT (s)-[:COMPLETED]->(rec) AND NOT (s)-[:ENROLLED_IN]->(rec)
      RETURN 
        rec.course_id AS course_id, 
        rec.name AS name, 
        rec.dept AS dept,
        count(DISTINCT peer) AS peer_endorsements,
        collect(DISTINCT peer.name)[0..3] AS endorsed_by
      ORDER BY peer_endorsements DESC
      LIMIT 3
    `;
    const recommendations = await runCypher(recQuery, { studentId });

    res.json({
      success: true,
      studentId,
      totalRecommendations: recommendations.length,
      recommendations
    });
  } catch (err) {
    console.error('getPeerRecommendations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
