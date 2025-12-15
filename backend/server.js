import express from "express";
import dotenv from "dotenv";

import recommendRoute from "./routes/recommend.js";
//import hospitalsRoute from "./utils/findHospitals.js";

dotenv.config();
const app = express();

app.use(express.json());

// API 路由
app.use("/api/recommend", recommendRoute);
//app.use("/api/hospitals", hospitalsRoute);

app.listen(3001, () => {
  console.log("Server running: http://localhost:3001");
});
