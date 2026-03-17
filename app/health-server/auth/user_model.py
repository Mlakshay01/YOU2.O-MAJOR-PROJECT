from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import uuid  # to generate a simple permanent token

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
users_collection = db["users"]

# Create user
def create_user(name, email, password, age=None, gender=None, height=None, weight=None):
    if users_collection.find_one({"email": email}):
        return None, "User already exists"
    hashed_pw = generate_password_hash(password)
    token = str(uuid.uuid4())  # permanent token for app
    user = {
        "name": name,
        "age": age,
        "email": email,
        "password": hashed_pw,

        "gender": gender,
        "height": height,
        "weight": weight,
        "token": token
    }
    user_id = users_collection.insert_one(user).inserted_id
    user["_id"] = str(user_id)
    return {**user}, None

# Authenticate user
def authenticate_user(email, password):
    user = users_collection.find_one({"email": email})
    if not user:
        return None, "Invalid credentials"
    if not check_password_hash(user["password"], password):
        return None, "Invalid credentials"
    user["_id"] = str(user["_id"])
    return {**user}, None

# Verify token for protected endpoints
def verify_token(token):
    user = users_collection.find_one({"token": token})
    if not user:
        return None, "Invalid token"
    user["_id"] = str(user["_id"])
    del user["password"]
    return user, None