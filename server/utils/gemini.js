import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

export async function normalizeSymptoms(symptomText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
你是一位醫療分診助理。請標準化使用者提供的症狀描述，並輸出 JSON：
{
  "symptoms": ["標準化症狀1", "標準化症狀2", ...],
  "recommendDepartments": ["建議科別1", "建議科別2", ...] // 至少 1 筆，最多 4 筆
}
限制：
- 科別只能從下列列表挑選（不可產生其他科別）：內科, 家庭醫學科, 感染科, 過敏免疫風濕科, 耳鼻喉科, 神經內科, 心臟內科, 血液科, 兒科, 腸胃內科, 皮膚科, 眼科, 新陳代謝科, 牙醫一般科, 精神科, 復健科, 胸腔內科, 外科, 婦產科, 直腸外科, 泌尿科, 腎臟科, 神經科, 整形外科, 骨科, 心臟血管外科, 疼痛控制科, 解剖病理科, 放射診斷科, 急診醫學科, 臨床病理科, 中醫一般科, 西醫一般科, 放射種瘤科, 麻醉科, 職業醫學科, 核子醫學科, 其他
- 僅輸出純 JSON，不要有其他文字或說明。

使用者輸入：
${symptomText}
`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return parsed;
}
