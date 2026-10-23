import express from 'express';
import {
  getGraphHealth,
  getCurriculumGraph,
  executeCypherQuery,
  getCoursePrerequisites,
  getLearningPath,
  checkStudentEligibility,
  getStudentProgressMap,
  detectPrerequisiteCycles,
  getPeerRecommendations
} from '../controllers/graphController.js';

const router = express.Router();

// Admin Role Guard Middleware for Neo4j Graph Database
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Administrator privileges are required to access Neo4j Graph Database and execute Cypher queries.'
    });
  }
  next();
}

// Apply Admin Guard to all Neo4j Graph routes
router.use(requireAdmin);

// Graph infrastructure health
router.get('/health', getGraphHealth);

// Full curriculum graph for interactive visualization
router.get('/curriculum', getCurriculumGraph);

// Interactive Cypher Query Execution Playground
router.post('/cypher', executeCypherQuery);

// Prerequisite tree (direct + transitive multi-hop)
router.get('/prerequisites/:courseId', getCoursePrerequisites);

// Shortest learning pathway (e.g., /learning-path?from=301&to=308)
router.get('/learning-path', getLearningPath);

// Student enrollment eligibility based on prerequisites
router.get('/eligibility/:studentId/:courseId', checkStudentEligibility);

// Personalized Student Progress Map (Completed, Enrolled, Eligible, Locked)
router.get('/student-progress/:studentId', getStudentProgressMap);

// Curriculum cycle and deadlock detection
router.get('/cycles', detectPrerequisiteCycles);

// Graph-based collaborative filtering recommendations
router.get('/recommendations/:studentId', getPeerRecommendations);

export default router;
