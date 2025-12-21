// 查醫院
import fs from "fs";

const hospitals = JSON.parse(fs.readFileSync("data/hospitals.json", "utf8"));

export function findHospitals(city, deptList) {
  return hospitals.filter(h =>
    h.city === city && h.departments.some(d => deptList.includes(d))
  );
}
