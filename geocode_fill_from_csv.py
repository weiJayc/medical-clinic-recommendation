import os
import time
import csv
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
DB_URL = os.getenv("DATABASE_URL")

INPUT_CSV = "missing_tpe_ntpc.csv"

# 如果你的 CSV 欄位名不一樣，改這兩行就好
COL_PROVIDER_CODE = "provider_code"
COL_ADDRESS = "geocode_address"   # 若你CSV沒有這欄，改成 "address"

SLEEP_SEC = 0.15
MAX_RETRY = 5

if not GOOGLE_KEY:
    raise RuntimeError("Missing env GOOGLE_MAPS_API_KEY")
if not DB_URL:
    raise RuntimeError("Missing env DATABASE_URL")

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

def geocode(address: str):
    params = {
        "address": address,
        "key": GOOGLE_KEY,
        "region": "tw",
        "language": "zh-TW",
    }

    for attempt in range(1, MAX_RETRY + 1):
        r = requests.get(GEOCODE_URL, params=params, timeout=20)
        data = r.json()
        status = data.get("status")

        if status == "OK" and data.get("results"):
            loc = data["results"][0]["geometry"]["location"]
            return float(loc["lat"]), float(loc["lng"]), status

        if status in ("ZERO_RESULTS", "REQUEST_DENIED", "INVALID_REQUEST"):
            return None, None, status

        if status in ("OVER_QUERY_LIMIT", "UNKNOWN_ERROR"):
            backoff = min(2 ** attempt, 30)
            time.sleep(backoff)
            continue

        return None, None, status

    return None, None, "RETRY_EXCEEDED"

def main():
    # 讀 CSV
    jobs = []
    with open(INPUT_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            provider_code = row[COL_PROVIDER_CODE].strip()
            addr = row[COL_ADDRESS].strip()
            if provider_code and addr:
                jobs.append((provider_code, addr))

    print(f"Loaded {len(jobs)} rows from {INPUT_CSV}")

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False

    updates = []   # (lng, lat, provider_code)  注意：MakePoint(lng, lat)
    failures = []  # (provider_code, addr, status)

    try:
        for i, (provider_code, addr) in enumerate(jobs, start=1):
            lat, lng, status = geocode(addr)

            if lat is not None and lng is not None:
                updates.append((lng, lat, provider_code))
            else:
                failures.append((provider_code, addr, status))

            if i % 50 == 0:
                print(f"Progress {i}/{len(jobs)} | updates={len(updates)} | failures={len(failures)}")

            time.sleep(SLEEP_SEC)

        # 批次更新（只更新 geom 仍為 NULL 的）
        if updates:
            with conn.cursor() as cur:
                sql = """
                    UPDATE providers p
                    SET geom = ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
                    FROM (VALUES %s) AS v(lng, lat, provider_code)
                    WHERE p.provider_code = v.provider_code
                      AND p.geom IS NULL;
                """
                execute_values(cur, sql, updates, page_size=500)

        conn.commit()
        print(f"✅ Updated {len(updates)} rows")
        print(f"⚠️ Failures {len(failures)} rows")

        if failures:
            with open("geocode_failures.csv", "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["provider_code", "geocode_address", "status"])
                w.writerows(failures)
            print("Wrote failures to geocode_failures.csv")

    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
