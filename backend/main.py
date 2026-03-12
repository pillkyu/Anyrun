from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, sessions
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start cleanup task
    cleanup_task = asyncio.create_task(sessions.cleanup_expired_sessions())
    yield
    # Shutdown: Cancel task
    cleanup_task.cancel()

app = FastAPI(title="Open Running App API", lifespan=lifespan)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Add vercel domains later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Open Running App API"}
