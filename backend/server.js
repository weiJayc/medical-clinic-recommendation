import express from "express";
import dotenv from "dotenv";

import recommendRoute from "./routes/recommend.js";

dotenv.config();
const app = express();

app.use(express.json());

// API 路由
app.use("/api/recommend", recommendRoute);

app.listen(3001, () => {
  console.log("Server running: http://localhost:3001");
});
