import "./hospital.css";
import { useState, useMemo, useEffect } from "react";
import SideMenu from "../components/SideMenu";
import { useNavigate, useLocation } from "react-router-dom";
import HomeIcon from "../assets/home.jpg";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { DEPARTMENTS } from "../data/medicalConstants";
import { useToast } from "../contexts/ToastContext";

const HOSPITALS = [
  {
    id: 1,
    name: { zh: "仁愛醫院", en: "Ren'ai Hospital" },
    type: { zh: "教學醫院", en: "Teaching Hospital" },
    departments: ["family", "internal", "ent", "cardiology"],
    distanceKm: 0.8,
    address: { zh: "台北市大安區仁愛路四段100號", en: "100 Ren'ai Rd., Sec.4, Da'an Dist., Taipei" },
    isOpen: true,
    rating: 4.5,
  },
  {
    id: 2,
    name: { zh: "安和診所", en: "An-He Clinic" },
    type: { zh: "社區診所", en: "Community Clinic" },
    departments: ["family", "pediatrics"],
    distanceKm: 0.4,
    address: { zh: "台北市大安區復興南路一段50號10樓", en: "10F., No.50 Fuxing S. Rd., Da'an Dist., Taipei" },
    isOpen: true,
    rating: 4.2,
  },
  {
    id: 3,
    name: { zh: "永康耳鼻喉科診所", en: "Yongkang ENT Clinic" },
    type: { zh: "專科診所", en: "Specialty Clinic" },
    departments: ["ent"],
    distanceKm: 1.5,
    address: { zh: "台北市大安區永康街20號", en: "No.20 Yongkang St., Da'an Dist., Taipei" },
    isOpen: false,
    rating: 4.0,
  },
  {
    id: 4,
    name: { zh: "沐風皮膚科診所", en: "Mufeng Dermatology" },
    type: { zh: "專科診所", en: "Specialty Clinic" },
    departments: ["dermatology"],
    distanceKm: 0.9,
    address: { zh: "台北市信義區復興南路300號", en: "No.300 Fuxing S. Rd., Xinyi Dist., Taipei" },
    isOpen: true,
    rating: 4.7,
  },
  {
    id: 5,
    name: { zh: "禾順骨科醫院", en: "Heshun Orthopedic Hospital" },
    type: { zh: "專科醫院", en: "Specialty Hospital" },
    departments: ["orthopedics", "rehab"],
    distanceKm: 2.3,
    address: { zh: "台北市中正區忠孝東路10號", en: "No.10 Zhongxiao E. Rd., Zhongzheng Dist., Taipei" },
    isOpen: true,
    rating: 4.1,
  },
];

export default function HospitalSearch() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [favorites, setFavorites] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const recommendedDepts = useMemo(() => {
    const incoming = location.state?.departments;
    if (!Array.isArray(incoming)) return [];
    const filtered = incoming.filter((d) => DEPARTMENTS[d]);
    return Array.from(new Set(filtered));
  }, [location.state]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      if (Array.isArray(stored)) {
        setFavorites(stored);
      }
    } catch (err) {
      console.error("Failed to read favorites", err);
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (!recommendedDepts.length) return;
    setSelectedDept("all");
  }, [recommendedDepts]);

  const allDepartments = useMemo(() => ["all", ...Object.keys(DEPARTMENTS)], []);

  const filteredHospitals = useMemo(() => {
    const kw = keyword.toLowerCase();
    return HOSPITALS.filter((h) => {
      const name = getLocalizedText(h.name, language).toLowerCase();
      const address = getLocalizedText(h.address, language).toLowerCase();
      const deptText = h.departments
        .map((d) => DEPARTMENTS[d]?.[language] ?? d)
        .join(" ")
        .toLowerCase();

      const matchKeyword = !kw || name.includes(kw) || address.includes(kw) || deptText.includes(kw);
      const matchDept =
        selectedDept === "all"
          ? recommendedDepts.length === 0 || h.departments.some((d) => recommendedDepts.includes(d))
          : h.departments.includes(selectedDept);
      
      // 如果有推薦科別，只顯示符合推薦科別的院所
      const matchRecommended = 
        recommendedDepts.length === 0 || h.departments.some((d) => recommendedDepts.includes(d));
      
      return matchKeyword && matchDept && matchRecommended;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [keyword, selectedDept, language, recommendedDepts]);

  useEffect(() => {
    if (filteredHospitals.length === 0) return;
    try {
      const stored = JSON.parse(localStorage.getItem("search-history") || "[]");
      const base = Array.isArray(stored) ? stored : [];
      const incoming = filteredHospitals.map((h) => ({
        id: h.id,
        name: h.name,
        type: h.type,
        address: h.address,
      }));

      const mergedMap = new Map();
      base.forEach((item) => mergedMap.set(item.id, item));
      incoming.forEach((item) => mergedMap.set(item.id, item));

      const mergedList = Array.from(mergedMap.values()).slice(-10);
      localStorage.setItem("search-history", JSON.stringify(mergedList));
      window.dispatchEvent(new Event("search-history-updated"));
    } catch (err) {
      console.error("Failed to update search history", err);
    }
  }, [filteredHospitals]);

  const toggleFavorite = (hospital) => {
    const exists = favorites.some((h) => h.id === hospital.id);
    const updated = exists ? favorites.filter((h) => h.id !== hospital.id) : [...favorites, hospital];

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    showToast(exists ? t("toastFavRemoved") : t("toastFavAdded"));
  };

  const isFavorite = (id) => favorites.some((h) => h.id === id);

  return (
    <div className="search-wrapper">
      <button
        className={`menu-button ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="search-container">
        <button className="home-icon-btn" onClick={() => navigate("/")}>
          <img src={HomeIcon} alt="home" className="home-icon" />
        </button>

        <h2 className="search-title">{t("searchTitle")}</h2>

        <div className="search-controls">
          <input
            type="text"
            className="search-input"
            placeholder={t("searchPlaceholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          <select
            className="dept-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {allDepartments.map((d) => (
              <option key={d} value={d}>
                {d === "all" ? t("allDepartments") : DEPARTMENTS[d]?.[language] ?? d}
              </option>
            ))}
          </select>
        </div>

        <div className="hospital-list">
          {filteredHospitals.map((h) => (
            <div key={h.id} className="hospital-card">
              <div className="hospital-header">
                <div>
                  <h3 className="hospital-name">{getLocalizedText(h.name, language)}</h3>
                  <p className="hospital-type">{getLocalizedText(h.type, language)}</p>
                </div>

                <div className="hospital-right">
                  <div className="hospital-distance">{h.distanceKm.toFixed(1)} km</div>
                  <button
                    className={`fav-heart ${isFavorite(h.id) ? "active" : ""}`}
                    onClick={() => toggleFavorite(h)}
                    aria-label="toggle favorite"
                  >
                    {isFavorite(h.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <p className="hospital-address">{getLocalizedText(h.address, language)}</p>

              <div className="hospital-tags">
                {h.departments.map((d) => (
                  <span key={d} className="dept-tag">
                    {DEPARTMENTS[d]?.[language] ?? d}
                  </span>
                ))}
              </div>

              <div className="hospital-footer">
                <span className={`open-status ${h.isOpen ? "open" : "closed"}`}>
                  {h.isOpen ? t("openStatus") : t("closedStatus")}
                </span>
                <span className="rating">
                  {t("distance")} {h.distanceKm.toFixed(1)} km · {t("rating")} {h.rating.toFixed(1)}
                </span>
              </div>
            </div>
          ))}

          {filteredHospitals.length === 0 && <p className="no-result">{t("noResult")}</p>}
        </div>
      </div>
    </div>
  );
}
