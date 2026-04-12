from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from auth.user_model import verify_token
from core.activity_model import activity_collection
from core.disease_risk import compute_disease_risks, food_impact
from groq import Groq
import os
import json

router = APIRouter()

@router.get("/analysis")
def get_ai_analysis(token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    uid = ObjectId(user["_id"])
    from core.db import db

    # ── 1. Wellness score ─────────────────────────────────────────
    wellness_doc = db["wellness_scores"].find_one(
        {"user_id": uid},
        {"_id": 0, "score": 1, "breakdown": 1}
    )
    wellness_score = wellness_doc.get("score") if wellness_doc else None
    breakdown = wellness_doc.get("breakdown", {}) if wellness_doc else {}

    # ── 2. 28-day activity averages ───────────────────────────────
    end_date   = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=27)

    records = list(activity_collection.find(
        {
            "user_id": uid,
            "date": {"$gte": str(start_date), "$lte": str(end_date)}
        },
        {"_id": 0, "steps": 1, "sleep": 1, "sedentary": 1,
         "water": 1, "mood": 1, "food": 1, "date": 1}
    ))

    def safe_avg(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    avg_steps     = safe_avg("steps")
    avg_sleep     = safe_avg("sleep")
    avg_sedentary = safe_avg("sedentary")
    avg_water     = safe_avg("water")

    # Mood distribution
    moods = [r["mood"] for r in records if r.get("mood")]
    mood_counts = {}
    for m in moods:
        mood_counts[m] = mood_counts.get(m, 0) + 1
    dominant_mood = max(mood_counts, key=mood_counts.get) if mood_counts else None

    # Avg calories
    cal_vals = []
    for r in records:
        food = r.get("food")
        if food and isinstance(food, dict):
            cal = food.get("nutrition", {}).get("calories")
            if cal: cal_vals.append(cal)
    avg_calories = round(sum(cal_vals) / len(cal_vals), 1) if cal_vals else None

    # ── 3. BMI ────────────────────────────────────────────────────
    user_doc = db["users"].find_one({"_id": uid}, {"height": 1, "weight": 1, "name": 1})
    bmi = None
    user_name = user_doc.get("name", "User") if user_doc else "User"
    if user_doc:
        h = user_doc.get("height")
        w = user_doc.get("weight")
        if h and w and h > 0:
            bmi = round(w / ((h / 100) ** 2), 1)

    # ── 4. Disease risks ──────────────────────────────────────────
    risks = compute_disease_risks(
        avg_sleep=avg_sleep,
        avg_steps=avg_steps,
        avg_sedentary=avg_sedentary,
        avg_water=avg_water,
        avg_calories=avg_calories,
        bmi=bmi,
    )

    # ── Extract risk numbers from dict ────────────────────────────
    diabetes_risk_score = risks.get('diabetes', {}).get('risk', 0)
    heart_risk_score    = risks.get('heart_disease', {}).get('risk', 0)
    obesity_risk_score  = risks.get('obesity', {}).get('risk', 0)
    diabetes_risk_label = risks.get('diabetes', {}).get('risk_label', 'N/A')
    heart_risk_label    = risks.get('heart_disease', {}).get('risk_label', 'N/A')
    obesity_risk_label  = risks.get('obesity', {}).get('risk_label', 'N/A')
    food_imp_score      = round(food_impact(avg_calories), 2) if avg_calories else 'N/A'

    # ── 5. Streak ─────────────────────────────────────────────────
    streak_doc = db["streaks"].find_one(
        {"user_id": uid},
        {"_id": 0, "current_streak": 1, "longest_streak": 1}
    )
    current_streak = streak_doc.get("current_streak", 0) if streak_doc else 0
    longest_streak = streak_doc.get("longest_streak", 0) if streak_doc else 0

    # ── 6. Build prompt ───────────────────────────────────────────
    days_tracked = len(records)

    prompt = f"""You are a health analysis AI. Analyze this health data and respond with ONLY a raw JSON object.

USER: {user_name}
Wellness Score: {wellness_score}/100
Days tracked: {days_tracked}/28
Sleep: {breakdown.get('sleep', {}).get('avg', avg_sleep)}h/night
Steps: {breakdown.get('steps', {}).get('avg', avg_steps)}/day
Sedentary: {breakdown.get('sedentary', {}).get('avg', avg_sedentary)}h/day
Water: {breakdown.get('water', {}).get('avg', avg_water)}ml/day
Mood: {dominant_mood or 'N/A'}
Avg daily calories: {avg_calories or 'N/A'} kcal/day
Food impact score: {food_imp_score} (-1 to +1, higher is healthier)
BMI: {bmi or 'N/A'}
Diabetes risk: {diabetes_risk_score} (0-1 scale) - {diabetes_risk_label}
Heart disease risk: {heart_risk_score} (0-1 scale) - {heart_risk_label}
Obesity risk: {obesity_risk_score} (0-1 scale) - {obesity_risk_label}
Current streak: {current_streak} days
Longest streak: {longest_streak} days

Return a JSON object with these exact keys:
- overall_summary: string
- score_interpretation: string
- metric_insights: array of 5 objects each with keys: metric, status (good/warning/critical), insight, target
- disease_risk_analysis: array of 3 objects each with keys: condition, risk_level (low/moderate/high), risk_score (number), explanation, prevention_tips (array of 3 strings)
- top_recommendations: array of 3 objects each with keys: priority (number), title, description, expected_benefit
- motivational_message: string

Metrics are: Sleep, Steps, Hydration, Sedentary Time, Mood
Conditions are: Diabetes, Heart Disease, Obesity
For disease risks, explain how their caloric intake and food impact score specifically contributed to each risk.
Use actual numbers from the data. Be specific and warm."""

    # ── 7. Call Groq API ──────────────────────────────────────────
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a health analysis AI. You must respond with ONLY valid JSON. No markdown, no code blocks, no extra text before or after. Just the raw JSON object."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.3,
        )
        raw = completion.choices[0].message.content.strip()

        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        # Find JSON boundaries in case there's extra text
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON object found in response")
        raw = raw[start:end]

        analysis = json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    return {
        "analysis": analysis,
        "data_window": f"{start_date} to {end_date}",
        "days_tracked": days_tracked,
    }