import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let driver = null;

export function getNeo4jDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      console.warn('[Neo4j] Warning: Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD in environment.');
      return null;
    }

    try {
      driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 20,
        connectionTimeout: 15000
      });
      console.log(`[Neo4j] Driver initialized for ${uri}`);
    } catch (err) {
      console.error('[Neo4j] Failed to initialize driver:', err.message);
      return null;
    }
  }
  return driver;
}

export async function verifyNeo4jConnection() {
  try {
    const d = getNeo4jDriver();
    if (!d) return { connected: false, error: 'Driver not initialized' };
    const info = await d.getServerInfo();
    return { connected: true, server: info.agent, address: info.address };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

/**
 * Execute a Cypher query with automatic session handling
 * @param {string} query Cypher statement
 * @param {object} params Parameter map
 * @returns {Promise<Array>} Array of record objects with integer serialization
 */
export async function runCypher(query, params = {}) {
  const d = getNeo4jDriver();
  if (!d) {
    throw new Error('Neo4j driver is not available. Please verify credentials in .env.');
  }

  const session = d.session();
  try {
    const result = await session.run(query, params);
    // Transform neo4j records to standard JS objects, converting Integer types to JS numbers
    return result.records.map(record => {
      const obj = {};
      record.keys.forEach(key => {
        const val = record.get(key);
        obj[key] = serializeNeo4jValue(val);
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

function serializeNeo4jValue(val) {
  if (val === null || val === undefined) return val;
  if (neo4j.isInt(val)) return val.toNumber();
  if (Array.isArray(val)) return val.map(serializeNeo4jValue);
  if (typeof val === 'object') {
    // If it's a Neo4j Path
    if (val.segments && Array.isArray(val.segments)) {
      return {
        __isPath: true,
        length: val.length,
        start: serializeNeo4jValue(val.start),
        end: serializeNeo4jValue(val.end),
        segments: val.segments.map(seg => ({
          start: serializeNeo4jValue(seg.start),
          relationship: serializeNeo4jValue(seg.relationship),
          end: serializeNeo4jValue(seg.end)
        }))
      };
    }

    // If it's a Neo4j Node or Relationship
    if (val.properties) {
      const serializedProps = {};
      for (const [k, v] of Object.entries(val.properties)) {
        serializedProps[k] = serializeNeo4jValue(v);
      }
      return {
        id: val.identity ? serializeNeo4jValue(val.identity) : (val.elementId || undefined),
        elementId: val.elementId || undefined,
        labels: val.labels,
        type: val.type,
        start: val.startNodeElementId || (val.start ? serializeNeo4jValue(val.start) : undefined),
        end: val.endNodeElementId || (val.end ? serializeNeo4jValue(val.end) : undefined),
        properties: serializedProps
      };
    }
    // Standard object
    const plain = {};
    for (const [k, v] of Object.entries(val)) {
      plain[k] = serializeNeo4jValue(v);
    }
    return plain;
  }
  return val;
}

/**
 * Synchronize a Student node to Neo4j Cloud
 */
export async function syncStudentToNeo4j({ student_id, name, email }) {
  try {
    const sId = parseInt(student_id, 10);
    if (isNaN(sId)) return false;
    await runCypher(`
      MERGE (s:Student {student_id: toInteger($student_id)})
      SET s.name = $name,
          s.email = $email
      RETURN s
    `, {
      student_id: sId,
      name: name || `Student ${sId}`,
      email: email || ''
    });
    console.log(`[Neo4j] Synced student node for ID ${sId} (${name}) to Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to sync student ${student_id} to Neo4j:`, err.message);
    return false;
  }
}

/**
 * Delete a Student node and relationships from Neo4j Cloud
 */
export async function deleteStudentFromNeo4j(student_id) {
  try {
    const sId = parseInt(student_id, 10);
    if (isNaN(sId)) return false;
    await runCypher(`
      MATCH (s:Student {student_id: toInteger($student_id)})
      DETACH DELETE s
    `, { student_id: sId });
    console.log(`[Neo4j] Deleted student node for ID ${sId} from Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to delete student ${student_id} from Neo4j:`, err.message);
    return false;
  }
}

/**
 * Synchronize an Instructor node to Neo4j Cloud
 */
export async function syncInstructorToNeo4j({ instructor_id, name, email, cabin_no, dept }) {
  try {
    const iId = parseInt(instructor_id, 10);
    if (isNaN(iId)) return false;
    await runCypher(`
      MERGE (i:Instructor {instructor_id: toInteger($instructor_id)})
      SET i.name = $name,
          i.email = $email,
          i.cabin_no = $cabin_no,
          i.dept = $dept
      RETURN i
    `, {
      instructor_id: iId,
      name: name || `Instructor ${iId}`,
      email: email || '',
      cabin_no: cabin_no || '',
      dept: dept || 'General'
    });
    console.log(`[Neo4j] Synced instructor node for ID ${iId} (${name}) to Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to sync instructor ${instructor_id} to Neo4j:`, err.message);
    return false;
  }
}

/**
 * Delete an Instructor node and relationships from Neo4j Cloud
 */
export async function deleteInstructorFromNeo4j(instructor_id) {
  try {
    const iId = parseInt(instructor_id, 10);
    if (isNaN(iId)) return false;
    await runCypher(`
      MATCH (i:Instructor {instructor_id: toInteger($instructor_id)})
      DETACH DELETE i
    `, { instructor_id: iId });
    console.log(`[Neo4j] Deleted instructor node for ID ${iId} from Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to delete instructor ${instructor_id} from Neo4j:`, err.message);
    return false;
  }
}

/**
 * Synchronize a Student -> Course enrollment relationship to Neo4j Cloud
 */
export async function syncEnrollmentToNeo4j({ student_id, course_id }) {
  try {
    const sId = parseInt(student_id, 10);
    const cId = parseInt(course_id, 10);
    if (isNaN(sId) || isNaN(cId)) return false;
    await runCypher(`
      MATCH (s:Student {student_id: toInteger($student_id)})
      MATCH (c:Course {course_id: toInteger($course_id)})
      MERGE (s)-[r:ENROLLED_IN]->(c)
      ON CREATE SET r.created_at = datetime()
      RETURN r
    `, {
      student_id: sId,
      course_id: cId
    });
    console.log(`[Neo4j] Synced enrollment: Student ${sId} -> Course ${cId} to Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to sync enrollment (${student_id} -> ${course_id}) to Neo4j:`, err.message);
    return false;
  }
}

/**
 * Remove a Student -> Course enrollment relationship from Neo4j Cloud
 */
export async function removeEnrollmentFromNeo4j({ student_id, course_id }) {
  try {
    const sId = parseInt(student_id, 10);
    const cId = parseInt(course_id, 10);
    if (isNaN(sId) || isNaN(cId)) return false;
    await runCypher(`
      MATCH (s:Student {student_id: toInteger($student_id)})-[r:ENROLLED_IN]->(c:Course {course_id: toInteger($course_id)})
      DELETE r
    `, {
      student_id: sId,
      course_id: cId
    });
    console.log(`[Neo4j] Removed enrollment: Student ${sId} -[:ENROLLED_IN]-> Course ${cId} from Neo4j Cloud.`);
    return true;
  } catch (err) {
    console.error(`[Neo4j] Failed to remove enrollment (${student_id} -> ${course_id}) from Neo4j:`, err.message);
    return false;
  }
}
