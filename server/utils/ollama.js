const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

async function callOllama(prompt, model = DEFAULT_MODEL) {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.response ?? "";
}

export async function normalizeSymptoms(symptomText) {
  if (!symptomText || typeof symptomText !== "string") {
    throw new Error("symptomText must be a non-empty string");
  }

  const prompt = `
You are a medical triage assistant for clinics in Taiwan. Given a patient's symptom description, output JSON only (no code fences, no explanation):
{
  "symptoms": ["normalized symptom 1", "normalized symptom 2", ...],
  "recommendDepartments": ["dept1", "dept2"] // choose 1-4 max
}
Departments must be chosen from this list only: 泌尿科,兒科,眼科,麻醉科,骨科,解剖病理科,整形外科,放射診斷科,臨床病理科,復健科,皮膚科,中醫一般科,神經科,婦產科,急診醫學科,家庭醫學科,其他,耳鼻喉科,西醫一般科,牙醫一般科,精神科,放射腫瘤科,神經外科,內科,職業醫學科,外科,核子醫學科,感染科,過敏免疫風濕科,心臟內科,血液科,腸胃內科,新陳代謝科,胸腔內科,腎臟科,心臟血管外科,疼痛控制科,直腸外科,神經內科
Return concise symptom phrases and departments only.回覆使用繁體中文，並且科別要準確對應上方的文字清單。
Patient description:
${symptomText}
`.trim();

  const rawText = await callOllama(prompt);
  const cleaned = rawText.replace(/```json|```/gi, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse Ollama response: ${err.message}`);
  }
}
