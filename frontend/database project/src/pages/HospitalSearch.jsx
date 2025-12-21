import "./hospital.css";
import { useEffect, useMemo, useState } from "react";
import SideMenu from "../components/SideMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import homeIcon from "../assets/icons/home.svg";

function normalizeProvider(p) {
  return {
    id: p.provider_code ?? p.id ?? `${p.name}-${p.address}`,
    name: { zh: p.name ?? "", en: p.name ?? "" },
    address: { zh: p.address ?? "", en: p.address ?? "" },
    specialty_id: p.specialty_id ?? null,
    specialty_name: p.specialty_name ?? "",
    distanceKm: (() => {
      if (typeof p.distance_km === "number") return p.distance_km;
      const n = parseFloat(p.distance_km);
      return Number.isFinite(n) ? n : null;
    })(),
    phone: p.phone ?? "",
  };
}

export default function HospitalSearch() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const providersBySpecialty = location.state?.providersBySpecialty || [];
  const specialtiesFromState = location.state?.specialties || [];
  const recommendDepartments = location.state?.recommendDepartments || [];

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selectedDept, setSelectedDept] = useState("all");

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
      .map((p) => ({ id: p.specialty_id, name: p.specialty_name }));
    const fromState = (specialtiesFromState || []).map((s) => ({
      id: s.specialty_id,
      name: s.specialty_name,
    }));
    const merged = [...fromProviders, ...fromState];
    const uniq = new Map();
    merged.forEach((d) => {
      if (d.id && !uniq.has(d.id)) uniq.set(d.id, d);
    });
    return Array.from(uniq.values());
  }, [flattenedProviders, specialtiesFromState]);

  useEffect(() => {
    if (recommendDepartments.length && departments.length && selectedDept === "all") {
      const match = departments.find((d) =>
        recommendDepartments.some((r) => r.toLowerCase() === d.name.toLowerCase()),
      );
      if (match) setSelectedDept(match.id);
    }
  }, [recommendDepartments, departments, selectedDept]);

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
        const name = (p.name?.zh || p.name?.en || "").toLowerCase();
        const address = (p.address?.zh || p.address?.en || "").toLowerCase();
        const matchKeyword = !kw || name.includes(kw) || address.includes(kw);
        const matchDept = selectedDept === "all" || p.specialty_id === selectedDept;
        return matchKeyword && matchDept;
      })
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [flattenedProviders, keyword, selectedDept]);

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

          <select
            className="dept-select"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">{t("allDepartments")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {recommendDepartments.length > 0 && (
          <div className="selected-dept-tags">
            {recommendDepartments.map((d) => (
              <span key={d} className="dept-chip">
                <span>{d}</span>
              </span>
            ))}
          </div>
        )}

        <div className="hospital-list">
          {filtered.map((p) => (
            <div key={p.id} className="hospital-card">
              <div className="hospital-header">
                <div>
                  <h3 className="hospital-name">{p.name.zh || p.name.en}</h3>
                  {p.specialty_name && <p className="hospital-type">{p.specialty_name}</p>}
                </div>

                <div className="hospital-right">
                  <div className="hospital-distance">{renderDistance(p)}</div>
                  <button
                    className={`fav-heart ${isFavorite(p.id) ? "active" : ""}`}
                    onClick={() => toggleFavorite(p)}
                    aria-label="toggle favorite"
                  >
                    {isFavorite(p.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <p className="hospital-address">{p.address.zh || p.address.en}</p>
              {p.phone && <p className="hospital-type">{p.phone}</p>}
            </div>
          ))}

          {!flattenedProviders.length && (
            <p className="no-result">
              {t("noResult")} — {t("homeTitle")} → {t("aiAnalyze")} 再試一次吧
            </p>
          )}

          {flattenedProviders.length > 0 && filtered.length === 0 && (
            <p className="no-result">{t("noResult")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
