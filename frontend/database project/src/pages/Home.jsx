import "./home.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import { postJson } from "../utils/api";

async function getGeolocationSafe() {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 },
    );
  });
}

export default function Home() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [symptom, setSymptom] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!symptom.trim()) {
      alert(t("requiredSymptom"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const coords = await getGeolocationSafe();
      const payload = { symptom: symptom.trim() };
      if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      }

      const res = await postJson("/api/recommend", payload);
      setAnalysis(res);
      showToast(t("toastAnalysisReady"));
    } catch (err) {
      console.error(err);
      setError(err.message || "Request failed");
      showToast(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const goToNearbySearch = () => {
    if (!analysis) return;
    navigate("/search", {
      state: {
        source: "nearby",
        providersBySpecialty: analysis.providersBySpecialty ?? [],
        specialties: analysis.specialties ?? [],
        recommendDepartments: analysis.recommendDepartments ?? [],
        standardizedSymptoms: analysis.standardizedSymptoms ?? [],
      },
    });
  };

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

        <form
          className="input-area"
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
        >
          <input
            type="text"
            placeholder={t("symptomPlaceholder")}
            className="input-box"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
          />
          <button className="send-btn" type="submit" disabled={loading}>
            {loading ? "..." : t("send")}
          </button>
        </form>

        {error && <p className="analysis-note" style={{ color: "red" }}>{error}</p>}

        {analysis && (
          <div className="analysis-card">
            <h3>{t("deptSuggestion")}</h3>
            <div className="dept-list">
              {(analysis.recommendDepartments || []).map((d) => (
                <span key={d} className="dept-badge">
                  {d}
                </span>
              ))}
            </div>

            <p className="analysis-note">{t("analysisNote")}</p>

            <button
              className="btn search-btn analysis-search-btn"
              onClick={goToNearbySearch}
              disabled={loading}
            >
              {t("analysisSearch")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
