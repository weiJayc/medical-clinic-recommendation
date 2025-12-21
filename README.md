# Medical Clinic Recommendation Web Platform

A web-based medical clinic recommendation system that helps users find appropriate medical departments and nearby clinics or hospitals based on symptom descriptions and specific healthcare needs.

---

## 📌 Project Overview

This project allows users to:
- Describe their symptoms in natural language
- Receive **possible causes (non-diagnostic)** and **recommended medical departments**
- Find **nearby clinics or hospitals** that provide the relevant services
- Browse medical resources by category (e.g., vaccination, cancer screening)
- View results on an **interactive map**

⚠️ This system does **not provide medical diagnosis**.  
It is intended for **information and guidance purposes only**.

---

## ✨ Core Features (Summary)

- **Symptom-based search**
  - Natural language symptom input
  - AI-assisted analysis
  - Recommended medical departments

- **Nearby medical facilities**
  - Clinics and hospitals filtered by department
  - Distance-based search

- **Category-based browsing**
  - Vaccination services
  - Cancer screening (Five major cancers)
  - Sexual health-friendly clinics
  - General medical departments

- **Interactive map**
  - Clinic markers with category-specific icons
  - Facility information cards
  - Navigation and appointment links

📄 Detailed system specification can be found here:  
👉 `docs/core_web_function.md`

---

## 🧱 System Architecture (High Level)

| Layer      | Technology                     |
|------------|--------------------------------|
| Frontend   | React, HTML, CSS, JavaScript   |
| Backend    | FastAPI or Node.js             |
| NLP        | Ollama (local LLM)             |
| Database   | PostgreSQL                     |
| GIS        | PostGIS (distance calculation) |
| Map        | Google Maps API / OpenStreetMap|

---

## 🛠️ Project Structure

medical-clinic-recommendation/
├─ frontend/
├─ backend/
├─ nlp/
├─ database/
├─ docs/
│   └─ core_web_function.md
└─ README.md

---

## LLM Configuration (Node server)

- Default model: `OLLAMA_MODEL=llama3.1` (set in `server/.env`, adjust as needed).
- Endpoint: `OLLAMA_HOST=http://127.0.0.1:11434` (requires a running Ollama instance with the chosen model pulled).

---

## 🤝 Collaboration Workflow

- `main` branch: stable version (demo / submission)
- `dev` branch: integration branch
- `feature/*` branches: individual development

All changes must be submitted via **Pull Request** and reviewed before merging.
