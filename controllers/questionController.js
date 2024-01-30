const { Question: QuestionModel } = require("../models/Question");
const mongoose = require("mongoose");
const Quiz = require("../models/Quiz");

exports.updateQuizQuestion = async (req, res) => {
  const { quizId } = req.params;
  const { questions } = req.body;

  try {
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Invalid questions data" });
    }

    quiz.impressions = 0;

    const updatedQuestions = [];

    for (const questionData of questions) {
      const { _id, Question, options, correctAnswer, timer } = questionData;

      const existingQuestion = await QuestionModel.findById(_id);

      if (!existingQuestion) {
        return res.status(404).json({
          message: "Question not found",
        });
      }

      existingQuestion.Question = Question;
      existingQuestion.options = options;
      existingQuestion.correctAnswer = correctAnswer;
      existingQuestion.timer = timer;

      const updatedQuestion = await existingQuestion.save();
      updatedQuestions.push(updatedQuestion);
    }

    await quiz.save();

    return res.status(200).json({
      message: "Questions updated successfully",
      updatedQuestions,
    });
  } catch (error) {
    console.error("Error in updateQuestionToQuiz:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const questions = await QuestionModel.find();
    res.json(questions);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createQuestion = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;

    const question = new QuestionModel({
      ...req.body,
      creator: userId,
    });

    await question.save();

    res.status(201).json(question);
  } catch (error) {
    console.error("Error creating a new question:", error);
    res.status(500).send(error.message);
  }
};

exports.getQuestionsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const questions = await QuestionModel.find({ creator: userId }).populate(
      "creator"
    );

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "No questions found for the given user ID." });
    }

    res.json(questions);
  } catch (error) {
    console.error("Error in getQuestionsByUser:", error);
    res
      .status(500)
      .json({ message: "Internal server error while fetching questions." });
  }
};

exports.getQuizAnalytics = async (req, res) => {
  try {
    const { quizId } = req.params;

    const questions = await QuestionModel.find({ Quiz: quizId });

    if (!questions.length) {
      return res
        .status(404)
        .json({ message: "No questions found for this quiz." });
    }

    const quizAnalytics = questions.map((question) => ({
      questionId: question._id,
      questionText: question.Question,
      totalAttempts: question.analytics.totalAttempts,
      correctAttempts: question.analytics.correctAttempts,
      optionAttempts: question.options.map((option) => option.attempts),
    }));

    res.status(200).json(quizAnalytics);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

exports.addQuestionToQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { questions } = req.body;
  const userId = req.params.userId;

  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const questionPromises = questions.map(async (question) => {
      const newQuestion = {
        Question: question.Question,
        options: question.options,
        correctAnswer:
          question.quizType === "Q&A" ? question.correctAnswer : undefined,
        quizType: question.quizType,
        timer: question.quizType === "Q&A" ? question.timer : "OFF",
        creator: userId,
        quiz: quizId,
      };

      return await QuestionModel.create(newQuestion);
    });

    const savedQuestions = await Promise.all(questionPromises);

    savedQuestions.forEach((savedQuestion) => {
      quiz.questions.push(savedQuestion._id);
    });

    await quiz.save();
    return res.status(201).json({ message: "Questions added", quiz });
  } catch (error) {
    console.error("Error in addQuestionToQuiz:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

exports.getQuizQuestions = async (req, res) => {
  console.log("Here I am reached");
  try {
    console.log("Request params:", req.params);
    console.log("Request query:", req.query);
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId).populate({
      path: "questions",
      select: "_id Question options quizType correctAnswer timer",
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    console.log(quiz);

    if (!Array.isArray(quiz.questions)) {
      console.error("Quiz questions are not an array:", quiz.questions);
      return res
        .status(500)
        .json({ message: "Questions property not formatted properly." });
    }

    res.status(200).json(quiz.questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    res.status(500).json({ message: "Server error" });
  }
};
