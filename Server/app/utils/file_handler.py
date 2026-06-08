"""
Complete file handling utilities for audio/video processing.
"""

import os
import shutil
import tempfile
import mimetypes
import logging
from typing import Optional, List
from pathlib import Path

from fastapi import UploadFile

from app.utils.config import get_settings

logger = logging.getLogger(__name__)


# Supported audio/video formats
SUPPORTED_AUDIO_TYPES = {
    "audio/mpeg",      # MP3
    "audio/wav",       # WAV  
    "audio/wave",      # WAV alternative
    "audio/x-wav",     # WAV alternative
    "audio/mp4",       # M4A
    "audio/x-m4a",     # M4A alternative
    "audio/m4a",       # M4A alternative
    "video/mp4",       # MP4
    "audio/ogg",       # OGG
    "audio/flac",      # FLAC
    "audio/webm",      # WebM audio
    "video/webm",      # WebM video
    "application/octet-stream",  # Generic binary (common for large files)
}

SUPPORTED_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".flac", ".webm"
}


def validate_audio_file(file: UploadFile) -> bool:
    """
    Validate uploaded audio file.
    
    Args:
        file: Uploaded file object from FastAPI
        
    Returns:
        True if file is valid, False otherwise
    """
    if not file.filename:
        return False
    
    # Check file extension (primary check)
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"Unsupported extension: {file_ext} for {file.filename}")
        return False
    
    # MIME type check is lenient — some browsers send generic types for audio
    if hasattr(file, 'content_type') and file.content_type:
        mime_type = file.content_type.lower()
        if mime_type not in SUPPORTED_AUDIO_TYPES:
            logger.warning(f"Unrecognized content-type: {mime_type} for {file.filename} — allowing based on extension")
            # Don't reject on MIME type alone — extension is the better check
    
    # Check file size if available (from settings, not hardcoded)
    if hasattr(file, 'size') and file.size:
        settings = get_settings()
        if file.size > settings.MAX_FILE_SIZE:
            logger.warning(f"File too large: {file.size} bytes for {file.filename}")
            return False
        if file.size == 0:
            return False
    
    return True


def get_file_info(file_path: str) -> dict:
    """
    Get information about an audio file.
    
    Args:
        file_path: Path to audio file
        
    Returns:
        Dictionary with file information
    """
    if not os.path.exists(file_path):
        return {
            "exists": False,
            "error": "File not found"
        }
    
    try:
        file_stat = os.stat(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        
        return {
            "exists": True,
            "filename": os.path.basename(file_path),
            "size": file_stat.st_size,
            "size_mb": round(file_stat.st_size / (1024 * 1024), 2),
            "mime_type": mime_type,
            "extension": Path(file_path).suffix.lower(),
            "modified": file_stat.st_mtime,
            "is_valid_size": file_stat.st_size <= get_settings().MAX_FILE_SIZE,
            "is_supported_format": Path(file_path).suffix.lower() in SUPPORTED_EXTENSIONS
        }
    except Exception as e:
        return {
            "exists": True,
            "error": str(e)
        }


def create_temp_directory(prefix: str = "meeting_analysis_") -> str:
    """
    Create a temporary directory for processing.
    
    Args:
        prefix: Prefix for directory name
        
    Returns:
        Path to temporary directory
    """
    return tempfile.mkdtemp(prefix=prefix)


def cleanup_temp_files(directory: Optional[str] = None) -> None:
    """
    Clean up temporary files and directories.
    
    Args:
        directory: Specific directory to clean up. If None, cleans all temp files.
    """
    try:
        if directory and os.path.exists(directory):
            if os.path.isfile(directory):
                os.remove(directory)
                logger.info(f"Cleaned up temp file: {directory}")
            elif os.path.isdir(directory):
                shutil.rmtree(directory)
                logger.info(f"Cleaned up temp directory: {directory}")
        else:
            # Clean up old temp directories
            temp_base = tempfile.gettempdir()
            try:
                for item in os.listdir(temp_base):
                    if item.startswith("meeting_analysis_") or item.startswith("session_") or item.startswith("audio_proc_"):
                        item_path = os.path.join(temp_base, item)
                        if os.path.isdir(item_path):
                            try:
                                # Only remove if older than 1 hour
                                if os.path.getmtime(item_path) < (time.time() - 3600):
                                    shutil.rmtree(item_path)
                                    logger.info(f"Cleaned up old temp directory: {item}")
                            except Exception:
                                pass  # Ignore cleanup errors for individual directories
            except Exception:
                pass  # Ignore if can't list temp directory
                
    except Exception as e:
        logger.warning(f"Cleanup warning: {e}")
        # Don't raise exceptions for cleanup failures


def save_uploaded_file(file: UploadFile, directory: str, filename: Optional[str] = None) -> str:
    """
    Save uploaded file to specified directory.
    
    Args:
        file: Uploaded file object
        directory: Target directory
        filename: Optional custom filename
        
    Returns:
        Path to saved file
    """
    if not filename:
        filename = file.filename or "uploaded_file"
    
    # Ensure directory exists
    os.makedirs(directory, exist_ok=True)
    
    # Create safe filename
    safe_filename = get_safe_filename(filename)
    
    # Create full file path
    file_path = os.path.join(directory, safe_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    return file_path


def get_safe_filename(filename: str) -> str:
    """
    Generate a safe filename by removing/replacing unsafe characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    # Keep only safe characters
    safe_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    safe_filename = "".join(c if c in safe_chars else "_" for c in filename)
    
    # Ensure filename starts with alphanumeric
    if safe_filename and not safe_filename[0].isalnum():
        safe_filename = "file_" + safe_filename
    
    # Ensure filename is not too long
    if len(safe_filename) > 100:
        name, ext = os.path.splitext(safe_filename)
        max_name_length = 100 - len(ext)
        safe_filename = name[:max_name_length] + ext
    
    # Ensure filename is not empty
    if not safe_filename:
        safe_filename = "uploaded_file"
    
    return safe_filename


def estimate_processing_time(file_size: int) -> float:
    """
    Estimate processing time based on file size.
    
    Args:
        file_size: File size in bytes
        
    Returns:
        Estimated processing time in seconds
    """
    # Rough estimate based on file size and API processing time
    mb_size = file_size / (1024 * 1024)
    
    if mb_size <= 1:
        return 10.0  # Small files: ~10 seconds
    elif mb_size <= 5:
        return 30.0  # Medium files: ~30 seconds
    elif mb_size <= 15:
        return 60.0  # Large files: ~1 minute
    else:
        return 120.0  # Very large files: ~2 minutes


def check_disk_space(required_space: int, path: str = None) -> bool:
    """
    Check if there's enough disk space available.
    
    Args:
        required_space: Required space in bytes
        path: Path to check space for (defaults to temp directory)
        
    Returns:
        True if enough space available
    """
    try:
        if path is None:
            path = tempfile.gettempdir()
            
        stat = shutil.disk_usage(path)
        available_space = stat.free
        
        # Require 2x the file size as buffer space
        return available_space > (required_space * 2)
        
    except Exception:
        # If we can't check, assume space is available
        return True


def get_supported_formats() -> List[str]:
    """
    Get list of supported file formats.
    
    Returns:
        List of supported file extensions
    """
    return sorted(list(SUPPORTED_EXTENSIONS))


def get_supported_mime_types() -> List[str]:
    """
    Get list of supported MIME types.
    
    Returns:
        List of supported MIME types
    """
    return sorted(list(SUPPORTED_AUDIO_TYPES))


def validate_file_path(file_path: str) -> bool:
    """
    Validate that a file path is safe and exists.
    
    Args:
        file_path: Path to validate
        
    Returns:
        True if path is valid and safe
    """
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return False
        
        # Check if it's actually a file
        if not os.path.isfile(file_path):
            return False
        
        # Check if file is readable
        if not os.access(file_path, os.R_OK):
            return False
        
        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size == 0 or file_size > get_settings().MAX_FILE_SIZE:
            return False
        
        # Check extension
        file_ext = Path(file_path).suffix.lower()
        if file_ext not in SUPPORTED_EXTENSIONS:
            return False
        
        return True
        
    except Exception:
        return False


def create_session_directory(session_id: str) -> str:
    """
    Create a session-specific temporary directory.
    
    Args:
        session_id: Unique session identifier
        
    Returns:
        Path to session directory
    """
    session_dir = os.path.join(
        tempfile.gettempdir(),
        f"session_{session_id}"
    )
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def get_file_extension(filename: str) -> str:
    """
    Get file extension from filename.
    
    Args:
        filename: Name of the file
        
    Returns:
        File extension (lowercase, with dot)
    """
    return Path(filename).suffix.lower()


def is_audio_file(filename: str) -> bool:
    """
    Check if filename has an audio file extension.
    
    Args:
        filename: Name of the file
        
    Returns:
        True if filename has audio extension
    """
    return get_file_extension(filename) in SUPPORTED_EXTENSIONS


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human readable format.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted size string
    """
    if size_bytes == 0:
        return "0 B"
    
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    
    return f"{size_bytes:.1f} TB"


# Import time for cleanup function
import time