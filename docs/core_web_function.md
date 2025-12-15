# Core Web Function Specification
## Medical Recommendation & Health Resource Platform

---

## 1. Purpose and Scope

This document defines the **core functional requirements** of the medical recommendation web platform.

It serves as:
- The **primary development reference**
- The **scope boundary** for the project
- The basis for feature implementation and review

Any feature not listed in this document is considered **out of scope** unless explicitly approved.

---

## 2. Symptom-Based Medical Recommendation

### 2.1 User Input
- Users can input symptoms using natural language  
  (e.g., “cough, fever, sore throat”)

### 2.2 System Analysis
The system uses an AI/NLP module to:
- Analyze the symptom description
- Provide:
  - Multiple **possible explanations** (informational only)
  - **Recommended medical departments**

⚠️ The system must clearly state that results are **not a medical diagnosis**.

### 2.3 Output
- Display recommended departments such as:
  - Internal Medicine
  - Family Medicine
  - ENT (Otolaryngology)
- Show nearby clinics or hospitals offering the recommended services

---

## 3. Category-Based Browsing

Users may browse medical resources directly without symptom input.

### 3.1 Vaccination Services
- Display Taipei City contracted vaccination clinics
- Information includes:
  - Vaccine types
  - Eligible population
  - Insurance coverage

### 3.2 Cancer Screening
- Display Taipei City medical facilities offering **Five Major Cancer Screenings**:
  - Breast cancer
  - Cervical cancer
  - Colorectal cancer
  - Oral cancer
  - Liver cancer
- Allow filtering by cancer type

### 3.3 Sexual Health Services
- Display sexual health-friendly clinics
- Service tags may include:
  - HIV screening
  - STD testing
  - Medication consultation
  - Friendly physicians

### 3.4 General Medical Services
- Display commonly used departments such as:
  - Internal Medicine
  - Surgery
  - Pediatrics
  - Dermatology
  - Family Medicine

---

## 4. Medical Facility Map

### 4.1 Map Interface
- Provide an interactive map using:
  - Google Maps API or OpenStreetMap

### 4.2 Marker Classification
Facilities are marked with different colors or icons:
- 🟦 General medical services
- 🟩 Vaccination services
- 🟧 Cancer screening
- 🟪 Sexual health services

### 4.3 Facility Information Card
Clicking a marker displays:
- Facility name
- Address
- Phone number
- Departments / services provided
- Navigation link
- Appointment or registration link (if available)

---

## 5. Distance-Based Search

- Use geographic coordinates (latitude / longitude)
- Calculate straight-line distance using PostGIS
- Return nearby facilities based on user location

---

## 6. Technology Stack Constraints

| Layer      | Tool / Technology            |
|------------|-----------------------------|
| Frontend   | React                       |
| Backend    | FastAPI or Node.js          |
| NLP        | Gemini API                  |
| Rule Logic | Symptom–Department Mapping  |
| Database   | PostgreSQL                  |
| GIS        | PostGIS                     |
| Map        | Google Maps API             |

---

## 7. Optional Features (Post-Core Completion Only)

### 7.1 Advanced Filtering
- Facility type (clinic / hospital / medical center)
- Business hours (currently open / weekend availability)
- Insurance coverage

### 7.2 Favorites and History
- Users can bookmark frequently visited facilities
- System stores previous search records

---

## 8. Development Rules

- Core features take priority over optional features
- All implementations must align with this specification
- Any modification to this document requires team agreement

---

End of Document
