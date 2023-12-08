require('dotenv').config();
const multer = require("multer");
const express = require("express");
const { OpenAI } = require("openai");
const cors = require("cors");
const axios = require("axios");
// const mongoose = require('mongoose');

const app = express();

const configuration = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAI(configuration);

app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// mongoose.connect(process.env.MONGOOSE, { useNewUrlParser: true, useUnifiedTopology: true });

// const questionSchema = new mongoose.Schema({
//   topic: String,
//   question: String,
//   reply: String,
//   fileUrls: [String],
// });

// const Question = mongoose.model('Question', questionSchema);

app.post("/chat-with-file", upload.single("file"), async (req, res) => {
  const { topic, filePath, message } = req.body;

  try {
    const fileContent = await axios.get(filePath).then(response => response.data);

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: fileContent },
        { role: "user", content: message },
        { role: "assistant", content: "" },
        { role: "user", content: fileContent },
      ],
    });

    const reply = chatCompletion.choices[0].message.content.trim();

    // const newQuestion = new Question({
    //   topic: topic,
    //   question: `${message} ${fileContent}`,
    //   reply: reply,
    //   fileUrls: [],
    // });

    // await newQuestion.save();

    const newQuestion = {
      topic: topic,
      question: `${message} ${fileContent}`,
      reply: reply,
      fileUrls: [],
    };

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Có lỗi xảy ra." });
  }
});

app.post("/chat", async (req, res) => {
  const { topic, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    const reply = chatCompletion.choices[0].message.content.trim();

    // const newQuestion = new Question({
    //   topic: topic,
    //   question: message,
    //   reply: reply,
    // });

    // await newQuestion.save();

    const newQuestion = {
      topic: topic,
      question: message,
      reply: reply,
    };

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Port is listening.`);
});