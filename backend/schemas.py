from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    nickname: str
    name: str
    session: str # '오전' or '오후'
    running_level: str # '입문', '초보', '중급', '고급'
    time_preferences: Optional[List[str]] = None
    goal: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    created_at: datetime

class SessionBase(BaseModel):
    title: str
    type: str # 'fixed' or 'custom'
    location: str
    event_time: datetime
    max_participants: int

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: str
    created_by: str
    created_at: datetime

class Attendee(BaseModel):
    id: str
    session_id: str
    user_id: str # This is now the nickname
    time_preference: Optional[str] = None # 'morning' or 'afternoon'
    joined_at: datetime
