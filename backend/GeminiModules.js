//讓gemini標準化
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function normalizeSymptoms(symptomText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Step 1：請 Gemini 標準化症狀
    const result = await model.generateContent(`
    你是一位「醫療分診系統」模型，請將使用者的症狀描述，
    統一轉換成「台灣醫療院所常見的標準症狀名稱」。

     重要規則：
    1. 不要推測病名，只能輸出症狀。
    2. 請將使用者描述的模糊說法，轉成醫療上常見的標準詞。
    3. 具有相同涵義的症狀，請統一成同一個名稱，例如：
      - 「肚子悶悶痛」「腹部悶痛」「胃痛」 → 統一成「腹痛」
      - 「頭暈暈的」「快要昏倒」「世界在晃」 → 統一成「頭暈」
      - 「嘴巴有味道」「口中有異味」「口腔異味」 → 統一成「口臭」
      - 「臉腫腫」「身體浮腫」 → 統一成「水腫」
      - 「胸口悶」「胸悶」 → 統一成「胸悶」
      - 「喉嚨怪怪的」「喉嚨卡卡」 → 統一成「喉嚨不適」
    4. 絕對禁止創造嚴重疾病名稱（如癌症、腫瘤、敗血症）。
    5. 若使用者症狀不明確，請以「不明症狀」代表。

    只輸出 JSON，格式如下：

    {
    "symptoms": ["標準症狀1", "標準症狀2", ...]
    }

    使用者輸入：
    ${symptomText}
    `);

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();//清除```json```
    console.log("JSON.parse(cleaned).symptoms =", JSON.parse(cleaned).symptoms);
    return JSON.parse(cleaned).symptoms;  //json存入
    //const standardized = parsed.symptoms; //json中symptoms的內容
}