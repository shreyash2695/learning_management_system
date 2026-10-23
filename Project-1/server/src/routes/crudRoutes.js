import express from 'express';
import {
  getSchema,
  getTableRecords,
  insertRecord,
  updateRecord,
  deleteRecord,
  executeRawQuery
} from '../controllers/crudController.js';

const router = express.Router();

// Admin Role Guard Middleware
function requireAdmin(req, res, next) {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Administrator privileges are required to access Database CRUD Studio and execute SQL queries.'
    });
  }
  next();
}

// Apply Admin Guard to all CRUD and Query routes
router.use(requireAdmin);

// Schema metadata
router.get('/schema', getSchema);

// SQL Query Runner
router.post('/query', executeRawQuery);

// Table Records CRUD
router.get('/:table', getTableRecords);
router.post('/:table', insertRecord);
router.put('/:table', updateRecord);
router.delete('/:table', deleteRecord);

export default router;
