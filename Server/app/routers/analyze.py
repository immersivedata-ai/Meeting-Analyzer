"""
Complete production analysis endpoint router using API services.
"""

import os
import tempfile
import traceback
import uuid
import time
import logging
from typing import Dict, Any

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse

from app.models.schemas import AnalysisResponse
from app.services.audio_processor import ProductionAudioProcessor
from app.services.nlp_analyzer import ProductionNLPAnalyzer
from app.utils.file_handler import validate_audio_file, cleanup_temp_files
from app.utils.config import get_settings, Settings

router = APIRouter()

logger = logging.getLogger(__name__)

# Initialize services
audio_processor = ProductionAudioProcessor()

def get_settings_dependency() -> Settings:
    """Dependency to get settings."""
    return get_settings()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings_dependency)
) -> AnalysisResponse:
    """
    Analyze uploaded meeting recording using OpenAI API services.
    
    This endpoint:
    1. Validates the uploaded audio/video file
    2. Processes audio for optimal transcription
    3. Transcribes using OpenAI Whisper API
    4. Analyzes content using GPT models
    5. Returns structured analysis results
    
    Supported formats: MP3, WAV, MP4, M4A, OGG, FLAC (max 25MB)
    """
    
    session_id = str(uuid.uuid4())
    temp_dir = None
    temp_filepath = None
    start_time = time.time()
    
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
        
        # Save uploaded file
        logger.info(f"Saving uploaded file: {file.filename} ({file.size if hasattr(file, 'size') else 'unknown size'} bytes)")
        
        with open(temp_filepath, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)
        
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
        logger.info(f"Processing audio file: {file.filename}")
        processed_audio_path = await audio_processor.process_audio(
            temp_filepath, session_id
        )
        
        # Analyze using API services
        logger.info("Performing analysis with OpenAI API...")
        async with ProductionNLPAnalyzer() as nlp_analyzer:
            analysis_result = await nlp_analyzer.analyze_meeting(processed_audio_path)
        
        # Calculate total processing time
        processing_time = time.time() - start_time
        analysis_result["processing_time"] = round(processing_time, 2)
        
        # Build response
        response = AnalysisResponse(
            session_id=session_id,
            filename=file.filename,
            **analysis_result
        )
        
        # Schedule cleanup
        background_tasks.add_task(cleanup_temp_files, temp_dir)
        
        logger.info(f"Analysis completed for session: {session_id} in {processing_time:.2f}s")
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

@router.get("/sessions/{session_id}")
async def get_session_status(session_id: str):
    """
    Get status of a processing session.
    
    Note: In this stateless implementation, all sessions are marked as completed.
    In a production system with persistent storage, this would check actual status.
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
    
    Note: In this stateless implementation, this is a no-op.
    In a production system, this would clean up stored session data.
    """
    # In a stateless system, there's nothing to delete
    # But we can trigger cleanup of any remaining temp files
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