import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "EduBatch API is running",
  });
});

export default app;