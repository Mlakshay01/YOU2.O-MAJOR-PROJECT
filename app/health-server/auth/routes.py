from fastapi import APIRouter, HTTPException, Header,UploadFile, File
from pydantic import BaseModel
from auth.user_model import create_user, authenticate_user, verify_token, users_collection
from bson import ObjectId
from typing import Optional

router = APIRouter()

# ------------------- Request Models -------------------
class SignupModel(BaseModel):
    name: str
    age: Optional[float] = None
    email: str
    password: str
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None

class LoginModel(BaseModel):
    email: str
    password: str

class UpdateProfileModel(BaseModel):
    name: Optional[str] = None
    age: Optional[float] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None

# ------------------- Signup -------------------
@router.post("/signup")
def signup(data: SignupModel):
    user, err = create_user(
        data.name, data.email, data.password, data.age, data.gender, data.height, data.weight
    )
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {"message": "User created", "user": user}

# ------------------- Login -------------------
@router.post("/login")
def login(data: LoginModel):
    user, err = authenticate_user(data.email, data.password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {"message": "Login successful", "user": user}

# ------------------- Get current user -------------------
@router.get("/me")
def get_current_user(token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)
    user.pop("password", None)
    return {"user": user}

# ------------------- Update current user -------------------
@router.put("/me")
def update_current_user(data: UpdateProfileModel, token: str = Header(...)):
    user, err = verify_token(token)
    if err:
        raise HTTPException(status_code=401, detail=err)

    # Only update provided fields
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    users_collection.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": update_data}
    )

    updated_user = users_collection.find_one({"_id": ObjectId(user["_id"])})
    if updated_user:
        # CRITICAL FIX: Convert ObjectId to string
        updated_user["_id"] = str(updated_user["_id"])
        updated_user.pop("password", None)
    updated_user.pop("password", None)
    return {"user": updated_user}





