import { createContext, useContext, useEffect, useMemo, useState } from "react";

const translations = {
  zh: {
    menuTitle: "功能選單",
    menuFavorite: "我的收藏",
    menuLanguage: "語言",
    historyTitle: "歷史紀錄",
    historyEmpty: "尚無搜尋紀錄",
    languageName: "中文",
    homeTitle: "AI 症狀分析",
    symptomPlaceholder: "請簡要描述您的症狀，例如流鼻水、咳嗽、發燒",
    send: "送出",
    aiAnalyze: "AI 幫我分析",
    searchHospital: "醫院/診所搜尋",
    requiredSymptom: "請輸入症狀，例如流鼻水、發燒、咳嗽",
    deptSuggestion: "建議就診科別",
    possibleDisease: "可能相關的病症（僅供參考）",
    analysisNote: "結果僅供參考，請諮詢專業醫師",
    analysisSearch: "附近可以就診的地方",
    searchTitle: "醫院 / 診所搜尋",
    searchPlaceholder: "輸入醫院、診所名稱或關鍵字",
    allDepartments: "全部科別",
    deptMultiPlaceholder: "選擇科別 (可複選)",
    deptSearchPlaceholder: "輸入關鍵字搜尋科別",
    deptNoMatch: "沒有找到相符的科別",
    noResult: "找不到符合的醫院/診所，試試其他關鍵字或科別",
    tagsExpand: "展開科別",
    tagsCollapse: "收合科別",
    favoriteTitle: "我的收藏",
    edit: "編輯",
    done: "完成",
    noFavorite: "目前沒有收藏的醫療院所",
    remove: "移除",
    distance: "距離",
    toastAnalysisReady: "分析完成",
    toastFavAdded: "已加入收藏",
    toastFavRemoved: "已移除收藏",
    toastRemoveFav: "已刪除收藏",
    toastLanguageZh: "已切換為中文",
    toastLanguageEn: "已切換為英文",
  },
  en: {
    menuTitle: "Menu",
    menuFavorite: "My Favorites",
    menuLanguage: "Language",
    historyTitle: "History",
    historyEmpty: "No search history yet.",
    languageName: "English",
    homeTitle: "AI Symptom Analysis",
    symptomPlaceholder: "Briefly describe your symptom: runny nose, cough, fever",
    send: "Send",
    aiAnalyze: "Analyze with AI",
    searchHospital: "Search Hospitals",
    requiredSymptom: "Please enter a symptom, e.g., runny nose, fever, cough",
    deptSuggestion: "Recommended Departments",
    possibleDisease: "Possible related conditions (for reference)",
    analysisNote: "Result is for reference only; please consult a physician.",
    analysisSearch: "Find nearby care",
    searchTitle: "Hospital / Clinic Search",
    searchPlaceholder: "Enter hospital, clinic name or keywords",
    allDepartments: "All departments",
    deptMultiPlaceholder: "Select departments (multi-select)",
    deptSearchPlaceholder: "Type to search departments",
    deptNoMatch: "No matching departments",
    noResult: "No matches. Try a different keyword or department.",
    tagsExpand: "Show all departments",
    tagsCollapse: "Show fewer departments",
    favoriteTitle: "My Favorites",
    edit: "Edit",
    done: "Done",
    noFavorite: "No saved facilities yet.",
    remove: "Remove",
    distance: "Distance",
    toastAnalysisReady: "Analysis ready",
    toastFavAdded: "Added to favorites",
    toastFavRemoved: "Removed from favorites",
    toastRemoveFav: "Favorite deleted",
    toastLanguageZh: "Switched to Chinese",
    toastLanguageEn: "Switched to English",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("app-language");
    return saved === "en" || saved === "zh" ? saved : "zh";
  });

  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "zh" ? "en" : "zh"));
  };

  const value = useMemo(() => {
    const t = (key) => translations[language]?.[key] ?? key;
    return {
      language,
      setLanguage,
      toggleLanguage,
      t,
      languageLabel: language === "zh" ? "中文" : "English",
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export function getLocalizedText(field, language) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (field[language]) return field[language];
  return field.zh ?? "";
}
