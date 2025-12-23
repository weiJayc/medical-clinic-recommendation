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

const filterAddressForMaps = (addressText) => {
  const text = String(addressText || "").trim();
  if (!text) return "";

  const numberMatch = text.match(/^(.*?[0-9０-９]+)\s*號/);
  if (numberMatch) return `${numberMatch[1]}號`;

  const haoMatch = text.match(/^(.*?號)/);
  if (haoMatch) return haoMatch[1];

  return text;
};

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

  const openHospitalInGoogleMaps = (hospital) => {
    const addressText = String(
      getLocalizedText(hospital?.address, language) ||
      getLocalizedText(hospital?.address, "zh") ||
      getLocalizedText(hospital?.address, "en") ||
      "",
    ).trim();

    const filteredAddress = filterAddressForMaps(addressText);
    if (!filteredAddress) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(filteredAddress)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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

      <button className="home-icon-btn" type="button" onClick={() => navigate("/")} aria-label="home">
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
              return (
                <div
                  key={h.id}
                  className="hospital-card fav-card clickable"
                  role="link"
                  tabIndex={0}
                  aria-label={`${getLocalizedText(h.name, language)} ${getLocalizedText(h.address, language)}`}
                  onClick={() => openHospitalInGoogleMaps(h)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    openHospitalInGoogleMaps(h);
                  }}
                >
                  <div className="hospital-header">
                    <div>
                      <h3 className="hospital-name">{getLocalizedText(h.name, language)}</h3>
                    </div>
                    <div className="hospital-right">
                      {isEditing && (
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFavorite(h.id);
                          }}
                        >
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
