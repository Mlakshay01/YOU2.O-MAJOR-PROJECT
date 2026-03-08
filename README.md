# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
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
