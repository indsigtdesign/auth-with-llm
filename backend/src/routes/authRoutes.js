import express from 'express';
import {
	chatAuth,
	initializeAuth,
	getHighScores,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/initialize', initializeAuth);
router.post('/chat', chatAuth);
router.get('/highscores', getHighScores);

export default router;
