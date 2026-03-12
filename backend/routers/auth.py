from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter()

class LoginRequest(BaseModel):
    nickname: str
    password: str

from schemas import UserCreate, User

from database import get_supabase

@router.post("/login")
def login(req: LoginRequest):
    supabase = get_supabase()
    response = supabase.table("users").select("*").eq("nickname", req.nickname).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="등록되지 않은 닉네임입니다. 회원가입을 진행해주세요.")
        
    user_record = response.data[0]
    
    # In a real app we'd verify a hash, but since we store plaintext for now we just compare
    if user_record.get("password_hash") != req.password:
        raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")
        
    # Reconstruct user object without password
    user_data = user_record.copy()
    user_data.pop("password_hash", None)
    
    return {
        "message": "Login successful", 
        "user": user_data,
        "token": "dummy-token-123"
    }

@router.post("/register")
def register(req: UserCreate):
    supabase = get_supabase()
    # Check if nickname exists
    existing = supabase.table("users").select("nickname").eq("nickname", req.nickname).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="이미 존재하는 닉네임입니다.")
    
    # Insert new user
    new_user = {
        "nickname": req.nickname,
        "name": req.name,
        "session": req.session,
        "password_hash": req.password, # Note: Needs real hashing in prod
        "running_level": req.running_level,
        "time_preferences": req.time_preferences,
        "goal": req.goal
    }
    
    try:
        response = supabase.table("users").insert(new_user).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    user_data = response.data[0].copy()
    user_data.pop("password_hash", None)

    return {
        "message": "User registered successfully",
        "user": user_data,
        "token": "dummy-token-123"
    }
