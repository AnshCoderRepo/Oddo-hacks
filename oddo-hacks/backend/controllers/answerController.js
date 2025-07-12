const Answer = require('../models/Answer');
const Question = require('../models/Question');

const postAnswer = async (req, res) => {
  const { content } = req.body;
  const questionId = req.params.questionId;

  if (!content) return res.status(400).json({ msg: 'Answer content is required' });

  try {
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ msg: 'Question not found' });

    const answer = await Answer.create({
      content,
      question: questionId,
      user: req.user.id,
    });

    res.status(201).json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

const getAnswersByQuestion = async (req, res) => {
  const questionId = req.params.questionId;
  try {
    const answers = await Answer.find({ question: questionId })
      .populate('user', 'username')
      .sort({ createdAt: 1 }); // Oldest to newest

    res.json(answers);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  postAnswer,
  getAnswersByQuestion,
};
