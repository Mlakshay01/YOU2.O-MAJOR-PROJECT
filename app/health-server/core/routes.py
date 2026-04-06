from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from auth.user_model import verify_token
from core.activity_model import upsert_daily_activity, get_user_activity, activity_collection
from core.wellness_score import compute_wellness_score
from core.disease_risk import compute_disease_risks

router = APIRouter()

# ================= ACTIVITY =================

class ActivityModel(BaseModel):
    date: str
    steps: int = 0
    sleep: float = 0
    sedentary: float = 0
    water: int = 0
    water_logs: list = []
    mood: str = None
    food: str = None
    confidence: float = None
    nutrition: dict = None
    


# @router.post("/activity")
# def save_activity(data: ActivityModel, token: str = Header(...)):
#     user, err = verify_token(token)
#     if err:
#         raise HTTPException(status_code=401, detail=err)

#     try:
#         uid = ObjectId(user["_id"])

#         # 1. Save today's activity
#         upsert_daily_activity(user["_id"], data.dict())\

        

#         # 2. Fetch last 28 days to compute wellness score
#         end_date   = datetime.now(timezone.utc).date()
#         start_date = end_date - timedelta(days=27)  # 28 days inclusive

#         records = list(activity_collection.find(
#             {
#                 "user_id": uid,
#                 "date": {"$gte": str(start_date), "$lte": str(end_date)}
#             },
#             {"_id": 0, "steps": 1, "sleep": 1, "sedentary": 1, "water": 1, "mood": 1}
#         ))

#         # 3. Compute score from real data only (nulls excluded inside scorer)
#         result = compute_wellness_score(records)

#         # 4. Upsert score into a separate collection (one doc per user)
#         from core.db import db
#         db["wellness_scores"].update_one(
#             {"user_id": uid},
#             {"$set": {
#                 "user_id":   uid,
#                 "score":     result["score"],
#                 "breakdown": result["breakdown"],
#                 "updated_at": datetime.now(timezone.utc).isoformat(),
#             }},
#             upsert=True
#         )

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

#     return {
#         "message":   "Saved",
#         "wellness":  result["score"],
#         "breakdown": result["breakdown"],
#     }

@router.post("/activity")
def save_activity(data: ActivityModel, token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    try:
        uid = ObjectId(user["_id"])

        # 🔥 Convert incoming data
        activity_data = data.dict()

        # ✅ STRUCTURE FOOD PROPERLY (SAFE)
        food_name = activity_data.get("food")
        confidence = activity_data.get("confidence")
        nutrition = activity_data.get("nutrition")

        if food_name:
            activity_data["food"] = {
                "name": food_name,
                "confidence": confidence,
                "nutrition": nutrition
            }

        #  remove flat fields (avoid duplication)
        activity_data.pop("confidence", None)
        activity_data.pop("nutrition", None)

        # ✅ Save to DB
        upsert_daily_activity(user["_id"], activity_data)

        # ------------------- EXISTING LOGIC -------------------

        end_date   = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=27)

        records = list(activity_collection.find(
            {
                "user_id": uid,
                "date": {"$gte": str(start_date), "$lte": str(end_date)}
            },
            {"_id": 0, "steps": 1, "sleep": 1, "sedentary": 1, "water": 1, "mood": 1, "food": 1}
        ))

        result = compute_wellness_score(records)

        from core.db import db
        db["wellness_scores"].update_one(
            {"user_id": uid},
            {"$set": {
                "user_id": uid,
                "score": result["score"],
                "breakdown": result["breakdown"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "message": "Saved",
        "wellness": result["score"],
        "breakdown": result["breakdown"],
    }

@router.get("/activity")
def get_activity(token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    data = get_user_activity(user["_id"])
    return {"data": data}


@router.get("/activity/stats")
def get_activity_stats(days: int = Query(7), token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    uid        = ObjectId(user["_id"])
    end_date   = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=days - 1)

    date_range = [
        (start_date + timedelta(days=i)).isoformat()
        for i in range(days)
    ]

    records = list(activity_collection.find(
        {
            "user_id": uid,
            "date": {"$gte": str(start_date), "$lte": str(end_date)}
        },
        {"_id": 0, "date": 1, "steps": 1, "sleep": 1,
         "sedentary": 1, "water": 1, "mood": 1, "food": 1}
    ))

    by_date = {r["date"]: r for r in records}

    result = []
    for d in date_range:
        rec      = by_date.get(d)
        has_data = rec is not None
        result.append({
            "date":      d,
            "steps":     rec.get("steps")     if has_data else None,
            "sleep":     rec.get("sleep")     if has_data else None,
            "sedentary": rec.get("sedentary") if has_data else None,
            "water":     rec.get("water")     if has_data else None,
            "mood":      rec.get("mood")      if has_data else None,

            "calories": (
        rec.get("food", {}).get("nutrition", {}).get("calories")
        if has_data and rec.get("food")
        else None
    ),
        })

    return {"data": result}


@router.get("/wellness")
def get_wellness_score(token: str = Header(...)):
    """
    Returns the latest computed wellness score for the user.
    Score is computed and stored every time POST /activity is called.
    """
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    from core.db import db
    doc = db["wellness_scores"].find_one(
        {"user_id": ObjectId(user["_id"])},
        {"_id": 0, "score": 1, "breakdown": 1, "updated_at": 1}
    )

    if not doc:
        return {"score": None, "breakdown": {}, "updated_at": None}

    return doc


# ── ───────────────────────────────────

@router.get("/risk")
def get_disease_risk(token: str = Header(...)):
    """
    Returns lifestyle-based chronic disease risk estimates for:
    - Diabetes
    - Heart Disease
    - Obesity

    Computed from 28-day averages. Requires BMI from user profile.
    Risk values are continuous [0, 1]. NOT a medical diagnosis.
    """
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    uid = ObjectId(user["_id"])

    # ── Fetch 28-day activity averages ────────────────────────────
    end_date   = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=27)

    records = list(activity_collection.find(
        {
            "user_id": uid,
            "date": {"$gte": str(start_date), "$lte": str(end_date)}
        },
        {"_id": 0, "steps": 1, "sleep": 1, "sedentary": 1, "water": 1, "food": 1}
    ))

    # Only average non-null values (same pattern as wellness score)
    def safe_avg(key):
        vals = [r[key] for r in records if r.get(key) is not None]
        return sum(vals) / len(vals) if vals else None

    avg_sleep     = safe_avg("sleep")
    avg_steps     = safe_avg("steps")
    avg_sedentary = safe_avg("sedentary")
    avg_water     = safe_avg("water")
    # 🔥 ADD HERE (exactly after avg_water)

    food_vals = []

    for r in records:
        food = r.get("food")
        if food and isinstance(food, dict):
            nutrition = food.get("nutrition")
            if nutrition and isinstance(nutrition, dict):
                calories = nutrition.get("calories")
                if calories is not None:
                    food_vals.append(calories)

    avg_cal = sum(food_vals) / len(food_vals) if food_vals else None

    print("FOOD VALS:", food_vals)
    print("AVG CAL:", avg_cal)

    # ── Fetch BMI from user profile ───────────────────────────────
    from core.db import db
    user_doc = db["users"].find_one({"_id": uid}, {"height": 1, "weight": 1})
    bmi = None
    if user_doc:
        h = user_doc.get("height")  # cm
        w = user_doc.get("weight")  # kg
        if h and w and h > 0:
            bmi = round(w / ((h / 100) ** 2), 1)

    # ── Compute risks ─────────────────────────────────────────────
    risks = compute_disease_risks(
        avg_sleep=avg_sleep,
        avg_steps=avg_steps,
        avg_sedentary=avg_sedentary,
        avg_water=avg_water,
        avg_calories=avg_cal,
        bmi=bmi,
    )

    return {
        "bmi":    bmi,
        "window": f"{start_date} to {end_date}",
        "risks":  risks,
    }