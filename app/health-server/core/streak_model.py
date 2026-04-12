from datetime import datetime, timedelta, timezone
from bson import ObjectId
from core.db import db

streak_collection = db["streaks"]


def update_streak(user_id: str) -> dict:
    """
    Call this on every login.
    Returns the updated streak document.
    """
    uid = ObjectId(user_id)
    today = datetime.now(timezone.utc).date()
    today_str = str(today)
    yesterday_str = str(today - timedelta(days=1))
    two_days_ago_str = str(today - timedelta(days=2))

    doc = streak_collection.find_one({"user_id": uid})

    # ── First ever login ───────────────────────────────────────────
    if not doc:
        new_doc = {
            "user_id": uid,
            "current_streak": 1,
            "longest_streak": 1,
            "last_login": today_str,
            "grace_used": False,
        }
        streak_collection.insert_one(new_doc)
        return _clean(new_doc)

    last_login = doc.get("last_login")
    current = doc.get("current_streak", 1)
    longest = doc.get("longest_streak", 1)
    grace_used = doc.get("grace_used", False)

    # ── Already logged in today ────────────────────────────────────
    if last_login == today_str:
        return _clean(doc)

    # ── Logged in yesterday → keep streak going ────────────────────
    if last_login == yesterday_str:
        current += 1
        grace_used = False  # reset grace for next potential miss

    # ── Missed exactly 1 day → apply grace if not already used ────
    elif last_login == two_days_ago_str and not grace_used:
        # Streak survives but grace is now consumed
        grace_used = True
        # Don't increment — the missed day doesn't count

    # ── Gap too large or grace already burned → reset ──────────────
    else:
        current = 1
        grace_used = False

    longest = max(longest, current)

    streak_collection.update_one(
        {"user_id": uid},
        {"$set": {
            "current_streak": current,
            "longest_streak": longest,
            "last_login": today_str,
            "grace_used": grace_used,
        }}
    )

    return {
        "current_streak": current,
        "longest_streak": longest,
        "last_login": today_str,
        "grace_used": grace_used,
    }


def get_streak(user_id: str) -> dict:
    """
    Returns current streak data without modifying anything.
    """
    uid = ObjectId(user_id)
    doc = streak_collection.find_one(
        {"user_id": uid},
        {"_id": 0, "current_streak": 1, "longest_streak": 1,
         "last_login": 1, "grace_used": 1}
    )
    if not doc:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_login": None,
            "grace_used": False,
        }
    return doc


def _clean(doc: dict) -> dict:
    """Strip MongoDB internals from returned doc."""
    return {
        "current_streak": doc.get("current_streak", 1),
        "longest_streak": doc.get("longest_streak", 1),
        "last_login":     doc.get("last_login"),
        "grace_used":     doc.get("grace_used", False),
    }