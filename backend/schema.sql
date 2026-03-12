-- Open Running App Supabase SQL Schema
-- You can copy-paste and run this in your Supabase SQL Editor.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    nickname TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    session TEXT CHECK (session IN ('오전', '오후')) NOT NULL,
    password_hash TEXT NOT NULL,
    running_level TEXT CHECK (running_level IN ('입문', '초보', '중급', '고급')) NOT NULL,
    time_preferences TEXT[],
    goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('fixed', 'custom')) NOT NULL,
    location TEXT NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER NOT NULL,
    created_by TEXT REFERENCES users(nickname) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendees table
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(nickname) ON DELETE CASCADE,
    time_preference TEXT CHECK (time_preference IN ('morning', 'afternoon', NULL)),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, user_id) -- Prevent duplicate joins
);
