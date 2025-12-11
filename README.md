# You2.0 – Beyond Tracking, Into Becoming

An AI-powered Lifestyle & Wellness Tracking System integrating machine learning, mobile sensing, and behavioral analytics to help users build healthier long-term habits.

This project was developed as part of the Major Project (AY 2025–26), Department of Computer Science & Engineering, Jaypee University of Information Technology (JUIT).

---

## 🚀 Overview

**You2.0** combines manual self-reports, smartphone sensor data, and deep-learning models to:

* Predict lifestyle-related risks
* Recognize food items & mood using ML
* Provide personalized recommendations
* Gamify daily wellness habits
* Build long-term health insights

Components include:

* Food Classification Model (EfficientNet-B0)
* Mood Detection Model (EfficientNet-B0)
* Mobile App (React Native)
* Backend APIs (Node.js + Express)
* MongoDB Atlas for cloud storage

---

## ⭐ Key Features

### 🔹 AI & ML Capabilities

* Food Recognition using EfficientNet-B0
* Mood Recognition (FER-2013)
* Predictions planned for hydration, sleep, steps, sedentary behavior, stress

### 🔹 Daily Wellness Tracking

* Water intake, meals, food quality
* Sleep duration & quality
* Mood, stress, fatigue
* Exercise, steps, screen time, sedentary hours

### 🔹 Smart Insights

* Personalized alerts
* Weekly/monthly summaries
* Streaks & badges

### 🔹 Tech Stack

| Layer         | Tools / Technologies              |
| ------------- | --------------------------------- |
| Mobile App    | React Native                      |
| Backend       | Node.js, Express                  |
| Database      | MongoDB Atlas                     |
| ML Models     | PyTorch, EfficientNet-B0, TF Lite |
| Auth          | JWT                               |
| Notifications | Firebase / OneSignal              |
| Tools         | Matplotlib, Seaborn, Colab        |

---

## 🧠 System Architecture

```
              React Native App
        (User Inputs + Sensors)
                    |
                    ▼
          Node.js + Express API
                    |
                    ▼
             MongoDB Atlas
                    |
                    ▼
        AI/ML Models (PyTorch)
  Food Recognition + Mood Detection
```

---

## 🧪 Machine Learning Models

### 🍱 Food Classification Model

* EfficientNet-B0 transfer learning
* Datasets: Food-101 + Indian food dataset
* Preprocessing: resize, normalize, augment
* Training: Adam, CE Loss, early stopping

### 🙂 Mood Detection Model

* Dataset: FER-2013
* Classes: 7 emotions
* Grayscale → 3-channel, resize, augmentation
* Loss: class-weighted
* LR scheduling

---

## 📈 Results

### 🔹 Food Model

* Strong validation accuracy
* Good for Indian dishes
* Weak on visually similar foods

### 🔹 Mood Model

| Metric   | Result                    |
| -------- | ------------------------- |
| Accuracy | ~70–80%                   |
| Strength | Happy, Neutral, Surprise  |
| Weakness | Fear, Disgust (imbalance) |

---

## 📂 Repository Structure

```
You2.0/
│── app/
│── backend/
│── ml-models/
│── datasets/
│── docs/
│── docker/
│── README.md
```

---

## 🔧 Installation & Setup

### 1️⃣ Clone

```
git clone https://github.com/your-username/You2.0.git
cd You2.0
```

### 2️⃣ Backend

```
cd backend
npm install
```

`.env`:

```
MONGO_URI=your_db
JWT_SECRET=your_secret
FIREBASE_KEY=your_key
```

Run:

```
npm run dev
```

### 3️⃣ Mobile App

```
cd app
npm install
npx react-native run-android
```

### 4️⃣ ML Models

* Trained using PyTorch + Colab GPU
* Exported as `.pth`
* Converted to TF Lite / ONNX

---

## 🏁 Conclusion

You2.0 successfully:

* Built a complete health-tracking ecosystem
* Integrated deep learning into real-world app usage
* Achieved strong model performance
* Demonstrated practical AI-driven wellness insights

---

## 🔮 Future Scope

* Hydration/sleep/stress models
* YOLO for real-time food detection
* Vision Transformers
* Firebase Auth + Play Store deployment
* Health risk scoring engine

---

## 👥 Contributors

* **Lakshay Malik** — Worked on the Mood Recognition model, collected and prepared the dataset, and collaborated actively in literature review and report writing.
* **Aashi Gupta** — Worked on dataset creation, ML model building for food classification and documentation.
* **Ishleen Kaur** — Worked on documentation, report writing, literature survey, and helped with dataset handling.

Supervisor: Mr. Kuntal Sarkar, JUIT

---

## 📜 License

Academic use only — Major Project AY 2025–26, JUIT.
