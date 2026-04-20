from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from auth.user_model import verify_token
from core.activity_model import activity_collection
from core.disease_risk import compute_disease_risks, calculate_ideal_calories
from core.wellness_score import food_impact as _food_imp
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

    # ── 1. User profile (height, weight, age, gender) ─────────────
    user_doc = db["users"].find_one(
        {"_id": uid},
        {"height": 1, "weight": 1, "name": 1, "age": 1, "gender": 1}
    )
    user_name = user_doc.get("name", "User") if user_doc else "User"
    height    = user_doc.get("height")   if user_doc else None
    weight    = user_doc.get("weight")   if user_doc else None
    age       = user_doc.get("age")      if user_doc else None
    gender    = user_doc.get("gender")   if user_doc else None

    # ── 2. Ideal calories (Mifflin-St Jeor TDEE) ──────────────────
    # activity_multiplier 1.55 = moderately active (default).
    # Upgrade later: derive from avg_steps (sedentary=1.2 if <5k, active=1.725 if >10k).
    ideal_calories = calculate_ideal_calories(
        weight=weight,
        height=height,
        age=age,
        gender=gender,
        activity_multiplier=1.55,
    )

    # ── 3. BMI ────────────────────────────────────────────────────
    bmi = None
    if height and weight and height > 0:
        bmi = round(weight / ((height / 100) ** 2), 1)

    # ── 4. Wellness score ─────────────────────────────────────────
    wellness_doc = db["wellness_scores"].find_one(
        {"user_id": uid},
        {"_id": 0, "score": 1, "breakdown": 1}
    )
    wellness_score = wellness_doc.get("score")     if wellness_doc else None
    breakdown      = wellness_doc.get("breakdown", {}) if wellness_doc else {}

    # ── 5. 28-day activity averages ───────────────────────────────
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
    moods       = [r["mood"] for r in records if r.get("mood")]
    mood_counts = {}
    for m in moods:
        mood_counts[m] = mood_counts.get(m, 0) + 1
    dominant_mood = max(mood_counts, key=mood_counts.get) if mood_counts else None

    # Avg calories — unified shape: food.nutrition.calories
    cal_vals = []
    for r in records:
        food = r.get("food")
        if food and isinstance(food, dict):
            cal = food.get("nutrition", {}).get("calories")
            if cal is not None:
                cal_vals.append(cal)
    avg_calories = round(sum(cal_vals) / len(cal_vals), 1) if cal_vals else None

    # ── 6. Food impact (personalised) ────────────────────────────
    # Uses ratio against ideal_calories when available; population fallback otherwise.
    food_imp_score = _food_imp(avg_calories, ideal_calories) if avg_calories is not None else None
    food_ratio     = round(avg_calories / ideal_calories, 2) if avg_calories and ideal_calories else None

    # ── 7. Disease risks ──────────────────────────────────────────
    risks = compute_disease_risks(
        avg_sleep=avg_sleep,
        avg_steps=avg_steps,
        avg_sedentary=avg_sedentary,
        avg_water=avg_water,
        avg_calories=avg_calories,
        ideal_calories=ideal_calories,
        bmi=bmi,
    )

    diabetes_risk_score  = risks.get("diabetes",      {}).get("risk", 0)
    heart_risk_score     = risks.get("heart_disease",  {}).get("risk", 0)
    obesity_risk_score   = risks.get("obesity",        {}).get("risk", 0)
    diabetes_risk_label  = risks.get("diabetes",      {}).get("risk_label", "N/A")
    heart_risk_label     = risks.get("heart_disease",  {}).get("risk_label", "N/A")
    obesity_risk_label   = risks.get("obesity",        {}).get("risk_label", "N/A")

    # ── 8. Streak ─────────────────────────────────────────────────
    streak_doc     = db["streaks"].find_one(
        {"user_id": uid},
        {"_id": 0, "current_streak": 1, "longest_streak": 1}
    )
    current_streak = streak_doc.get("current_streak", 0) if streak_doc else 0
    longest_streak = streak_doc.get("longest_streak", 0) if streak_doc else 0

    # ── 9. Build LLM prompt ───────────────────────────────────────
    days_tracked = len(records)

    # Human-readable caloric context for the LLM
    if food_ratio is not None:
        if food_ratio < 0.75:
            caloric_status = f"deficit ({food_ratio}× of target — under-eating)"
        elif food_ratio <= 1.10:
            caloric_status = f"optimal ({food_ratio}× of target)"
        elif food_ratio <= 1.30:
            caloric_status = f"slight excess ({food_ratio}× of target)"
        elif food_ratio <= 1.60:
            caloric_status = f"high excess ({food_ratio}× of target)"
        else:
            caloric_status = f"severe excess ({food_ratio}× of target)"
    else:
        caloric_status = "unknown (no caloric data or user profile incomplete)"

    prompt = f"""You are a health analysis AI. Analyze this health data and respond with ONLY a raw JSON object.

USER PROFILE
Name: {user_name}
Age: {age or 'N/A'}
Gender: {gender or 'N/A'}
Height: {height or 'N/A'} cm
Weight: {weight or 'N/A'} kg
BMI: {bmi or 'N/A'}

WELLNESS OVERVIEW
Wellness Score: {wellness_score}/100
Days tracked: {days_tracked}/28
Current streak: {current_streak} days
Longest streak: {longest_streak} days

ACTIVITY METRICS (28-day averages)
Sleep: {breakdown.get('sleep', {}).get('avg', avg_sleep)}h/night
Steps: {breakdown.get('steps', {}).get('avg', avg_steps)}/day
Sedentary time: {breakdown.get('sedentary', {}).get('avg', avg_sedentary)}h/day
Water: {breakdown.get('water', {}).get('avg', avg_water)}ml/day
Dominant mood: {dominant_mood or 'N/A'}

NUTRITION (personalised)
Ideal daily calories (Mifflin-St Jeor TDEE): {ideal_calories or 'N/A'} kcal
Actual avg daily calories: {avg_calories or 'N/A'} kcal
Caloric status: {caloric_status}
Food impact score: {food_imp_score} (-1 to +1, where +1 = optimal for this user)

DISEASE RISK SCORES (0–1 scale, lifestyle-based only)
Diabetes: {diabetes_risk_score} — {diabetes_risk_label}
Heart disease: {heart_risk_score} — {heart_risk_label}
Obesity: {obesity_risk_score} — {obesity_risk_label}

Return a JSON object with these exact keys:
- overall_summary: string
- score_interpretation: string
- metric_insights: array of 6 objects each with keys: metric, status (good/warning/critical), insight, target
- disease_risk_analysis: array of 3 objects each with keys: condition, risk_level (low/moderate/high), risk_score (number), explanation, prevention_tips (array of 3 strings)
- top_recommendations: array of 3 objects each with keys: priority (number), title, description, expected_benefit
- motivational_message: string

Metrics are: Sleep, Steps, Hydration, Sedentary Time, Mood, Food Intake
Conditions are: Diabetes, Heart Disease, Obesity

Important instructions:
- For Food Intake insight: compare actual calories ({avg_calories or 'N/A'} kcal) against their personalised TDEE ({ideal_calories or 'N/A'} kcal). Explain the ratio ({food_ratio or 'N/A'}×) in plain language.
- For disease risk explanations: explicitly describe how their caloric intake relative to their personal TDEE contributed to each condition's risk score.
- Use the user's actual name ({user_name}) and reference their specific numbers throughout.
- Be specific, warm, and encouraging. No generic advice."""

    # ── 10. Call Groq API ──────────────────────────────────────────
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a health analysis AI. "
                        "You must respond with ONLY valid JSON. "
                        "No markdown, no code blocks, no extra text before or after. "
                        "Just the raw JSON object."
                    )
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
        "analysis":    analysis,
        "data_window": f"{start_date} to {end_date}",
        "days_tracked": days_tracked,
        # Expose computed values for frontend use
        "meta": {
            "ideal_calories": ideal_calories,
            "avg_calories":   avg_calories,
            "food_ratio":     food_ratio,
            "caloric_status": caloric_status,
            "bmi":            bmi,
        }
    }