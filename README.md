# Circadia - Personalized Circadian Rhythm Profiling

## Overview
**Circadia** is an AI-powered mobile health system designed to analyze human circadian rhythms using non-medical behavioral data such as sleep timing, screen usage, and physical activity.
The system identifies chronotype, detects circadian disruptions, and provides personalized lifestyle recommendations to improve biological alignment and overall health.

---
## Key Features
* **Circadian Profiling**
  * Chronotype classification (Morning / Intermediate / Evening)
  * Infographics on sleep, activity and sleep time
  * Recomendations to improve health
    
*  **Advanced Analytics**
  * Non-Parametric Circadian Rhythm Analysis (NPCRA)
  * Acrophase (peak activity timing)
  * Relative Amplitude (RA)
  * Sleep debt calculation
    
*  **Deviation Detection**
  * Sleep timing inconsistency
  * Late-night screen exposure
  * Activity rhythm disruptions
  * Circadian amplitude decline

* **AI Recommendations**
  * Personalized lifestyle suggestions using Google Gemini API
  * Categorized into Sleep, Light, Activity, Nutrition, and Schedule

* **Interactive Dashboard**
  * 24-hour circadian rhythm visualization
  * Weekly sleep/activity trends
  * Screen usage patterns

---

## System Architecture

The system follows a **client-server architecture**:

### 1. Frontend (Mobile App)
* Built with **React 19 + TypeScript**
* Collects:
  * Activity data (accelerometer)
  * Screen usage
  * Sleep timing
* Displays:
  * Charts (Recharts, D3.js)
  * Recommendations
  * Circadian insights

### 2. Backend
* Built using **FastAPI**
* Handles:
  * Data preprocessing
  * Feature extraction
  * Circadian modeling
  * AI recommendation integration

### 3. Database
* **MongoDB**
* Stores:
  * Raw sensor data
  * Processed circadian features

---

## Data Pipeline
1. **Data Collection**
   * 15-minute epoch intervals
   * Inputs:
     * ActivityLevel (0–100)
     * Screen status (0/1)
     * Sleep & wake times

2. **Preprocessing**
   * Min-max normalization
   * Hourly aggregation
   * Midnight crossover correction

3. **Feature Extraction**
   * MSFsc (chronotype)
   * Social Jetlag
   * NPCRA metrics (IS, IV, RA)
   * Sleep debt
   * Screen-sleep correlation

4. **Analysis**
   * Baseline modeling
   * Z-score based anomaly detection

---

## Core Concepts
* **Chronotype** → Biological sleep preference
* **Acrophase** → Peak activity time
* **Relative Amplitude (RA)** → Strength of circadian rhythm
* **Sleep Regularity Score (SRS)** → Consistency of sleep timing

---

## 🧪 Example Outputs
* Chronotype classification (e.g., Evening Type)
* Social Jetlag (e.g., 2.1 hours → Moderate)
* Sleep Regularity Score (e.g., 72 → Good)
* AI Suggestions:
  * Reduce screen usage after 10 PM
  * Morning light exposure
  * Fixed sleep schedule

---

## Installation (Basic)

```bash
# Clone repo
git clone https://github.com/your-username/circadia.git

# Install frontend
cd frontend
npm install
npm run dev

# Install backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Future Enhancements

* Wearable integration (Apple Watch, Fitbit, Oura)
* Real-time circadian prediction using deep learning
* Clinical validation with DLMO studies
  
---

## Applications
* Sleep health monitoring
* Lifestyle optimization
* Preventive healthcare
* Chronotherapy support

---

## License

“Copyright © 2026 Vaishnavi Chada, Krushi Kavuri, and Nidhi Theegalapalli. All rights reserved. This project is intended for academic and research purposes only.”
