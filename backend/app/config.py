import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Clinic AI Voice Receptionist API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # SQLite Database URL
    DATABASE_URL: str = "sqlite:///./clinic_receptionist.db"
    
    # CORS Origins (allow dashboard frontend)
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "*"
    ]
    
    # Sarvam Samvaad Webhook Secret & API Key
    SARVAM_WEBHOOK_SECRET: str = "sarvam_receptionist_secret_2026"
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "sk_q3h9sw5c_lrWpqiC8fEiwOZlItF1EJtEz")

settings = Settings()
