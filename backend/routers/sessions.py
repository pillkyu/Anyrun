from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timedelta
import uuid

# Assume schemas are in the parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from schemas import SessionCreate, Session, Attendee
from database import get_supabase

router = APIRouter()

import asyncio
from datetime import timedelta

async def cleanup_expired_sessions():
    await asyncio.sleep(5)
    
    while True:
        try:
            supabase = get_supabase()
            now = datetime.now()
            
            res = supabase.table("sessions").select("*").execute()
            sessions = res.data
            
            expired_custom_ids = []
            expired_fixed_sessions = []
            
            for s in sessions:
                raw_event_time = s.get("event_time")
                if isinstance(raw_event_time, str):
                    try:
                        parsed_time = datetime.fromisoformat(raw_event_time.replace('Z', '+00:00'))
                        event_time = parsed_time.replace(tzinfo=None)
                    except ValueError:
                        continue
                elif isinstance(raw_event_time, datetime):
                    event_time = raw_event_time.replace(tzinfo=None)
                else:
                    continue
                    
                expiration_time = event_time + timedelta(minutes=5)
                
                if now >= expiration_time:
                    if s.get("type") == "custom":
                        expired_custom_ids.append(s["id"])
                    elif s.get("type") == "fixed":
                        expired_fixed_sessions.append(s)
            
            if expired_custom_ids:
                supabase.table("sessions").delete().in_("id", expired_custom_ids).execute()
                print(f"🧹 [Auto-Cleanup] Removed {len(expired_custom_ids)} expired custom sessions from DB.")
                
            for fs in expired_fixed_sessions:
                supabase.table("attendees").delete().eq("session_id", fs["id"]).execute()
                
                raw_event_time = fs.get("event_time")
                parsed_time = datetime.fromisoformat(raw_event_time.replace('Z', '+00:00'))
                new_event_time = parsed_time + timedelta(days=1)
                
                supabase.table("sessions").update({"event_time": new_event_time.isoformat()}).eq("id", fs["id"]).execute()
                print(f"🔄 [Auto-Cleanup] Cleared attendees and rolled over fixed session '{fs.get('title')}' to {new_event_time}.")
                
        except Exception as e:
            print(f"❌ [Auto-Cleanup Error]: {e}")
            
        await asyncio.sleep(60)

@router.get("/", response_model=dict)
def get_sessions():
    supabase = get_supabase()
    
    # 1. Fetch sessions
    sessions_res = supabase.table("sessions").select("*").execute()
    db_sessions = sessions_res.data
    
    # 2. Fetch all attendees to calculate counts
    attendees_res = supabase.table("attendees").select("session_id").execute()
    attendee_counts = {}
    for a in attendees_res.data:
        sid = a["session_id"]
        attendee_counts[sid] = attendee_counts.get(sid, 0) + 1
        
    now = datetime.now()
    active_sessions = []
    
    for s in db_sessions:
        raw_event_time = s.get("event_time")
        if isinstance(raw_event_time, str):
            try:
                parsed_time = datetime.fromisoformat(raw_event_time.replace('Z', '+00:00'))
                event_time = parsed_time.replace(tzinfo=None)
            except ValueError:
                event_time = now
        elif isinstance(raw_event_time, datetime):
            event_time = raw_event_time.replace(tzinfo=None)
        else:
            event_time = now

        # Only custom sessions are filtered out if they are strictly in the past
        if s.get("type") == "custom" and event_time < now:
            continue
            
        # Attach current count
        s["current_participants"] = attendee_counts.get(s["id"], 0)
        active_sessions.append(s)
        
    fixed = [s for s in active_sessions if s["type"] == "fixed"]
    custom = [s for s in active_sessions if s["type"] == "custom"]
    
    return {"fixed": fixed, "custom": custom}

@router.post("/", response_model=dict)
def create_session(payload: dict):
    supabase = get_supabase()
    session_id = str(uuid.uuid4())
    
    new_session = {
        "id": session_id,
        "title": payload.get("title", "새로운 세션"),
        "type": "custom",
        "location": payload.get("location", ""),
        "event_time": payload.get("event_time", datetime.now().isoformat()),
        "max_participants": payload.get("max_participants", 4),
        "created_by": payload.get("created_by", "current_user_id"),
        "created_at": datetime.now().isoformat()
    }
    
    try:
        session_res = supabase.table("sessions").insert(new_session).execute()
        created_session = session_res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")
    
    # Auto-join the creator if possible
    creator_nickname = payload.get("creator_nickname")
    if creator_nickname:
        attendee = {
            "session_id": session_id,
            "user_id": creator_nickname,
            "time_preference": None
        }
        try:
            supabase.table("attendees").insert(attendee).execute()
        except:
            pass # Ignore attendee failures for now if any constraints fail
            
    # Refresh current attendees count for return
    created_session["current_participants"] = 1 if creator_nickname else 0
    return {"message": "Session created", "session": created_session}

@router.post("/{session_id}/join")
def join_session(session_id: str, payload: dict):
    supabase = get_supabase()
    user_id = payload.get("user_id")
    time_preference = payload.get("time_preference")
    
    session_res = supabase.table("sessions").select("*").eq("id", session_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = session_res.data[0]
        
    event_time_raw = session.get("event_time")
    if isinstance(event_time_raw, str):
        try:
            parsed_time = datetime.fromisoformat(event_time_raw.replace('Z', '+00:00'))
            event_time = parsed_time.replace(tzinfo=None)
        except ValueError:
            event_time = datetime.now()
    elif isinstance(event_time_raw, datetime):
        event_time = event_time_raw.replace(tzinfo=None)
    else:
        event_time = datetime.now()
            
    now = datetime.now()
         
    if event_time < now:
        raise HTTPException(status_code=400, detail="Cannot join past sessions")
        
    attendees_res = supabase.table("attendees").select("user_id").eq("session_id", session_id).execute()
    current_count = len(attendees_res.data)
    
    if session["type"] != "fixed" and current_count >= session["max_participants"]:
        raise HTTPException(status_code=400, detail="Session is full")
        
    # Check if already joined
    if any(a["user_id"] == user_id for a in attendees_res.data):
        raise HTTPException(status_code=400, detail="Already joined this session")
        
    attendee = {
        "session_id": session_id,
        "user_id": user_id,
        "time_preference": time_preference,
        "joined_at": datetime.now().isoformat()
    }
    
    try:
        supabase.table("attendees").insert(attendee).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Just return success, frontend usually refetches attendees anyway
    return {"message": "Joined session successfully", "attendee": attendee}

@router.post("/{session_id}/cancel")
def cancel_session(session_id: str, payload: dict):
    supabase = get_supabase()
    user_id = payload.get("user_id")
    
    # Try deleting it. If it doesn't exist, Supabase won't complain unless we check data
    try:
        res = supabase.table("attendees").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Not joined in this session")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Cancelled session successfully"}
    
@router.get("/{session_id}/attendees")
def get_attendees(session_id: str):
    supabase = get_supabase()
    
    # Use relation to fetch user details (nickname, name)
    try:
        res = supabase.table("attendees").select("id, session_id, user_id, time_preference, joined_at, users:user_id(nickname, name)").eq("session_id", session_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    formatted_attendees = []
    for a in res.data:
        users_info = a.get("users", {}) or {} # Depending on how PostgREST returns it
        if isinstance(users_info, list) and len(users_info) > 0:
            users_info = users_info[0]
            
        nickname = users_info.get("nickname", a["user_id"])
        name = users_info.get("name", "이름없음")
        
        a_copy = a.copy()
        a_copy["user_nickname"] = f"{nickname} ({name})"
        formatted_attendees.append(a_copy)
        
    return {"attendees": formatted_attendees}
