"""
Production audio processor - NO LIBROSA/SOUNDFILE dependencies.
Uses only pydub for basic audio processing.
"""

import os
import tempfile
import asyncio
import logging

from pydub import AudioSegment
from pydub.utils import which

from app.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Explicitly set ffmpeg/ffprobe paths for Windows
_ffmpeg_path = which("ffmpeg")
_ffprobe_path = which("ffprobe")
if _ffmpeg_path:
    AudioSegment.converter = _ffmpeg_path
    logger.info(f"FFmpeg found: {_ffmpeg_path}")
else:
    logger.warning("FFmpeg not found in PATH — MP3/MP4/M4A won't work")

if _ffprobe_path:
    AudioSegment.ffprobe = _ffprobe_path
    logger.info(f"FFprobe found: {_ffprobe_path}")
else:
    logger.warning("FFprobe not found in PATH — metadata extraction may fail")


class ProductionAudioProcessor:
    """Production audio processor using only pydub (no Rust dependencies)."""
    
    def __init__(self):
        """Initialize audio processor."""
        self.target_sample_rate = 16000  # Optimal for Whisper API
        self.max_duration = 600  # 10 minutes max for single API call
        self._ready = True
        logger.info("Production Audio Processor initialized (pydub only)")
    
    def is_ready(self) -> bool:
        """Check if service is ready."""
        return self._ready
    
    async def process_audio(self, file_path: str, session_id: str) -> str:
        """
        Process audio file for optimal API transcription using pydub.
        
        Args:
            file_path: Path to input audio file
            session_id: Session identifier for output naming
            
        Returns:
            Path to processed audio file
        """
        try:
            logger.info(f"Processing audio file: {file_path}")
            
            # Validate input file
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Audio file not found: {file_path}")
            
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size > settings.MAX_FILE_SIZE:
                raise ValueError(f"File too large: {file_size} bytes")
            
            # Run processing in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            processed_path = await loop.run_in_executor(
                None, 
                self._process_audio_sync,
                file_path,
                session_id
            )
            
            logger.info(f"Audio processing completed: {processed_path}")
            return processed_path
            
        except Exception as e:
            logger.error(f"Audio processing failed: {str(e)}")
            # Return original file if processing fails (better than crashing)
            return file_path
    
    def _process_audio_sync(self, file_path: str, session_id: str) -> str:
        """Synchronous audio processing implementation using pydub."""
        
        # Create output directory
        output_dir = tempfile.mkdtemp(prefix="audio_proc_")
        output_path = os.path.join(output_dir, f"{session_id}_processed.wav")
        
        try:
            logger.debug("Processing with pydub")
            
            # Load audio with pydub
            audio = AudioSegment.from_file(file_path)
            
            # Validate audio data
            if len(audio) == 0:
                raise ValueError("Empty audio data")
            
            # Convert to mono if stereo
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # Set sample rate to 16kHz (optimal for Whisper)
            audio = audio.set_frame_rate(self.target_sample_rate)
            
            # Check duration and split if too long
            duration = len(audio) / 1000.0  # Convert ms to seconds
            if duration > self.max_duration:
                logger.warning(f"Audio duration {duration:.1f}s exceeds maximum {self.max_duration}s")
                # Truncate to max duration
                max_ms = int(self.max_duration * 1000)
                audio = audio[:max_ms]
            
            # Normalize volume
            audio = audio.normalize()
            
            # Export as WAV for consistent format
            audio.export(output_path, format="wav")
            
            # Verify output file was created
            if not os.path.exists(output_path):
                raise RuntimeError("Failed to create output file")
            
            logger.debug(f"Pydub processing successful: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            # If processing fails, return original file
            return file_path
    
    def get_audio_info(self, file_path: str) -> dict:
        """
        Get audio file information using pydub.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Dictionary with audio information
        """
        try:
            audio = AudioSegment.from_file(file_path)
            return {
                "duration": len(audio) / 1000.0,  # Convert ms to seconds
                "sample_rate": audio.frame_rate,
                "channels": audio.channels,
                "samples": len(audio.raw_data),
                "format": "detected by pydub"
            }
        except Exception as e:
            logger.error(f"Failed to get audio info: {e}")
            return {
                "duration": 0,
                "sample_rate": 0,
                "channels": 0,
                "samples": 0,
                "format": "unknown",
                "error": str(e)
            }
    
    def validate_audio_file(self, file_path: str) -> bool:
        """
        Validate that the file is a proper audio file.
        Falls back to extension check if pydub can't decode.
        """
        try:
            if not os.path.exists(file_path):
                return False

            if os.path.getsize(file_path) == 0:
                return False

            audio = AudioSegment.from_file(file_path)
            return len(audio) > 0

        except Exception:
            ext = os.path.splitext(file_path)[1].lower().lstrip(".")
            if ext in settings.supported_formats_list:
                logger.warning(f"pydub failed to decode {file_path}, accepting by extension")
                return True
            return False
    
    def cleanup_temp_files(self, file_path: str) -> None:
        """
        Clean up temporary audio files.
        
        Args:
            file_path: Path to file/directory to clean up
        """
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
                logger.debug(f"Cleaned up file: {file_path}")
            elif os.path.isdir(file_path):
                import shutil
                shutil.rmtree(file_path)
                logger.debug(f"Cleaned up directory: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {file_path}: {e}")
    
    def estimate_processing_time(self, file_size: int) -> float:
        """
        Estimate processing time based on file size.
        
        Args:
            file_size: File size in bytes
            
        Returns:
            Estimated processing time in seconds
        """
        # Simple estimation: ~2-3 seconds per MB for pydub processing
        mb_size = file_size / (1024 * 1024)
        return max(5.0, mb_size * 2.5)  # Minimum 5 seconds