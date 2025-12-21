import "./hospital.css";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import SideMenu from "../components/SideMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { DEPARTMENTS } from "../data/medicalConstants";
import { useToast } from "../contexts/ToastContext";
import homeIcon from "../assets/icons/home.svg";

const HOSPITALS = [
  {
    id: 1,
    name: { zh: "仁愛醫院", en: "Ren'ai Hospital" },
    type: { zh: "教學醫院", en: "Teaching Hospital" },
    departments: ["family", "internal", "ent", "cardiology", "dermatology", "ophthalmology", "infectious"],
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

const ChevronIcon = ({ direction = "down", className = "" }) => {
  const classes = [
    "chevron-icon",
    direction === "up" ? "chevron-up" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      viewBox="0 0 12 6"
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      <path
        d="M1 1.25 6 4.75 11 1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function HospitalSearch() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [expandedCards, setExpandedCards] = useState(() => new Set());
  const [overflowCards, setOverflowCards] = useState(() => new Set());
  const dropdownRef = useRef(null);
  const tagRefs = useRef(new Map());

  const navigate = useNavigate();
  const location = useLocation();
  const searchSource = location.state?.source === "nearby" ? "nearby" : "general";
  const locationDepartments = searchSource === "nearby" ? location.state?.departments : null;

  const recommendedDepts = useMemo(() => {
    if (searchSource !== "nearby" || !Array.isArray(locationDepartments)) return [];
    const filtered = locationDepartments.filter((d) => DEPARTMENTS[d]);
    return Array.from(new Set(filtered));
  }, [locationDepartments, searchSource]);

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
    setSelectedDepts((prev) => (prev.length ? prev : recommendedDepts));
  }, [recommendedDepts]);

  const departmentEntries = useMemo(() => Object.entries(DEPARTMENTS), []);

  const filteredDeptOptions = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    return departmentEntries.filter(([deptId, names]) => {
      const label = getLocalizedText(names, language).toLowerCase();
      return !q || label.includes(q);
    });
  }, [deptQuery, departmentEntries, language]);

  useEffect(() => {
    if (!deptDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setDeptDropdownOpen(false);
        setDeptQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [deptDropdownOpen]);

  const toggleDepartment = (deptId) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    );
  };

  const removeDepartment = (deptId) => {
    setSelectedDepts((prev) => prev.filter((d) => d !== deptId));
  };

  const handleDropdownToggle = () => {
    setDeptDropdownOpen((prev) => {
      const next = !prev;
      if (!next) {
        setDeptQuery("");
      }
      return next;
    });
  };

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
        selectedDepts.length === 0 || h.departments.some((d) => selectedDepts.includes(d));

      return matchKeyword && matchDept;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [keyword, selectedDepts, language]);

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

  const updateOverflowFlags = useCallback(() => {
    const next = new Set();
    tagRefs.current.forEach((node, id) => {
      if (!node) return;
      const children = Array.from(node.children);
      if (children.length === 0) return;
      const firstTop = children[0].offsetTop;
      const multiRow = children.some((child) => child.offsetTop - firstTop > 2);
      if (multiRow) {
        next.add(id);
      }
    });
    setOverflowCards(next);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(updateOverflowFlags);
    return () => cancelAnimationFrame(raf);
  }, [filteredHospitals, selectedDepts, language, updateOverflowFlags]);

  useEffect(() => {
    const handleResize = () => updateOverflowFlags();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateOverflowFlags]);

  useEffect(() => {
    setExpandedCards((prev) => {
      let mutated = false;
      const next = new Set(prev);
      prev.forEach((id) => {
        if (!overflowCards.has(id)) {
          next.delete(id);
          mutated = true;
        }
      });
      return mutated ? next : prev;
    });
  }, [overflowCards]);

  const toggleTagVisibility = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
        <button className="home-icon-btn" onClick={() => navigate("/")} aria-label="home">
          <img src={homeIcon} alt="" className="home-icon" aria-hidden="true" />
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

          <div className={`dept-multi-select ${deptDropdownOpen ? "open" : ""}`} ref={dropdownRef}>
            <button
              type="button"
              className="multi-select-input"
              onClick={handleDropdownToggle}
              aria-haspopup="listbox"
              aria-expanded={deptDropdownOpen}
            >
              <div className="multi-select-display">
                {selectedDepts.length === 0 ? (
                  <span className="placeholder">{t("deptMultiPlaceholder")}</span>
                ) : (
                  selectedDepts.map((dept) => (
                    <span key={dept} className="multi-pill">
                      {DEPARTMENTS[dept]?.[language] ?? dept}
                    </span>
                  ))
                )}
              </div>
              <span className="caret" aria-hidden="true">
                <ChevronIcon />
              </span>
            </button>

            {deptDropdownOpen && (
              <div className="multi-select-panel">
                <input
                  type="text"
                  className="multi-select-search"
                  placeholder={t("deptSearchPlaceholder")}
                  value={deptQuery}
                  onChange={(e) => setDeptQuery(e.target.value)}
                />

                <div className="multi-select-options" role="listbox" aria-multiselectable="true">
                  {filteredDeptOptions.length === 0 && (
                    <p className="multi-select-empty">{t("deptNoMatch")}</p>
                  )}
                  {filteredDeptOptions.map(([deptId, names]) => (
                    <label key={deptId} className="multi-option">
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(deptId)}
                        onChange={() => toggleDepartment(deptId)}
                      />
                      <span>{getLocalizedText(names, language)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedDepts.length > 0 && (
          <div className="selected-dept-tags">
            {selectedDepts.map((dept) => {
              const label = DEPARTMENTS[dept]?.[language] ?? dept;
              return (
                <span key={dept} className="dept-chip">
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => removeDepartment(dept)}
                    aria-label={`${t("remove")} ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="hospital-list">
          {filteredHospitals.map((h) => (
            <div key={h.id} className="hospital-card">
              <div className="hospital-header">
                <div>
                  <h3 className="hospital-name">{getLocalizedText(h.name, language)}</h3>
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

              <div className="hospital-tag-row">
                <div
                  className={`hospital-tags ${
                    overflowCards.has(h.id) && !expandedCards.has(h.id) ? "collapsed" : ""
                  }`}
                  ref={(el) => {
                    if (el) {
                      tagRefs.current.set(h.id, el);
                    } else {
                      tagRefs.current.delete(h.id);
                    }
                  }}
                >
                  {h.departments.map((d) => (
                    <span key={d} className="dept-tag">
                      {DEPARTMENTS[d]?.[language] ?? d}
                    </span>
                  ))}
                </div>
                {overflowCards.has(h.id) && (
                  <button
                    type="button"
                    className="tag-toggle"
                    onClick={() => toggleTagVisibility(h.id)}
                    aria-label={expandedCards.has(h.id) ? t("tagsCollapse") : t("tagsExpand")}
                    aria-expanded={expandedCards.has(h.id)}
                  >
                    <ChevronIcon direction={expandedCards.has(h.id) ? "up" : "down"} />
                  </button>
                )}
              </div>

            </div>
          ))}

          {filteredHospitals.length === 0 && <p className="no-result">{t("noResult")}</p>}
        </div>
      </div>
    </div>
  );
}
