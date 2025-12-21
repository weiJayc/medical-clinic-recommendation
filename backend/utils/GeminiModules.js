//讓gemini標準化
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function normalizeSymptoms(symptomText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Step 1：請 Gemini 標準化症狀
    const result = await model.generateContent(`
    你是一個醫療助理，請你根據使用者症狀描述，並參考以下科別表，告訴我使用者應該看哪一科，最多給4個科別就好，且統一轉換成「醫療院所常見的標準症狀名稱」。
    以下是所有科別:
    "一般內科, 家庭醫學科, 感染科, 過敏免疫風濕科, 耳鼻喉科, 神經內科, 心臟內科, 血液科, 小兒科, 腸胃內科, 
    皮膚科, 眼科, 新陳代謝科, 牙科, 精神科, 復健醫學科, 胸腔內科, 一般外科, 婦產科, 直腸外科, 泌尿科, 
    腎臟科, 神經外科, 整形外科, 骨科, 心臟血管外科, 疼痛控制科, 小兒外科"
    
    只輸出 JSON，格式如下：

    {
    "symptoms": ["標準症狀1", "標準症狀2", ...],
    "recommendDepartments":["對應科別1", "對應科別2",...]
    }

    使用者輸入：
    ${symptomText}
    `);
    console.log("原始回傳：", result.response.text());

    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();//清除```json```
    const parsed = JSON.parse(cleaned);
    console.log("JSON.parse(cleaned).symptoms =", parsed.symptoms);
    console.log("JSON.parse(cleaned).recommendDepartments =", parsed.recommendDepartments);
    return parsed;  //json存入
    
    //const standardized = parsed.symptoms; //json中symptoms的內容
}