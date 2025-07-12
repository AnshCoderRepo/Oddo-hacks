const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getAllQuestions,
  getQuestionById
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createQuestion);
router.get('/', getAllQuestions);
router.get('/:id', getQuestionById);

module.exports = router;
