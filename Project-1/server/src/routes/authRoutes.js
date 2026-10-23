import express from 'express';
import { login, getCurrentUser, register, getRegistrationMetadata } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', getCurrentUser);
router.post('/register', register);
router.get('/register-meta', getRegistrationMetadata);

export default router;
