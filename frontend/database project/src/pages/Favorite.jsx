import "./hospital.css";
import "./favorite.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SideMenu from "../components/SideMenu";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import homeIcon from "../assets/icons/home.svg";

const normalizeField = (value) => {
  if (!value) return { zh: "", en: "" };
  return typeof value === "string" ? { zh: value, en: value } : value;
};

const normalizeHospital = (h) => ({
  id: h.id,
  name: normalizeField(h.name),
  type: normalizeField(h.type),
  address: normalizeField(h.address),
  distanceKm: h.distanceKm ?? "",
  rating: h.rating ?? "",
});

export default function Favorite() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [favorites, setFavorites] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      if (Array.isArray(stored)) {
        setFavorites(stored.map((h) => normalizeHospital(h)));
      } else {
        setFavorites([]);
      }
    } catch (e) {
      console.error("Failed to parse favorites", e);
      setFavorites([]);
    }
  }, []);

  const formatMetric = (value, digits = 1) => {
    if (value === null || value === undefined || value === "") return "--";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toFixed(digits);
  };

  const removeFavorite = (id) => {
    const updated = favorites.filter((h) => h.id !== id);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    showToast(t("toastRemoveFav"));
  };

  return (
    <div className="fav-page">
      <button
        className={`menu-button ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <button className="home-icon-btn" onClick={() => navigate("/")} aria-label="home">
        <img src={homeIcon} alt="" className="home-icon" aria-hidden="true" />
      </button>

      <div className="fav-wrapper">
        <div className="fav-topbar">
          <h2 className="fav-title">{t("favoriteTitle")}</h2>

          <div className="fav-right-actions">
            {!isEditing && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                {t("edit")}
              </button>
            )}
            {isEditing && (
              <button className="done-btn" onClick={() => setIsEditing(false)}>
                {t("done")}
              </button>
            )}
          </div>
        </div>

        <div className="fav-list">
          {favorites.length === 0 ? (
            <p className="no-fav">{t("noFavorite")}</p>
          ) : (
            favorites.map((h) => {
              const distance = formatMetric(h.distanceKm);
              return (
                <div key={h.id} className="hospital-card fav-card">
                  <div className="hospital-header">
                    <div>
                      <h3 className="hospital-name">{getLocalizedText(h.name, language)}</h3>
                    </div>
                    <div className="hospital-right">
                      {distance !== "--" && (
                        <div className="hospital-distance">{distance} km</div>
                      )}
                      {isEditing && (
                        <button className="remove-btn" onClick={() => removeFavorite(h.id)}>
                          {t("remove")}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="hospital-address">{getLocalizedText(h.address, language)}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
