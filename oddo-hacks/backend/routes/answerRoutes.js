const express = require('express');
const router = express.Router();
const { postAnswer, getAnswersByQuestion, acceptAnswer } = require('../controllers/answerController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/answers/:questionId - Add answer to question
router.post('/:questionId', protect, postAnswer);

// GET /api/answers/:questionId - Get all answers for a question
router.get('/:questionId', getAnswersByQuestion);

// PUT /api/answers/:answerId/accept - Accept an answer
router.put('/:answerId/accept', protect, acceptAnswer);

module.exports = router;
