"""
Complete production analysis endpoint router using API services.
"""

import os
import tempfile
import traceback
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from bson import ObjectId
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.models.schemas import AnalysisResponse
from app.services.audio_processor import ProductionAudioProcessor
from app.services.nlp_analyzer import ProductionNLPAnalyzer
from app.utils.file_handler import validate_audio_file, cleanup_temp_files
from app.utils.config import get_settings, Settings
from app.database import analyses_collection
from app.routers.auth import get_current_user

router = APIRouter()

logger = logging.getLogger(__name__)

# Initialize services
audio_processor = ProductionAudioProcessor()


# --- History response models ---

class AnalysisSummary(BaseModel):
    """Lightweight summary returned in history list."""
    id: str
    filename: str
    created_at: str
    action_items_count: int = 0
    decisions_count: int = 0
    word_count: int = 0
    duration_seconds: float = 0
    processing_time: float = 0

    class Config:
        from_attributes = True


class AnalysisHistoryResponse(BaseModel):
    analyses: List[AnalysisSummary]
    total: int


class DeleteResponse(BaseModel):
    message: str


def _analysis_to_summary(doc: dict) -> AnalysisSummary:
    return AnalysisSummary(
        id=str(doc["_id"]),
        filename=doc.get("filename", "Unknown"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)).isoformat(),
        action_items_count=len(doc.get("action_items", [])),
        decisions_count=len(doc.get("key_decisions", [])),
        word_count=doc.get("word_count", 0),
        duration_seconds=doc.get("duration", 0),
        processing_time=doc.get("processing_time", 0),
    )


# --- Existing endpoints ---

def get_settings_dependency() -> Settings:
    """Dependency to get settings."""
    return get_settings()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings_dependency),
    user: dict = Depends(get_current_user),
) -> AnalysisResponse:
    """
    Analyze uploaded meeting recording using OpenAI API services.
    
    This endpoint:
    1. Validates the uploaded audio/video file
    2. Processes audio for optimal transcription
    3. Transcribes using OpenAI Whisper API
    4. Analyzes content using GPT models
    5. Returns structured analysis results
    6. Saves results to the user's history
    
    Supported formats: MP3, WAV, MP4, M4A, OGG, FLAC (max 150MB, up to 120 minutes)
    """
    
    session_id = str(uuid.uuid4())
    temp_dir = None
    temp_filepath = None
    start_time = time.time()
    
    logger.info(f"[ANALYZE] New session {session_id} — file: {file.filename}, size: {getattr(file, 'size', 'unknown')} bytes, user: {user.get('email')}")
    
    try:
        # Validate API key first
        if not settings.validate_api_keys():
            raise HTTPException(
                status_code=500, 
                detail="OpenAI API key not configured or invalid"
            )
        
        # Validate file presence
        if not file.filename:
            raise HTTPException(
                status_code=400, 
                detail="No file provided"
            )
            
        # Validate file format and size
        if not validate_audio_file(file):
            supported_formats = ", ".join(settings.supported_formats_list)
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file format. Supported: {supported_formats.upper()} (max {settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB)"
            )
        
        # Check file size if available
        if hasattr(file, 'size') and file.size:
            if file.size > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large ({file.size / 1024 / 1024:.1f}MB). Maximum size: {settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
                )
        
        # Create temporary directory for this session
        temp_dir = tempfile.mkdtemp(prefix=f"session_{session_id}_")
        safe_filename = f"{session_id}_{file.filename}"
        temp_filepath = os.path.join(temp_dir, safe_filename)
        
        logger.info(f"[ANALYZE] Reading file from request stream...")
        t_read = time.time()
        content = await file.read()
        bytes_read = len(content)
        logger.info(f"[ANALYZE] Read complete: {bytes_read / 1024 / 1024:.1f} MB ({bytes_read} bytes) in {time.time()-t_read:.1f}s")

        with open(temp_filepath, "wb") as temp_file:
            temp_file.write(content)
        del content  # free memory immediately

        logger.info(f"[ANALYZE] File saved: {temp_filepath} ({os.path.getsize(temp_filepath) / 1024 / 1024:.1f} MB)")
        
        # Validate saved file
        if not audio_processor.validate_audio_file(temp_filepath):
            raise HTTPException(
                status_code=400,
                detail="Uploaded file appears to be corrupted or invalid"
            )
        
        # Get audio info for logging
        audio_info = audio_processor.get_audio_info(temp_filepath)
        logger.info(f"Audio info: {audio_info.get('duration', 0):.1f}s, {audio_info.get('sample_rate', 0)}Hz")
        
        # Check duration limits
        if audio_info.get('duration', 0) > settings.MAX_AUDIO_DURATION:
            raise HTTPException(
                status_code=400,
                detail=f"Audio too long ({audio_info['duration']:.1f}s). Maximum: {settings.MAX_AUDIO_DURATION}s"
            )
        
        # Process audio file
        logger.info(f"[ANALYZE] [{time.time()-start_time:.0f}s elapsed] Starting pydub compression...")
        t_proc = time.time()
        processed_audio_path = await audio_processor.process_audio(temp_filepath, session_id)
        processed_size_mb = os.path.getsize(processed_audio_path) / 1024 / 1024
        logger.info(
            f"[ANALYZE] [{time.time()-start_time:.0f}s elapsed] Pydub done in {time.time()-t_proc:.1f}s | "
            f"output: {processed_audio_path} ({processed_size_mb:.1f} MB)"
        )
        if processed_audio_path == temp_filepath:
            logger.warning(
                f"[ANALYZE] Pydub FALLBACK in effect — sending original {processed_size_mb:.1f} MB file to Gemini. "
                f"This will create more chunks and may cause rate limit issues."
            )

        # Analyze using Gemini
        logger.info(f"[ANALYZE] [{time.time()-start_time:.0f}s elapsed] Starting Gemini analysis...")
        t_nlp = time.time()
        async with ProductionNLPAnalyzer() as nlp_analyzer:
            analysis_result = await nlp_analyzer.analyze_meeting(processed_audio_path)
        logger.info(f"[ANALYZE] [{time.time()-start_time:.0f}s elapsed] Gemini analysis done in {time.time()-t_nlp:.1f}s")
        
        # Calculate total processing time
        processing_time = time.time() - start_time
        analysis_result["processing_time"] = round(processing_time, 2)

        # Detect demo fallback — real analysis failed, do NOT silently return fake data
        is_demo = analysis_result.pop("_is_demo_fallback", False)
        fallback_reason = analysis_result.pop("_fallback_reason", "")
        if is_demo:
            logger.error(
                f"[ANALYZE] ANALYSIS PIPELINE FAILED — demo fallback triggered after {processing_time:.1f}s | "
                f"reason: {fallback_reason}"
            )
            if temp_dir:
                background_tasks.add_task(cleanup_temp_files, temp_dir)
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {fallback_reason or 'Gemini API error'}. Check server logs for details.",
            )

        # Calculate word count
        transcript = analysis_result.get("transcript", [])
        word_count = sum(len(seg.get("text", "").split()) for seg in transcript if isinstance(seg, dict))

        # Build response
        response = AnalysisResponse(
            session_id=session_id,
            filename=file.filename,
            **analysis_result
        )
        
        # Save to user's history
        try:
            logger.info(f"[ANALYZE] Saving to MongoDB...")
            t_save = time.time()
            # Serialize Pydantic models to plain dicts for MongoDB
            transcript_data = [seg.dict() if hasattr(seg, 'dict') else seg for seg in response.transcript]
            action_items_data = [item.dict() if hasattr(item, 'dict') else item for item in response.action_items]
            decisions_data = [d.dict() if hasattr(d, 'dict') else d for d in response.key_decisions]

            await analyses_collection.insert_one({
                "user_id": user["_id"],
                "session_id": session_id,
                "filename": file.filename,
                "transcript": transcript_data,
                "summary": response.summary,
                "action_items": action_items_data,
                "key_decisions": decisions_data,
                "processing_time": processing_time,
                "duration": audio_info.get("duration", 0),
                "word_count": word_count,
                "created_at": datetime.now(timezone.utc),
            })
            logger.info(f"[ANALYZE] Saved to MongoDB in {time.time() - t_save:.1f}s — user: {user.get('email')}, session: {session_id}")
        except Exception as save_error:
            logger.error(f"Failed to save analysis to history: {save_error}")
            # Don't fail the request — the analysis still succeeded
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_files, temp_dir)
        
        logger.info(f"[ANALYZE] COMPLETE — session: {session_id}, total: {processing_time:.2f}s")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (they have proper error messages)
        if temp_dir:
            background_tasks.add_task(cleanup_temp_files, temp_dir)
        raise
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Cleanup on error
        if temp_dir:
            background_tasks.add_task(cleanup_temp_files, temp_dir)
        
        # Return generic error to user (don't expose internal details)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing your file. Please try again or contact support if the problem persists."
        )


# --- History endpoints ---

@router.get("/analyses", response_model=AnalysisHistoryResponse)
async def list_analyses(
    user: dict = Depends(get_current_user),
    limit: int = 50,
    skip: int = 0,
):
    """
    List all analyses for the authenticated user, newest first.
    """
    cursor = analyses_collection.find(
        {"user_id": user["_id"]}
    ).sort("created_at", -1).skip(skip).limit(limit)

    total = await analyses_collection.count_documents({"user_id": user["_id"]})
    documents = await cursor.to_list(length=limit)

    return AnalysisHistoryResponse(
        analyses=[_analysis_to_summary(doc) for doc in documents],
        total=total,
    )


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Get a single analysis by ID. Must belong to the authenticated user.
    """
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    doc = await analyses_collection.find_one({
        "_id": oid,
        "user_id": user["_id"],
    })

    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")

    doc["id"] = str(doc.pop("_id"))
    doc.pop("user_id", None)
    doc["created_at"] = doc["created_at"].isoformat()

    return doc


@router.delete("/analyses/{analysis_id}", response_model=DeleteResponse)
async def delete_analysis(
    analysis_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Delete an analysis by ID. Must belong to the authenticated user.
    """
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")

    result = await analyses_collection.delete_one({
        "_id": oid,
        "user_id": user["_id"],
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return DeleteResponse(message="Analysis deleted")


@router.get("/sessions/{session_id}")
async def get_session_status(session_id: str):
    """
    Get status of a processing session.
    """
    return {
        "session_id": session_id,
        "status": "completed",
        "message": "Session processing completed"
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    background_tasks: BackgroundTasks
):
    """
    Delete session data.
    """
    background_tasks.add_task(cleanup_temp_files)

    return {
        "session_id": session_id,
        "message": "Session cleanup initiated"
    }


@router.get("/status")
async def service_status(settings: Settings = Depends(get_settings_dependency)):
    """
    Get detailed service status.
    """
    return {
        "status": "operational",
        "services": {
            "audio_processor": audio_processor.is_ready(),
            "openai_api": settings.validate_api_keys(),
            "temp_directory": os.path.exists(settings.get_temp_dir())
        },
        "limits": {
            "max_file_size_mb": settings.MAX_FILE_SIZE / 1024 / 1024,
            "max_duration_seconds": settings.MAX_AUDIO_DURATION,
            "supported_formats": settings.supported_formats_list
        },
        "version": settings.APP_VERSION
    }
