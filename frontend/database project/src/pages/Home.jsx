import "./home.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import { useLanguage } from "../contexts/LanguageContext";
import { DEPARTMENTS } from "../data/medicalConstants";
import { useToast } from "../contexts/ToastContext";

const symptomRules = [
  {
    triggers: ["流鼻水", "鼻塞", "打噴嚏", "runny nose", "sneeze", "stuffy nose"],
    departments: ["family", "ent", "internal"],
    diseases: ["uri", "allergicRhinitis"],
  },
  {
    triggers: ["喉嚨痛", "咳嗽", "發燒", "sore throat", "cough", "fever"],
    departments: ["family", "internal"],
    diseases: ["uri", "influenza"],
  },
  {
    triggers: ["皮疹", "紅疹", "癢", "rash", "itch"],
    departments: ["dermatology"],
    diseases: ["dermatitis", "eczema"],
  },
  {
    triggers: ["胃痛", "腹痛", "噁心", "嘔吐", "stomach ache", "stomach pain", "nausea", "vomit"],
    departments: ["gastro", "family"],
    diseases: ["gastritis"],
  },
  {
    triggers: ["胸痛", "心悸", "心跳快", "heart pain", "chest pain", "palpitation"],
    departments: ["cardiology", "family"],
    diseases: ["heartIssue"],
  },
  {
    triggers: ["焦慮", "失眠", "憂鬱", "anxiety", "insomnia", "depression"],
    departments: ["psychiatry", "family"],
    diseases: ["anxiety"],
  },
  {
    triggers: ["跌倒", "扭傷", "骨折", "fall", "sprain", "fracture"],
    departments: ["orthopedics", "rehab"],
    diseases: ["injury"],
  },
  {
    triggers: ["懷孕", "經痛", "月經", "pregnant", "period pain", "menstrual", "cramps"],
    departments: ["obgyn"],
    diseases: ["pregnancy"],
  },
];

function analyzeSymptom(text) {
  const lower = text.toLowerCase();
  const matchedDepts = [];
  const matchedDiseases = [];

  symptomRules.forEach((rule) => {
    const hit = rule.triggers.some((word) => lower.includes(word.toLowerCase()));
    if (hit) {
      matchedDepts.push(...rule.departments);
      matchedDiseases.push(...rule.diseases);
    }
  });

  if (matchedDepts.length === 0) {
    matchedDepts.push("family");
  }

  return {
    departments: Array.from(new Set(matchedDepts)),
    diseases: Array.from(new Set(matchedDiseases)),
  };
}

export default function Home() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [symptom, setSymptom] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (!symptom.trim()) {
      alert(t("requiredSymptom"));
      return;
    }
    const result = analyzeSymptom(symptom);
    setAnalysis(result);
    showToast(t("toastAnalysisReady"));
  };

  const goToRecommendedSearch = () => {
    if (analysis?.departments?.length) {
      navigate("/search", { state: { departments: analysis.departments } });
      return;
    }
    navigate("/search");
  };

  const deptLabel = (id) => DEPARTMENTS[id]?.[language] ?? id;

  return (
    <div className="home-wrapper">
      <button
        className={`menu-button ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="home-container">
        <h2 className="home-title">{t("homeTitle")}</h2>

        <form className="input-area" onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }}>
          <input
            type="text"
            placeholder={t("symptomPlaceholder")}
            className="input-box"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
          />
          <button className="send-btn" type="submit">
            {t("send")}
          </button>
        </form>

        <div className="button-group">
          <button className="btn ai-btn" onClick={handleAnalyze}>
            {t("aiAnalyze")}
          </button>
          <button className="btn search-btn" onClick={goToRecommendedSearch}>
            {t("searchHospital")}
          </button>
        </div>

        {analysis && (
          <div className="analysis-card">
            <h3>{t("deptSuggestion")}</h3>
            <div className="dept-list">
              {analysis.departments.map((d) => (
                <span key={d} className="dept-badge">
                  {deptLabel(d)}
                </span>
              ))}
            </div>

            <p className="analysis-note">{t("analysisNote")}</p>

            <button className="btn search-btn analysis-search-btn" onClick={goToNearbySearch}>
              {t("analysisSearch")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
