import "./sideMenu.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLocalizedText, useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";

export default function SideMenu({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { t, languageLabel, toggleLanguage, language } = useLanguage();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);

  const handleNavigate = (path, options) => {
    navigate(path, options);
    onClose?.();
  };

  const loadHistory = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("search-history") || "[]");
      setHistory(Array.isArray(stored) ? stored : []);
    } catch (err) {
      console.error("Failed to load search history", err);
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
    const handler = () => loadHistory();
    window.addEventListener("search-history-updated", handler);
    return () => window.removeEventListener("search-history-updated", handler);
  }, []);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen]);

  const handleToggleLanguage = () => {
    const switchingToZh = language === "en";
    toggleLanguage();
    showToast(switchingToZh ? t("toastLanguageZh") : t("toastLanguageEn"));
  };

  return (
    <>
      {isOpen && <div className="backdrop" onClick={onClose}></div>}

      <div className={`side-menu ${isOpen ? "open" : ""}`}>
        <h2 className="menu-title">{t("menuTitle")}</h2>

        <ul className="menu-list">
          <li>
            <button
              type="button"
              className="menu-link"
              onClick={() => handleNavigate("/search", { state: { source: "general" } })}
            >
              {t("searchHospital")}
            </button>
          </li>
          <li>
            <button type="button" className="menu-link" onClick={() => handleNavigate("/favorite")}>
              {t("menuFavorite")}
            </button>
          </li>
          <li>
            <button type="button" className="menu-link" onClick={handleToggleLanguage}>
              {t("menuLanguage")} ({languageLabel})
            </button>
          </li>
        </ul>

        <div className="history-section">
          <h3 className="history-title">{t("historyTitle")}</h3>
          {history.length === 0 ? (
            <p className="history-empty">{t("historyEmpty")}</p>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.id} className="history-item">
                  <span className="history-name">{getLocalizedText(item.name, language)}</span>
                  <span className="history-type">{getLocalizedText(item.type, language)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
