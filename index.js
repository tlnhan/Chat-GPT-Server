import dotenv from "dotenv";
dotenv.config();

import multer from "multer";
import express from "express";
import { OpenAI } from "langchain/llms/openai";
import cors from "cors";
import axios from "axios";
import path from "path";
import cloudinary from "cloudinary";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { dirname } from "path";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { Readable } from "stream";

const app = express();

const configuration = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAI(configuration);

// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET,
// });

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

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const originalFileName = req.file.originalname;

//     cloudinary.v2.uploader
//       .upload_stream(
//         { resource_type: "auto", public_id: originalFileName },
//         async (error, result) => {
//           if (error) {
//             console.error(error);
//             res.status(500).json({ error: "Failed to upload to Cloudinary" });
//           } else {
//             const currentFilePath = fileURLToPath(import.meta.url);
//             const currentDir = dirname(currentFilePath);

//             const uploadsFolder = path.join(currentDir, "uploads");
//             await fs.promises.mkdir(uploadsFolder, { recursive: true });

//             const uploadedFilePath = path.join(
//               uploadsFolder,
//               `${result.public_id}.${result.format}`
//             );
//             await fs.promises.writeFile(uploadedFilePath, req.file.buffer);

//             const loader = new PDFLoader(uploadedFilePath);
//             const docs = await loader.load();

//             const textSplitter = new RecursiveCharacterTextSplitter({
//               chunkSize: 1000,
//               chunkOverlap: 200,
//             });

//             const docOutput = await textSplitter.splitDocuments(docs);

//             let vectorStore = await FaissStore.fromDocuments(
//               docOutput,
//               new OpenAIEmbeddings()
//             );

//             const directory = process.env.DIR;
//             await vectorStore.save(directory);

//             console.log(directory);

//             const llmA = new OpenAI({ modelName: "gpt-3.5-turbo-1106" });
//             const chainA = loadQAStuffChain(llmA);

//             const loadedVectorStore = await FaissStore.load(
//               directory,
//               new OpenAIEmbeddings()
//             );

//             const question = req.body.question;

//             const resultQA = await loadedVectorStore.similaritySearch(
//               question,
//               1
//             );
//             const resA = await chainA.call({
//               input_documents: resultQA,
//               question,
//             });

//             res.json({ message: "File uploaded successfully", result: resA });
//           }
//         }
//       )
//       .end(req.file.buffer);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/chat-with-file", upload.single("file"), async (req, res) => {
  const { topic, filePath, message } = req.body;

  try {
    // const fileContent = await axios
    //   .get(filePath)
    //   .then((response) => response.data);

    const loader = new CheerioWebBaseLoader(filePath);
    const docs = await loader.load();
    console.log("docs loaded");

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docOutput = await textSplitter.splitDocuments(docs);
    let vectorStore = await FaissStore.fromDocuments(
      docOutput,
      new OpenAIEmbeddings()
    );
    console.log("saving...");

    const directory = process.env.DIR;
    await vectorStore.save(directory);
    console.log("saved!");

    const llmA = new OpenAI({ modelName: "gpt-3.5-turbo-1106" });
    const chainA = loadQAStuffChain(llmA);

    const loadedVectorStore = await FaissStore.load(
      directory,
      new OpenAIEmbeddings()
    );

    const question = message;
    const reply = await loadedVectorStore.similaritySearch(question, 1);
    const resA = await chainA.call({
      input_documents: reply,
      question,
    });
    console.log({ resA });
    res.json({ result: resA });

    // const chatCompletion = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [
    //     { role: "user", content: fileContent },
    //     { role: "user", content: message },
    //     { role: "assistant", content: "" },
    //     { role: "user", content: fileContent },
    //   ],
    // });

    // const reply = chatCompletion.choices[0].message.content.trim();

    // // const newQuestion = new Question({
    // //   topic: topic,
    // //   question: `${message} ${fileContent}`,
    // //   reply: reply,
    // //   fileUrls: [],
    // // });

    // // await newQuestion.save();

    // const newQuestion = {
    //   topic: topic,
    //   question: `${message} ${fileContent}`,
    //   reply: reply,
    //   fileUrls: [],
    // };

    // res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.post("/chat", async (req, res) => {
  const { topic, message } = req.body;

  try {
    // const chatCompletion = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [{ role: "user", content: message }],
    // });

    // const reply = chatCompletion.choices[0].message.content.trim();

    // // const newQuestion = new Question({
    // //   topic: topic,
    // //   question: message,
    // //   reply: reply,
    // // });

    // // await newQuestion.save();

    // const newQuestion = {
    //   topic: topic,
    //   question: message,
    //   reply: reply,
    // };

    // res.json({ reply });
    
    const model = new OpenAI({
      modelName: "gpt-3.5-turbo-1106",
      temperature: 0.9,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    const reply = await model.call(message);

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Port is listening.`);
});
