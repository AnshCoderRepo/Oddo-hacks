const express = require('express');
const router = express.Router();
const { postAnswer, getAnswersByQuestion, acceptAnswer, voteAnswer } = require('../controllers/answerController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/answers/:questionId - Add answer to question
router.post('/:questionId', protect, postAnswer);

// GET /api/answers/:questionId - Get all answers for a question
router.get('/:questionId', getAnswersByQuestion);

// PUT /api/answers/:answerId/accept - Accept an answer
router.put('/:answerId/accept', protect, acceptAnswer);

// PUT /api/answers/:answerId/vote - Vote on an answer (assuming you have a vote functionality)
router.put('/:answerId/vote', protect, voteAnswer);


module.exports = router;
