import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.seed_data import init_db
from app.websocket_manager import realtime_manager
from app.routers import appointments, doctors, sarvam_voice, simulator

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB & seed data
    logger.info("Initializing database and seeding default doctors & appointments...")
    init_db()
    logger.info("Database initialization complete.")
    yield
    logger.info("Shutting down API server...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API and Real-Time Gateway connecting Sarvam Samvaad AI Voice Receptionist with Clinic Admin Dashboard.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class HttpLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        body_bytes = await request.body()
        body_str = body_bytes.decode('utf-8', errors='ignore')
        logger.info(f"HTTP {request.method} {request.url.path} | Query: {request.url.query} | Body: {body_str}")
        
        async def receive():
            return {"type": "http.request", "body": body_bytes}
            
        new_request = Request(request.scope, receive)
        response = await call_next(new_request)
        return response

app.add_middleware(HttpLoggingMiddleware)

# Mount Routers
app.include_router(sarvam_voice.router)
app.include_router(appointments.router)
app.include_router(doctors.router)
app.include_router(simulator.router)

# Real-time WebSocket Endpoint for Dashboard
@app.websocket("/ws/dashboard")
async def websocket_dashboard_endpoint(websocket: WebSocket):
    await realtime_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client pings or queries
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        realtime_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        realtime_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "message": "Backend API is running. Open http://localhost:3000 for the Dashboard UI.",
        "dashboard_ui": "http://localhost:3000",
        "api_docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_ws_connections": len(realtime_manager.active_connections)
    }
