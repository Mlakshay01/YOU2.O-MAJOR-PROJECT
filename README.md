# You2.0 – Beyond Tracking, Into Becoming

**You2.0** is an AI-powered lifestyle and wellness tracker designed to help individuals build healthier habits. Unlike generic fitness apps, You2.0 combines **manual self-reports** and **smartphone sensor data** to provide **personalized recommendations, gamified engagement, and early risk predictions** for lifestyle-related conditions.

---

## 📊 Features

* **Daily Wellness Check-In** (Google Form / App questionnaire)
* **Sleep & Rest Tracking** → quality, duration, fatigue
* **Mood & Stress Monitoring** → self-reports + mood recognition
* **Hydration & Nutrition** → water intake, meal quality, meals per day
* **Physical Activity** → steps, exercise frequency, sedentary hours, screen time
* **Medical History** → diabetes, obesity, hypertension, mental health, etc.
* **ML-Based Insights** → obesity/stress/diabetes risk predictions
* **Gamification** → streaks, badges, progress graphs
* **Personalized Alerts** → push notifications for hydration, sleep, inactivity

---

## 🛠️ Tools, Technologies & Languages

**Programming Languages**

* Python 3.11
* JavaScript / TypeScript (ES2023, TS 5.6)
* SQL (PostgreSQL 16, optional)

**Technologies**

* React Native 0.76 (Mobile App)
* Node.js 20 LTS + Express.js 4.21 (Backend APIs)
* MongoDB Atlas 7.0 + Mongoose 8.6 (Database)
* JWT Authentication (jsonwebtoken 9.0.2)
* Firebase Cloud Messaging v12.0 / OneSignal 5.0 (Push Notifications)
* TensorFlow 2.16 / Keras 3.4 (LSTM, CNN, DeepSleep)
* scikit-learn 1.5 (Baseline ML Models, Ensemble Learning)
* Hugging Face Transformers 4.44 (Mood Recognition)
* OpenCV 4.10 (Food Recognition & Portion Estimation)
* TensorFlow Lite 2.16 / ONNX Runtime 1.20 (Mobile Deployment)
* Docker 25.0 (Containerization)
* GitHub / GitLab (Version Control, CI/CD)

**Tools**

* pandas 2.2, numpy 1.26 (Preprocessing, Feature Engineering)
* Matplotlib 3.9, Seaborn 0.13 (Data Visualization)
* Postman 11 / Thunder Client (API Testing)
* Draw.io / Lucidchart (Architecture Diagrams)
* Notion / Trello / Jira (Project Management)
* Overleaf / MS Word 2025 (Documentation & Reports)

---

## ⚙️ Project Workflow

1. **Dataset & Preprocessing**

   * Collected via Google Form (Daily Wellness Check-In)
   * Data cleaning, normalization, feature extraction

2. **Model Training Modules**

   * Water Intake → LSTM (time-series)
   * Pedometer Data → CNN / LSTM or Google Activity Recognition API
   * Sedentary Hours → threshold-based classification
   * Food Recognition → CNN + OpenCV (with manual correction)
   * Mood Recognition → CNN + Hugging Face transformers
   * Sleep Detection → DeepSleep framework / Google Fit Sleep API

3. **Integrated Fitness Model**

   * Ensemble learning (stacked/weighted) for lifestyle predictions

4. **Mobile App Dashboard**

   * Daily questionnaire, trend visualization, gamification
   * Feedback loop with personalized alerts and recommendations

---

## 📂 Repository Structure

```
You2.0/
│── app/                # React Native mobile app
│── backend/            # Node.js + Express.js APIs
│── ml-models/          # Python ML training scripts + saved models
│── datasets/           # Collected data (Google Form exports, Kaggle datasets)
│── docs/               # Reports, diagrams, documentation
│── docker/             # Dockerfiles, deployment configs
│── README.md           # Project overview
```

---

## 🚀 Setup & Installation

### Prerequisites

* Node.js 20+, npm / yarn
* Python 3.11+
* MongoDB Atlas account
* Firebase account (for push notifications)

### Steps

1. Clone the repo:

   ```bash
   git clone https://github.com/your-username/you2.0.git
   cd you2.0
   ```
2. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:

   ```bash
   cd app
   npm install
   ```
4. Setup environment variables (`.env`):

   ```
   MONGO_URI=your_mongodb_atlas_url
   JWT_SECRET=your_jwt_secret
   FIREBASE_KEY=your_firebase_key
   ```
5. Run backend:

   ```bash
   cd backend
   npm run dev
   ```
6. Run mobile app:

   ```bash
   cd app
   npx react-native run-android   # for Android
   npx react-native run-ios       # for iOS
   ```

---

## 📊 Dataset

* Collected daily using **Google Form** (“You2.0 Daily Wellness Check-In”)
* Features include demographics, sleep, mood, hydration, nutrition, activity, screen time, sedentary hours, and medical history
* Processed using `pandas` and `numpy` before ML training

---

## 👩‍💻 Contributors

* **Aashi Gupta** – Developer, Documentation
* **Lakshay Malik** – Developer, Documentation
* **Ishleen Kaur** – Developer, Documentation

Supervisor: **Mr. Kuntal Sarkar** (Assistant Professor, CSE Department, JUIT)

---

## 📜 License

This project is developed as part of the **Major Project (AY 2025–26)** at JUIT.
For academic purposes only.

---
