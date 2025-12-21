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
- 僅使用常見科別名稱：內科、家醫科、小兒科、耳鼻喉科、心臟內科、皮膚科、胃腸肝膽科、婦產科、精神科、復健科、骨科。
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
