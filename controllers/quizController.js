const { Question } = require("../models/Question");
const Quiz = require("../models/Quiz");
const QuizResponse = require("../models/QuizResponse");
const mongoose = require("mongoose");
exports.createQuiz = async (req, res) => {
  try {
    const { name, type } = req.body;
    const userId = req.params.userId;

    const newQuiz = new Quiz({
      name,
      type,
      creator: userId,
      questions: [],
    });

    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error("Error in createQuiz:", error);
    res
      .status(500)
      .json({ message: "Failed to create quiz", error: error.message });
  }
};

exports.getQuiz = async (req, res) => {
  try {
    const id = req.params.id.trim();

    const quiz = await Quiz.findByIdAndUpdate(
      id,
      { $inc: { impressions: 1 } },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid quiz ID format" });
    }
    console.error("Error fetching and updating quiz impressions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;
    console.log("Deleting quiz with ID:", quizId);

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).send("Quiz not found");
    }

    const quizDeleteResult = await Quiz.findByIdAndDelete(quizId);
    console.log("Quiz delete result:", quizDeleteResult);

    const questionDeleteResult = await Question.deleteMany({
      _id: { $in: quiz.questions },
    });
    console.log("Question delete result:", questionDeleteResult);

    res.status(204).send();
    console.log("Quiz and associated questions deleted");
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).send(error);
  }
};

exports.getQuizzesByUserId = async (req, res) => {
  try {
    console.log("user id");
    const userId = req.params.userId;
    console.log(userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: "Invalid user ID" });
    }

    const quizzes = await Quiz.find({ creator: userId });

    console.log(quizzes);

    res.json(quizzes);
  } catch (error) {
    console.error("Error in getQuizzesByUserId:", error);
    res.status(500).send(error.message);
  }
};

exports.createQuizByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { name, type } = req.body;

    const newQuiz = new Quiz({
      name,
      type,

      creator: userId,
    });

    await newQuiz.save();

    res.status(201).json(newQuiz);
  } catch (error) {
    console.error("Error in createQuiz:", error);
    res.status(500).send(error);
  }
};

exports.trendingQuizzes = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Received user ID:", userId);

    const trendingQuizzes = await Quiz.find({ creator: userId })
      .sort({ impressions: -1, createdOn: -1 })
      .select("name createdOn impressions");

    const quizzesWithFormattedDates = trendingQuizzes.map((quiz) => ({
      ...quiz.toObject(),
      createdOn: quiz.createdOn.toISOString(),
    }));

    res.json({ quizzes: quizzesWithFormattedDates });
  } catch (error) {
    console.error("Error fetching trending quizzes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.impressionOfQuiz = async (req, res) => {
  try {
    const quizId = req.params.quizId;

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    quiz.impressions += 1;
    await quiz.save();

    res.json({ impressions: quiz.impressions });
  } catch (error) {
    console.error("Error accessing quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllQuestionCreatedByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const quizzes = await Quiz.find({ owner: userId }).populate("questions");

    const questions = quizzes.reduce(
      (acc, quiz) => acc.concat(quiz.questions),
      []
    );

    res.json({
      message: "Questions fetched successfully",
      questions: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.totalImpressionsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const objectIdUserId = new mongoose.Types.ObjectId(userId); // Using 'new' keyword

    const result = await Quiz.aggregate([
      { $match: { creator: objectIdUserId } },
      { $group: { _id: null, totalImpressions: { $sum: "$impressions" } } },
    ]);

    const totalImpressions = result.length > 0 ? result[0].totalImpressions : 0;
    res.json({ totalImpressions });
  } catch (error) {
    console.error("Error calculating total impressions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function processQnAQuiz(answers, quiz, userId) {
  let correctAttempts = 0;
  let incorrectAttempts = 0;
  let questions = [];

  for (let i = 0; i < quiz.questions.length; i++) {
    const questionId = quiz.questions[i];
    const question = await Question.findById(questionId);

    if (question && question.quizType === "Q&A") {
      if (question.correctAnswer === answers[i]) {
        correctAttempts++;
      } else {
        incorrectAttempts++;
      }
      questions.push(question);
    }
  }

  return {
    success: true,
    message: "Q&A quiz processed",
    correctAttempts,
    incorrectAttempts,
    questions,
  };
}

async function processPollQuiz(answers, quiz, userId) {
  let selectedOptions = [];
  let questions = [];

  for (let i = 0; i < quiz.questions.length; i++) {
    const questionId = quiz.questions[i];
    const selectedOption = answers[i];

    await updatePollOptions(questionId, selectedOption);

    const question = await Question.findById(questionId);
    questions.push(question);
    selectedOptions.push(selectedOption);
  }

  return {
    success: true,
    message: "Poll quiz processed",
    selectedOptions,
    questions,
  };
}

async function updatePollOptions(questionId, selectedOption) {
  const updateField = `selectedOption.${selectedOption - 1}`;

  await Question.findByIdAndUpdate(questionId, { $inc: { [updateField]: 1 } });
}

exports.submitQuiz = async (req, res) => {
  try {
    const { userId, quizId, answers } = req.body;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let result;
    let questions = [];
    const quizName = quiz.name;
    const impressions = quiz.impressions || 0;
    const CreatedOn = quiz.createdOn;

    if (quiz.type === "Q&A") {
      const {
        success,
        message,
        correctAttempts,
        incorrectAttempts,
        questions: qnaQuestions,
      } = await processQnAQuiz(answers, quiz, userId);
      result = { success, message, correctAttempts, incorrectAttempts };
      questions = qnaQuestions;
    } else if (quiz.type === "Poll") {
      const {
        success,
        message,
        selectedOptions,
        questions: pollQuestions,
      } = await processPollQuiz(answers, quiz, userId);
      result = { success, message, selectedOptions };
      questions = pollQuestions;
    } else {
      return res.status(400).json({ message: "Invalid quiz type" });
    }

    const response = new QuizResponse({
      userId,
      quizId,
      answers,
      result,
      questions,
      CreatedOn,
      impressions,
      quizName,
    });
    await response.save();

    for (let i = 0; i < questions.length; i++) {
      const questionId = questions[i]._id;
      if (questions[i].quizType === "Q&A") {
        if (questions[i].correctAnswer === answers[i]) {
          await Question.findByIdAndUpdate(questionId, {
            $inc: { correctAttempts: 1, totalAttempts: 1 },
          });
        } else {
          await Question.findByIdAndUpdate(questionId, {
            $inc: { incorrectAttempts: 1, totalAttempts: 1 },
          });
        }
      } else if (questions[i].quizType === "Poll") {
        await updatePollOptions(questionId, answers[i]);
      }
    }

    res.status(200).json({
      result,
      questions,
      quizName,
      impressions,
      CreatedOn,
      quizId,
      answers,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getQuizAnalytics = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quiz = await Quiz.findById(quizId).populate("questions");

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let analytics = {
      totalAttempts: 0,
      correctAttempts: 0,
      incorrectAttempts: 0,
      pollResponses: {},
      quizName: quiz.name,
      createdOn: quiz.createdOn,
      impressions: quiz.impressions,
    };
    let questions = [];

    if (quiz.type === "Q&A") {
      const { analytics: qnaAnalytics, questions: qnaQuestions } =
        await calculateQnAAnalytics(quiz);
      analytics = { ...analytics, ...qnaAnalytics };
      questions = qnaQuestions;
    } else if (quiz.type === "Poll") {
      const { analytics: pollAnalytics, question: pollQuestion } =
        await calculatePollAnalytics(quiz);
      analytics = { ...analytics, ...pollAnalytics };
      questions = [pollQuestion];
    }

    res.status(200).json({ quizId, analytics, questions });
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function calculateQnAAnalytics(quiz) {
  let analytics = {
    totalAttempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
  };
  let questions = [];

  for (let questionId of quiz.questions) {
    const question = await Question.findById(questionId);
    if (question) {
      analytics.totalAttempts += question.totalAttempts || 0;
      analytics.correctAttempts += question.correctAttempts || 0;
      analytics.incorrectAttempts += question.incorrectAttempts || 0;
      questions.push(question);
    }
  }

  return { analytics, questions };
}
async function calculatePollAnalytics(quiz) {
  let analytics = {
    pollResponses: {},
  };

  const questions = await Question.find({ _id: { $in: quiz.questions } });

  if (!questions || questions.length === 0) {
    throw new Error("No questions found for this quiz.");
  }

  const quizResponses = await QuizResponse.find({ quizId: quiz._id });

  if (!quizResponses || quizResponses.length === 0) {
    throw new Error("No responses found for this quiz.");
  }

  questions.forEach((question) => {
    analytics.pollResponses[question._id] = {
      questionText: question.text,
      options: {},
    };
  });

  quizResponses.forEach((response) => {
    if (response.answers && Array.isArray(response.answers)) {
      response.answers.forEach((answer) => {
        const { questionId, chosenOption } = answer;
        if (questionId !== undefined && chosenOption !== undefined) {
          if (!analytics.pollResponses[questionId].options[chosenOption]) {
            analytics.pollResponses[questionId].options[chosenOption] = 0;
          }
          analytics.pollResponses[questionId].options[chosenOption]++;
        }
      });
    }
  });

  return analytics;
}
