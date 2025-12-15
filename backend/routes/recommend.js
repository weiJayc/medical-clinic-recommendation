//找出症狀對應科別
import express from "express";
import { normalizeSymptoms } from "../utils/GeminiModules.js";
import { findHospitals } from "../utils/findHospitals.js";
import fs from "fs";

const router = express.Router();

// 載入醫院資料
const hospitals = JSON.parse(fs.readFileSync("data/hospitals.json", "utf8"));
//載入症狀對應科別資料
const symptomToDept = JSON.parse(fs.readFileSync("data/symptomToDept.json", "utf8"));

router.post("/", async (req, res) => {
  const { symptom, city } = req.body;

  try {
    //Gemini：把使用者描述標準化並找出建議科別
    const standardized = await normalizeSymptoms(symptom);

     // 取得標準化症狀與建議科別
    const standardizedSymptoms = standardized.symptoms;
    const deptList = standardized.recommendDepartments;
    
    // 搜尋醫院（符合城市＆任一科別）
    const matchedHospitals = findHospitals(city, deptList);

    // ④ 回傳給前端 Google Maps
    res.json({
      input: symptom,
      standardizedSymptoms: standardizedSymptoms,
      recommendDepartments: deptList,
      matchedHospitals: matchedHospitals
    });

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

export default router;
