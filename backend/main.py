from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, sessions
app = FastAPI(title="Open Running App API")

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the dynamic Next.js deployments
    allow_credentials=False, # Must be false when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Open Running App API"}
