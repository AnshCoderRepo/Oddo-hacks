const Question = require('../models/Question');
const Answer = require('../models/Answer');

const createQuestion = async (req, res) => {
  const { title, description, tags } = req.body;

  if (!title || !description || !tags || !tags.length) {
    return res.status(400).json({ msg: 'All fields are required' });
  }

  try {
    const question = await Question.create({
      title,
      description,
      tags,
      user: req.user.id,
    });
    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('user', 'username')
      .lean();

    if (!question) return res.status(404).json({ msg: 'Question not found' });

    // Find the accepted answer for this question
    const acceptedAnswer = await Answer.findOne({
      question: req.params.id,
      isAccepted: true,
    }).populate('user', 'username');

    res.json({
      ...question,
      acceptedAnswer: acceptedAnswer || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};


module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
};
