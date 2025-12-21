import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hospitalsPath = path.join(__dirname, "../data/hospitals.json");
const hospitals = JSON.parse(fs.readFileSync(hospitalsPath, "utf8"));

export function findHospitals(city, deptList = []) {
  if (!Array.isArray(deptList) || deptList.length === 0) return [];

  return hospitals.filter(
    (h) =>
      (!city || h.city === city) &&
      Array.isArray(h.departments) &&
      h.departments.some((d) => deptList.includes(d)),
  );
}
