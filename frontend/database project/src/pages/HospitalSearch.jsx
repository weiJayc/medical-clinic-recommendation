import "./hospital.css";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import SideMenu from "../components/SideMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import homeIcon from "../assets/icons/home.svg";

const FALLBACK_DEPTS = [
  { zh: "內科", en: "Internal Medicine" },
  { zh: "家庭醫學科", en: "Family Medicine" },
  { zh: "感染科", en: "Infectious Diseases" },
  { zh: "過敏免疫風濕科", en: "Allergy / Immunology / Rheumatology" },
  { zh: "耳鼻喉科", en: "ENT / Otolaryngology" },
  { zh: "神經內科", en: "Neurology" },
  { zh: "心臟內科", en: "Cardiology" },
  { zh: "血液科", en: "Hematology" },
  { zh: "兒科", en: "Pediatrics" },
  { zh: "腸胃內科", en: "Gastroenterology" },
  { zh: "皮膚科", en: "Dermatology" },
  { zh: "眼科", en: "Ophthalmology" },
  { zh: "新陳代謝科", en: "Endocrinology / Metabolism" },
  { zh: "牙醫一般科", en: "General Dentistry" },
  { zh: "精神科", en: "Psychiatry" },
  { zh: "復健科", en: "Physical Medicine & Rehabilitation" },
  { zh: "胸腔內科", en: "Pulmonology" },
  { zh: "外科", en: "General Surgery" },
  { zh: "婦產科", en: "Obstetrics & Gynecology" },
  { zh: "直腸外科", en: "Colorectal Surgery" },
  { zh: "泌尿科", en: "Urology" },
  { zh: "腎臟科", en: "Nephrology" },
  { zh: "神經科", en: "Neurology (General)" },
  { zh: "整形外科", en: "Plastic Surgery" },
  { zh: "骨科", en: "Orthopedics" },
  { zh: "心臟血管外科", en: "Cardiovascular Surgery" },
  { zh: "疼痛控制科", en: "Pain Management" },
  { zh: "解剖病理科", en: "Anatomic Pathology" },
  { zh: "放射診斷科", en: "Diagnostic Radiology" },
  { zh: "急診醫學科", en: "Emergency Medicine" },
  { zh: "臨床病理科", en: "Clinical Pathology" },
  { zh: "中醫一般科", en: "Traditional Chinese Medicine" },
  { zh: "西醫一般科", en: "Western Medicine (General)" },
  { zh: "放射種瘤科", en: "Radiation Oncology" },
  { zh: "麻醉科", en: "Anesthesiology" },
  { zh: "職業醫學科", en: "Occupational Medicine" },
  { zh: "核子醫學科", en: "Nuclear Medicine" },
  { zh: "其他", en: "Other" },
].map((name) => ({ id: name.zh, name }));

function normalizeProvider(p) {
  const normalizedName =
    typeof p.name === "string" ? { zh: p.name, en: p.name } : p.name ?? { zh: "", en: "" };
  const normalizedAddress =
    typeof p.address === "string" ? { zh: p.address, en: p.address } : p.address ?? { zh: "", en: "" };
  const deptName =
    typeof p.specialty_name === "string"
      ? { zh: p.specialty_name, en: p.specialty_name }
      : p.specialty_name
        ? { zh: p.specialty_name.zh ?? "", en: p.specialty_name.en ?? p.specialty_name.zh ?? "" }
        : null;

  return {
    id: p.provider_code ?? p.id ?? `${p.name}-${p.address}`,
    name: normalizedName,
    address: normalizedAddress,
    specialty_id: p.specialty_id ?? null,
    specialty_name: deptName,
    distanceKm: (() => {
      if (typeof p.distance_km === "number") return p.distance_km;
      const n = parseFloat(p.distance_km);
      return Number.isFinite(n) ? n : null;
    })(),
    phone: p.phone ?? "",
  };
}

export default function HospitalSearch() {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const providersBySpecialty = location.state?.providersBySpecialty || [];
  const specialtiesFromState = location.state?.specialties || [];
  const recommendDepartments = location.state?.recommendDepartments || [];

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState(() => new Set());
  const [overflowCards, setOverflowCards] = useState(() => new Set());
  const dropdownRef = useRef(null);
  const tagRefs = useRef(new Map());
  const fallbackDeptMap = useMemo(() => new Map(FALLBACK_DEPTS.map((d) => [d.id, d.name])), []);

  const flattenedProviders = useMemo(() => {
    const list = [];
    providersBySpecialty.forEach((group) => {
      (group.providers || []).forEach((p) => list.push(normalizeProvider(p)));
    });
    return list;
  }, [providersBySpecialty]);

  const departments = useMemo(() => {
    const fromProviders = flattenedProviders
      .filter((p) => p.specialty_id)
      .map((p) => ({
        id: p.specialty_id,
        name: typeof p.specialty_name === "string" ? { zh: p.specialty_name, en: p.specialty_name } : p.specialty_name,
      }));
    const fromState = (specialtiesFromState || []).map((s) => ({
      id: s.specialty_id,
      name:
        typeof s.specialty_name === "string"
          ? { zh: s.specialty_name, en: s.specialty_name }
          : s.specialty_name ?? { zh: "", en: "" },
    }));
    const merged = [...fromProviders, ...fromState];
    const uniq = new Map();
    merged.forEach((d) => {
      if (d.id && !uniq.has(d.id)) uniq.set(d.id, d);
    });
    const list = Array.from(uniq.values());

    const existingNamesZh = new Set(
      list
        .map((d) => getLocalizedText(d.name, "zh"))
        .filter(Boolean)
        .map((s) => s.trim()),
    );

    FALLBACK_DEPTS.forEach((fd) => {
      const label = getLocalizedText(fd.name, "zh").trim();
      if (!existingNamesZh.has(label)) {
        list.push(fd);
        existingNamesZh.add(label);
      }
    });

    return list;
  }, [flattenedProviders, specialtiesFromState]);

  useEffect(() => {
    if (!recommendDepartments.length || !departments.length) return;
    setSelectedDepts((prev) => {
      if (prev.length) return prev;
      const lowerNames = recommendDepartments.map((d) => d.toLowerCase());
      const matchedIds = departments
        .filter((d) => {
          const zh = getLocalizedText(d.name, "zh").toLowerCase();
          const en = getLocalizedText(d.name, "en").toLowerCase();
          return lowerNames.some((r) => r === zh || r === en);
        })
        .map((d) => d.id);
      return matchedIds.length ? matchedIds : prev;
    });
  }, [recommendDepartments, departments]);

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
    if (!flattenedProviders.length) return;
    try {
      const stored = JSON.parse(localStorage.getItem("search-history") || "[]");
      const base = Array.isArray(stored) ? stored : [];
      const incoming = flattenedProviders.slice(0, 10).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
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
  }, [flattenedProviders]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return flattenedProviders
      .filter((p) => {
        const name = getLocalizedText(p.name, language).toLowerCase();
        const address = getLocalizedText(p.address, language).toLowerCase();
        const matchKeyword = !kw || name.includes(kw) || address.includes(kw);
        const deptLabelZh = getLocalizedText(p.specialty_name, "zh").toLowerCase();
        const deptLabelEn = getLocalizedText(p.specialty_name, "en").toLowerCase();
        const matchDept =
          !selectedDepts.length ||
          (p.specialty_id != null && selectedDepts.includes(p.specialty_id)) ||
          selectedDepts.some((d) => {
            const s = String(d).toLowerCase();
            return s === deptLabelZh || s === deptLabelEn;
          });
        return matchKeyword && matchDept;
      })
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [flattenedProviders, keyword, selectedDepts, language]);

  const toggleFavorite = (provider) => {
    const exists = favorites.some((h) => h.id === provider.id);
    const updated = exists ? favorites.filter((h) => h.id !== provider.id) : [...favorites, provider];
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    showToast(exists ? t("toastFavRemoved") : t("toastFavAdded"));
  };

  const isFavorite = (id) => favorites.some((h) => h.id === id);

  const renderDistance = (p) => {
    if (typeof p.distanceKm === "number") return `${p.distanceKm.toFixed(2)} km`;
    return t("distance");
  };

  const handleDropdownToggle = () => {
    setDeptDropdownOpen((prev) => {
      const next = !prev;
      if (!next) setDeptQuery("");
      return next;
    });
  };

  const toggleDepartment = (deptId) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId],
    );
  };

  const removeDepartment = (deptId) => {
    setSelectedDepts((prev) => prev.filter((d) => d !== deptId));
  };

  const departmentEntries = useMemo(() => departments.map((d) => [d.id, d.name]), [departments]);

  const getDeptLabel = useCallback(
    (value) => {
      if (!value) return "";
      if (typeof value === "string") {
        const fallback = fallbackDeptMap.get(value);
        if (fallback) return getLocalizedText(fallback, language);
        return value;
      }
      // value is an object with zh/en; if en 缺或等於 zh，嘗試用 fallback 對照
      const text = getLocalizedText(value, language);
      if (language === "en") {
        const zhText = getLocalizedText(value, "zh");
        const fallback = fallbackDeptMap.get(zhText);
        if (fallback) return getLocalizedText(fallback, "en");
      }
      return text;
    },
    [language, fallbackDeptMap],
  );

  const filteredDeptOptions = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    return departmentEntries.filter(([, name]) => {
      const label = getDeptLabel(name).toLowerCase();
      return !q || label.includes(q);
    });
  }, [deptQuery, departmentEntries, getDeptLabel]);

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

  const updateOverflowFlags = useCallback(() => {
    const next = new Set();
    tagRefs.current.forEach((node, id) => {
      if (!node) return;
      const children = Array.from(node.children);
      if (!children.length) return;
      const firstTop = children[0].offsetTop;
      const multiRow = children.some((child) => child.offsetTop - firstTop > 2);
      if (multiRow) next.add(id);
    });
    setOverflowCards(next);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(updateOverflowFlags);
    return () => cancelAnimationFrame(raf);
  }, [filtered, selectedDepts, language, updateOverflowFlags]);

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
                  selectedDepts.map((deptId) => {
                    const entry = departments.find((d) => d.id === deptId);
                    return (
                      <span key={deptId} className="multi-pill">
                        {entry ? getDeptLabel(entry.name) : getDeptLabel(deptId)}
                      </span>
                    );
                  })
                )}
              </div>
              <span className="caret" aria-hidden="true">
                <svg className="chevron-icon" viewBox="0 0 12 6" role="presentation" focusable="false">
                  <path
                    d="M1 1.25 6 4.75 11 1.25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
                      <span>{getDeptLabel(names)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedDepts.length > 0 && (
          <div className="selected-dept-tags">
            {selectedDepts.map((deptId) => {
              const entry = departments.find((d) => d.id === deptId);
              const label = entry ? getDeptLabel(entry.name) : getDeptLabel(deptId);
              return (
                <span key={deptId} className="dept-chip">
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => removeDepartment(deptId)}
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
          {filtered.map((p) => (
            <div key={p.id} className="hospital-card">
              <div className="hospital-header">
                <div>
                  <h3 className="hospital-name">{getLocalizedText(p.name, language)}</h3>
                  {p.specialty_name && (
                    <p className="hospital-type">{getDeptLabel(p.specialty_name)}</p>
                  )}
                </div>

                <div className="hospital-right">
                  <div className="hospital-distance">{renderDistance(p)}</div>
                  <button
                    className={`fav-heart ${isFavorite(p.id) ? "active" : ""}`}
                    onClick={() => toggleFavorite(p)}
                    aria-label="toggle favorite"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      role="img"
                      aria-hidden="true"
                      className="heart-icon"
                    >
                      <path
                        d="M12.002 20.562c-.263 0-.524-.095-.727-.285l-5.7-5.397C3.12 12.6 2 10.63 2 8.474 2 6.05 3.94 4 6.318 4c1.46 0 2.865.72 3.684 1.88l.998 1.4.998-1.4C12.818 4.72 14.223 4 15.683 4 18.06 4 20 6.049 20 8.474c0 2.156-1.12 4.126-3.575 6.406l-5.696 5.397c-.203.19-.464.285-.727.285Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="hospital-address">{getLocalizedText(p.address, language)}</p>
              {p.phone && <p className="hospital-type">{p.phone}</p>}

              <div className="hospital-tag-row">
                <div
                  className={`hospital-tags ${
                    overflowCards.has(p.id) && !expandedCards.has(p.id) ? "collapsed" : ""
                  }`}
                  ref={(el) => {
                    if (el) {
                      tagRefs.current.set(p.id, el);
                    } else {
                      tagRefs.current.delete(p.id);
                    }
                  }}
                >
                  {p.specialty_name && (
                    <span className="dept-tag">{getDeptLabel(p.specialty_name)}</span>
                  )}
                </div>
                {overflowCards.has(p.id) && (
                  <button
                    type="button"
                    className="tag-toggle"
                    onClick={() => toggleTagVisibility(p.id)}
                    aria-label={expandedCards.has(p.id) ? t("tagsCollapse") : t("tagsExpand")}
                    aria-expanded={expandedCards.has(p.id)}
                  >
                    <svg
                      className={`chevron-icon ${expandedCards.has(p.id) ? "chevron-up" : ""}`}
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
                  </button>
                )}
              </div>
            </div>
          ))}

          {!flattenedProviders.length && <p className="no-result">{t("noResult")}</p>}

          {flattenedProviders.length > 0 && filtered.length === 0 && (
            <p className="no-result">{t("noResult")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
