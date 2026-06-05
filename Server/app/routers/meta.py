"""
Meta / health / info / debug endpoints.
"""
import os
import time
import logging

from fastapi import APIRouter

from app.utils.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()


@router.get("/")
async def root():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "endpoints": {
            "analyze": "/api/analyze",
            "auth": "/api/auth",
            "health": "/health",
            "status": "/api/status",
        },
    }


@router.get("/health")
async def health_check():
    try:
        health = {
            "status": "healthy",
            "timestamp": int(time.time()),
            "version": settings.APP_VERSION,
            "services": {
                "openai_api": settings.validate_api_keys(),
                "temp_directory": os.path.exists(settings.get_temp_dir()),
                "disk_space_available": True,
            },
            "configuration": {
                "debug_mode": settings.DEBUG,
                "max_file_size_mb": settings.MAX_FILE_SIZE / 1024 / 1024,
                "max_audio_duration": settings.MAX_AUDIO_DURATION,
                "supported_formats": len(settings.supported_formats_list),
            },
        }
        if not all(health["services"][s] for s in ["openai_api", "temp_directory"]):
            health["status"] = "degraded"
        return health
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}


@router.get("/info")
async def api_info():
    return {
        "api": {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "description": "AI-powered meeting transcription and analysis",
        },
        "capabilities": {
            "transcription": "OpenAI Whisper API",
            "analysis": {
                "summarization": True,
                "action_items": True,
                "sentiment": True,
                "topics": True,
                "decisions": True,
            },
        },
    }


@router.get("/debug/env")
async def debug_env():
    api_key = os.getenv("OPENAI_API_KEY")
    return {
        "api_key_exists": bool(api_key),
        "api_key_length": len(api_key) if api_key else 0,
        "api_key_preview": api_key[:8] + "..." if api_key else "NONE",
    }
