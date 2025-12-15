//找出症狀對應科別
import express from "express";
import { normalizeSymptoms } from "../GeminiModules.js";
//import { symptomToDept } from "../mappings/symptomToDept.js";
import fs from "fs";

const router = express.Router();

// 載入醫院資料
const hospitals = JSON.parse(fs.readFileSync("data/hospitals.json", "utf8"));
//載入症狀對應科別資料
const symptomToDept = JSON.parse(fs.readFileSync("data/symptomToDept.json", "utf8"));

router.post("/", async (req, res) => {
  const { symptom, city } = req.body;

  try {
    // ① Gemini：把使用者描述標準化
    const standardized = await normalizeSymptoms(symptom);

    // ② 根據標準化症狀找科別
    let departments = new Set();
    for (const s of standardized) {
      if (symptomToDept[s]) {
        symptomToDept[s].forEach(d => departments.add(d));
      }
    }

    const deptList = [...departments];

    // ③ 搜尋醫院（符合城市＆任一科別）
    const matchedHospitals = hospitals.filter(h =>
      h.city === city && h.departments.some(d => deptList.includes(d))
    );

    // ④ 回傳給前端 Google Maps
    res.json({
      input: symptom,
      standardizedSymptoms: standardized,
      recommendDepartments: deptList,
      matchedHospitals: matchedHospitals
    });

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

export default router;
