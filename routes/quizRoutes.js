const express = require("express");
const router = express.Router();
const {
  deleteQuiz,
  getAllQuestionCreatedByUserId,
  getQuizzesByUserId,
  createQuizByUserId,
  trendingQuizzes,
  impressionOfQuiz,
  submitQuiz,
  getQuizAnalytics,
  totalImpressionsByUser,
} = require("../controllers/quizController");
const { protect } = require("../Middleware/userMiddleware");

router.delete("/:id", protect, deleteQuiz);
router.get(
  "/user/:userId/quizzes/question",
  protect,
  getAllQuestionCreatedByUserId
);
router.get("/user/:userId/quizzes", protect, getQuizzesByUserId);
router.post("/user/:userId/quizzes", protect, createQuizByUserId);
router.get("/quiz-analysis/:quizId", getQuizAnalytics);
router.get("/total-impressions/:userId", totalImpressionsByUser);
router.get("/user/:userId/trending", protect, trendingQuizzes);
router.get("/quiz/:userId/:quizId/impression", impressionOfQuiz);
router.post("/submit-quiz", protect, submitQuiz);

module.exports = router;
