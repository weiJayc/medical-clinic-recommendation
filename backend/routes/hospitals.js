//純醫院查詢 API
import express from "express";
import fs from "fs";

const router = express.Router();
const hospitals = JSON.parse(fs.readFileSync("data/hospitals.json", "utf8"));

router.get("/", (req, res) => {
  const { city, dept } = req.query;

  const result = hospitals.filter(h =>
    h.city === city &&
    h.departments.includes(dept)
  );

  res.json(result);
});

export default router;
