import "./hospital.css";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import SideMenu from "../components/SideMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, getLocalizedText } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import { getJson } from "../utils/api";
import homeIcon from "../assets/icons/home.svg";

const normalizeId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};

async function getGeolocationSafe() {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}

function normalizeProvider(p) {
  const rawSpecialtyId = p.specialty_id ?? p.specialtyid;
  const specialtyId = (() => {
    const n = Number(rawSpecialtyId);
    return Number.isFinite(n) ? n : rawSpecialtyId ?? null;
  })();
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
  const resolvedDeptName =
    deptName || (specialtyId != null ? { zh: String(specialtyId), en: String(specialtyId) } : null);

  return {
    id: p.provider_code ?? p.id ?? `${p.name}-${p.address}`,
    name: normalizedName,
    address: normalizedAddress,
    specialty_id: specialtyId,
    specialty_name: resolvedDeptName,
    specialties: Array.isArray(p.specialties)
      ? p.specialties.map((s) => ({
          id: normalizeId(s.specialty_id ?? s.id ?? s.specialtyid),
          name:
            typeof s.specialty_name === "string"
              ? { zh: s.specialty_name, en: s.specialty_name }
              : s.specialty_name ?? { zh: "", en: "" },
        }))
      : resolvedDeptName
        ? [{ id: specialtyId, name: resolvedDeptName }]
        : [],
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

  const emptyProvidersRef = useRef([]);
  const providersFromState = location.state?.providersBySpecialty ?? emptyProvidersRef.current;
  const specialtiesFromState = location.state?.specialties || [];
  const recommendDepartments = location.state?.recommendDepartments || [];

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [specialtiesFromApi, setSpecialtiesFromApi] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState(() => new Set());
  const [overflowCards, setOverflowCards] = useState(() => new Set());
  const [providersBySpecialtyState, setProvidersBySpecialtyState] = useState(providersFromState);
  const [providersCache, setProvidersCache] = useState(() => {
    const map = new Map();
    (providersFromState || []).forEach((g) => {
      const sid = normalizeId(g.specialty_id);
      map.set(sid, { ...g, specialty_id: sid, providers: g.providers || [] });
    });
    console.log("[Search] init providersCache from state", map);
    return map;
  });
  const [coords, setCoords] = useState(null);
  const [loadingDeptIds, setLoadingDeptIds] = useState([]);
  const dropdownRef = useRef(null);
  const tagRefs = useRef(new Map());
  const fetchedDeptIds = useRef(new Set());
  const initialPrefetchDone = useRef(false);
  const selectedDeptSet = useMemo(() => new Set(selectedDepts.map((d) => normalizeId(d))), [selectedDepts]);
  const trimmedKeyword = keyword.trim();

  const flattenedProviders = useMemo(() => {
    const list = [];
    providersCache.forEach((group) => {
      (group.providers || []).forEach((p) => list.push(normalizeProvider(p)));
    });
    return list;
  }, [providersCache]);

  const departments = useMemo(() => {
    const fromProviders = flattenedProviders
      .filter((p) => p.specialty_id)
      .map((p) => ({
        id: normalizeId(p.specialty_id),
        name: typeof p.specialty_name === "string" ? { zh: p.specialty_name, en: p.specialty_name } : p.specialty_name,
      }));
    const fromState = (specialtiesFromState || []).map((s) => ({
      id: normalizeId(s.specialty_id),
      name:
        typeof s.specialty_name === "string"
          ? { zh: s.specialty_name, en: s.specialty_name }
          : s.specialty_name ?? { zh: "", en: "" },
    }));
    const fromApi = specialtiesFromApi.map((s) => ({
      id: normalizeId(s.specialty_id),
      name: { zh: s.specialty_name, en: s.specialty_name },
    }));

    const merged = [...fromProviders, ...fromState, ...fromApi];
    const uniq = new Map();
    merged.forEach((d) => {
      if (d.id && !uniq.has(d.id)) {
        uniq.set(d.id, d);
      }
    });
    return Array.from(uniq.values());
  }, [flattenedProviders, specialtiesFromState, specialtiesFromApi]);

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
        .map((d) => normalizeId(d.id));
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

  useEffect(() => {
    getJson("/api/specialties")
      .then((res) => {
        if (Array.isArray(res?.data)) {
          setSpecialtiesFromApi(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load specialties", err);
      });
  }, []);

  useEffect(() => {
    if (!providersFromState || !providersFromState.length) return;
    fetchedDeptIds.current.clear();
    const next = new Map();
    providersFromState.forEach((g) => {
      const sid = normalizeId(g.specialty_id);
      next.set(sid, { ...g, specialty_id: sid, providers: g.providers || [] });
    });
    console.log("[Search] state providers updated", next);
    setProvidersBySpecialtyState(providersFromState);
    setProvidersCache(next);
  }, [providersFromState]);

  useEffect(() => {
    if (!trimmedKeyword) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({ q: trimmedKeyword });
      if (coords?.lat != null && coords?.lng != null) {
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
      }
      getJson(`/api/providers/search?${params.toString()}`)
        .then((res) => {
          if (cancelled) return;
          const providers = Array.isArray(res?.data) ? res.data : [];
          setSearchResults(providers.map((p) => normalizeProvider(p)));
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("search providers failed", err);
          showToast(err.message || "Failed to search providers");
          setSearchResults([]);
        })
        .finally(() => {
          if (cancelled) return;
          setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmedKeyword, showToast, coords]);

  const ensureCoords = useCallback(async () => {
    if (coords) return coords;
    const next = await getGeolocationSafe();
    if (!next) {
      throw new Error(t("locationUnavailable") || "請允許定位以搜尋附近診所");
    }
    setCoords(next);
    return next;
  }, [coords, t]);

  useEffect(() => {
    ensureCoords().catch((err) => {
      console.error("prefetch geolocation failed", err);
      showToast(err.message || "無法取得定位，部分功能將受限");
    });
  }, [ensureCoords, showToast]);

  const fetchNearbyBySpecialty = useCallback(
    async (deptId) => {
      const numericId = Number(deptId);
      if (!Number.isFinite(numericId)) return;
      if (loadingDeptIds.includes(numericId)) return;

      setLoadingDeptIds((prev) => [...prev, numericId]);
      try {
        const currentCoords = await ensureCoords();
        const params = new URLSearchParams({
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          specialty_id: String(numericId),
        });
        console.log("[Search] fetching nearby", { numericId, params: params.toString() });
        const data = await getJson(`/api/providers/nearby-by-specialty?${params.toString()}`);
        const providers = Array.isArray(data?.data) ? data.data : [];
        const specialtyEntry = departments.find((d) => d.id === deptId);
        const specialtyName = specialtyEntry?.name ?? deptId;

        setProvidersCache((prev) => {
          const next = new Map(prev);
          next.set(numericId, {
            specialty_id: numericId,
            specialty_name: specialtyName,
            providers,
          });
          console.log("[Search] cache updated", { numericId, count: providers.length });
          return next;
        });
      } catch (err) {
        console.error("fetch nearby failed", err);
        showToast(err.message || "Failed to fetch nearby providers");
      } finally {
        setLoadingDeptIds((prev) => prev.filter((id) => id !== numericId));
      }
    },
    [departments, ensureCoords, loadingDeptIds, showToast],
  );

  const searchMode = trimmedKeyword.length > 0;

  const providersForView = useMemo(() => {
    const base = searchMode ? searchResults : flattenedProviders;
    if (!selectedDeptSet.size) return base;
    return base.filter((p) => {
      if (!p.specialties || !p.specialties.length) {
        return selectedDeptSet.has(normalizeId(p.specialty_id));
      }
      return p.specialties.some((s) => selectedDeptSet.has(normalizeId(s.id)));
    });
  }, [searchMode, searchResults, flattenedProviders, selectedDeptSet]);

  const filtered = useMemo(() => {
    const toNum = (d) => (typeof d === "number" ? d : Number.POSITIVE_INFINITY);
    return [...providersForView].sort((a, b) => toNum(a.distanceKm) - toNum(b.distanceKm));
  }, [providersForView]);

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
    const normalizedId = normalizeId(deptId);
    setSelectedDepts((prev) => {
      const exists = prev.includes(normalizedId);
      if (exists) {
        fetchedDeptIds.current.delete(normalizedId);
        console.log("[Search] dept removed", normalizedId);
        return prev.filter((d) => d !== normalizedId);
      }
      fetchedDeptIds.current.delete(normalizedId); // ensure refetch when re-adding
        console.log("[Search] dept added", normalizedId);
      return [...prev, normalizedId];
    });

    // Fire fetch immediately when user selects a new department
    const numericId = Number(normalizedId);
    if (Number.isFinite(numericId) && !fetchedDeptIds.current.has(numericId)) {
      fetchedDeptIds.current.add(numericId);
      fetchNearbyBySpecialty(numericId);
    }
  };

  const removeDepartment = (deptId) => {
    setSelectedDepts((prev) => prev.filter((d) => d !== deptId));
    fetchedDeptIds.current.delete(deptId);
  };

  const departmentEntries = useMemo(() => departments.map((d) => [d.id, d.name]), [departments]);

  const getDeptLabel = useCallback(
    (value) => {
      if (!value) return "";
      if (typeof value === "string") {
        return value;
      }
      return getLocalizedText(value, language);
    },
    [language],
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

    setOverflowCards((prev) => {
      if (prev.size === next.size) {
        let same = true;
        for (const id of next) {
          if (!prev.has(id)) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    });
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

  useEffect(() => {
    if (initialPrefetchDone.current) return;
    if (!selectedDepts.length) return;
    initialPrefetchDone.current = true;
    selectedDepts.forEach((deptId) => {
      const numericId = Number(deptId);
      if (!Number.isFinite(numericId)) return;
      if (fetchedDeptIds.current.has(numericId)) return;
      fetchedDeptIds.current.add(numericId);
      fetchNearbyBySpecialty(numericId);
    });
  }, [selectedDepts, fetchNearbyBySpecialty]);

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
        <button className="home-icon-btn" type="button" onClick={() => navigate("/")} aria-label="home">
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
              {(p.specialties && p.specialties.length
                ? p.specialties
                : p.specialty_name
                  ? [{ id: p.specialty_id, name: p.specialty_name }]
                  : []
              ).map((spec) => {
                const label = getDeptLabel(spec.name);
                const key = `${p.id}-${spec.id ?? label}`;
                return (
                  <span key={key} className="dept-tag">
                    {label}
                  </span>
                );
              })}
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

          {filtered.length === 0 && !searching && <p className="no-result">{t("noResult")}</p>}
        </div>
      </div>
    </div>
  );
}
