const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const dotenv = require("dotenv");
const quizRoutes = require("./routes/quizRoutes");
const questionRoutes = require("./routes/questionRoutes");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    console.error("Bad JSON", error);

    return res.status(400).send({ message: "Bad request: Invalid JSON" });
  }
  next();
});

app.get("/", (req, res) => {
  res.send({ message: "welcome" });
});

app.use("/api/users", userRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/questions", questionRoutes);

app.listen(PORT, () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log(`Server running on http://localhost:${PORT}`))
    .catch((err) => console.log(err));
});
