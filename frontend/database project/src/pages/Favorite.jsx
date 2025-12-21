import "./favorite.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SideMenu from "../components/SideMenu";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";

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
        <span className="home-icon" aria-hidden="true">🏠︎</span>
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
            favorites.map((h) => (
              <div key={h.id} className="fav-card">
                <div className="fav-header">
                  <h3>{getLocalizedText(h.name, language)}</h3>
                  {isEditing && (
                    <button className="remove-btn" onClick={() => removeFavorite(h.id)}>
                      {t("remove")}
                    </button>
                  )}
                </div>
                <p>{getLocalizedText(h.type, language)}</p>
                <p>{getLocalizedText(h.address, language)}</p>
                <div className="fav-footer">
                  <span>
                    {t("distance")} {h.distanceKm} km
                  </span>
                  <span>
                    {t("rating")} {h.rating}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
