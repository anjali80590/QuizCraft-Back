const mongoose = require("mongoose");

const quizResponseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  answers: [Number], // Assuming answers are stored as an array of numbers representing the selected options
  selectedOptions: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
      optionIndex: Number, // This field will store the index of the selected option
    },
  ],
  result: {
    success: Boolean,
    message: String,
    correctAttempts: Number,
    incorrectAttempts: Number,
    // You can include selectedOptions here as well if you want to return it in the result
  },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const QuizResponse = mongoose.model("QuizResponse", quizResponseSchema);

module.exports = QuizResponse;
