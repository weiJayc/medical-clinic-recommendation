import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import { normalizeSymptoms } from "./utils/ollama.js";
import { findHospitals } from "./utils/findHospitals.js";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../frontend/database project/dist");
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

function toNumber(v, name) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${name}`);
  return n;
}

async function mapSpecialtiesByName(names = []) {
  const normalized = names
    .map((n) => (typeof n === "string" ? n.trim().toLowerCase() : ""))
    .filter(Boolean);

  if (!normalized.length) return { rows: [], missing: [] };

  const { rows } = await pool.query(
    `SELECT specialty_id, specialty_name
     FROM specialties
     WHERE LOWER(specialty_name) = ANY($1::text[])`,
    [normalized],
  );

  const foundNames = new Set(rows.map((r) => r.specialty_name.toLowerCase()));
  const missing = normalized.filter((n) => !foundNames.has(n));

  return { rows, missing };
}

async function findNearbyProviders(lat, lng, specialtyId, radius, limit) {
  const sql = `
    WITH q AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS user_geog
    )
    SELECT
        p.provider_code,
        p.name,
        p.phone,
        p.city_dist,
        p.address,
        s.specialty_id,
        s.specialty_name,
        ST_Y(p.geom::geometry) AS lat,
        ST_X(p.geom::geometry) AS lng,
        ROUND(ST_Distance(p.geom, q.user_geog))::int AS distance_m,
        ROUND((ST_Distance(p.geom, q.user_geog) / 1000.0)::numeric, 2) AS distance_km
    FROM providers p
    JOIN provider_specialties ps
        ON ps.provider_code = p.provider_code
    JOIN specialties s
        ON s.specialty_id = ps.specialty_id
    CROSS JOIN q
    WHERE p.geom IS NOT NULL
        AND ps.specialty_id = $3
        AND ST_DWithin(p.geom, q.user_geog, $4)
    ORDER BY distance_m ASC
    LIMIT $5;
  `;
  const params = [lng, lat, specialtyId, radius, limit];
  const { rows } = await pool.query(sql, params);
  return rows;
}

app.post("/api/recommend", async (req, res) => {
  const { symptom, city, lat, lng, radius, limit } = req.body ?? {};
  if (!symptom) {
    return res.status(400).json({ ok: false, message: "symptom is required" });
  }

  try {
    const standardized = await normalizeSymptoms(symptom);
    const standardizedSymptoms = standardized.symptoms || [];
    const deptList = standardized.recommendDepartments || [];

    const matchedHospitals = findHospitals(city, deptList);

    // map Gemini departments to DB specialties
    const { rows: specialties, missing: specialtiesMissing } = await mapSpecialtiesByName(deptList);

    const hasLocation = lat !== undefined && lng !== undefined;
    const radiusSafe = radius ? Math.min(Math.max(Number(radius), 100), 10000) : 3000;
    const limitRaw = limit ? Number(limit) : 50;
    const limitSafe = Math.min(Math.max(limitRaw, 1), 200);

    let providersBySpecialty = [];
    if (hasLocation && specialties.length) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        throw new Error("lat/lng must be numbers when provided");
      }

      providersBySpecialty = await Promise.all(
        specialties.map(async (s) => ({
          specialty_id: s.specialty_id,
          specialty_name: s.specialty_name,
          providers: await findNearbyProviders(latNum, lngNum, s.specialty_id, radiusSafe, limitSafe),
        })),
      );
    }

    res.json({
      ok: true,
      input: symptom,
      city: city ?? null,
      standardizedSymptoms,
      recommendDepartments: deptList,
      matchedHospitals,
      specialties,
      specialtiesMissing,
      providersBySpecialty,
    });
  } catch (err) {
    console.error("recommend error", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ✅ 測試 DB 是否連得上
app.get("/api/health/db", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS now;");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/api/providers/nearby-by-specialty", async (req, res) => {
  try {
    const lat = toNumber(req.query.lat, "lat");
    const lng = toNumber(req.query.lng, "lng");
    const specialtyId = toNumber(req.query.specialty_id, "specialty_id");

    const radius = req.query.radius ? toNumber(req.query.radius, "radius") : 3000;
    const limitRaw = req.query.limit ? toNumber(req.query.limit, "limit") : 50;
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
    throw new Error("specialty_id must be a positive integer");
    }
    const radiusSafe = Math.min(Math.max(radius, 100), 10000); // 100m ~ 10km
    
    const sql = `
    WITH q AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS user_geog
    )
    SELECT
        p.provider_code,
        p.name,
        p.phone,
        p.city_dist,
        p.address,
        s.specialty_id,
        s.specialty_name,

        ST_Y(p.geom::geometry) AS lat,
        ST_X(p.geom::geometry) AS lng,

        ROUND(ST_Distance(p.geom, q.user_geog))::int AS distance_m,
        ROUND((ST_Distance(p.geom, q.user_geog) / 1000.0)::numeric, 2) AS distance_km
    FROM providers p
    JOIN provider_specialties ps
        ON ps.provider_code = p.provider_code
    JOIN specialties s
        ON s.specialty_id = ps.specialty_id
    CROSS JOIN q
    WHERE p.geom IS NOT NULL
        AND ps.specialty_id = $3
        AND ST_DWithin(p.geom, q.user_geog, $4)
    ORDER BY distance_m ASC
    LIMIT $5;
    `;


    const params = [lng, lat, specialtyId, radius, limit];
    const { rows } = await pool.query(sql, params);

    res.json({
      ok: true,
      query: { lat, lng, specialty_id: specialtyId, radius_m: radius, limit },
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

app.get("/api/specialties", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT specialty_id, specialty_name
      FROM specialties
      ORDER BY specialty_id ASC;
    `);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

const port = process.env.PORT || 3000;

// Serve frontend build
app.use(express.static(clientDist));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
