from core.db import db
from bson import ObjectId

activity_collection = db["user_activity"]

def upsert_daily_activity(user_id: str, data: dict):
    uid = ObjectId(user_id)
    
    # Remove user_id from data if frontend accidentally sends it
    clean_data = {k: v for k, v in data.items() if k != "user_id"}
    
    activity_collection.update_one(
        {"user_id": uid, "date": clean_data["date"]},
        {
            "$set": clean_data,           # only the activity fields
            "$setOnInsert": {"user_id": uid}  # user_id only set on new doc creation
        },
        upsert=True
    )

def get_user_activity(user_id: str):
    uid = ObjectId(user_id)  # ← was missing before, caused no results
    return list(
        activity_collection.find(
            {"user_id": uid},
            {"_id": 0}  # exclude _id to avoid serialization issues
        )
    )