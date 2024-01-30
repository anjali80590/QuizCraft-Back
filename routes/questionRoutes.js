const express = require("express");
const {
  getQuestionsByUser,
  addQuestionToQuiz,
  getQuizQuestions,
  updateQuizQuestion,
} = require("../controllers/questionController");
const router = express.Router();
const { protect } = require("../Middleware/userMiddleware");
router.use(protect);

router.get("/user/:userId/question", protect, getQuestionsByUser);
router.post("/user/:userId/:quizId/question", protect, addQuestionToQuiz);
router.get("/user/:userId/:quizId/question", getQuizQuestions);
router.put("/user/:userId/:quizId/questions", updateQuizQuestion);

module.exports = router;
