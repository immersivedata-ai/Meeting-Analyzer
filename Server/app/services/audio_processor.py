"""
Production audio processor - NO LIBROSA/SOUNDFILE dependencies.
Uses only pydub for basic audio processing.
"""

import os
import tempfile
import asyncio
import logging
import time

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
        self.target_sample_rate = 16000  # Optimal for speech
        self.max_duration = 7200  # 120 minutes
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

        input_size_mb = os.path.getsize(file_path) / (1024 * 1024) if os.path.exists(file_path) else 0
        logger.info(f"[PYDUB] Input: {file_path} ({input_size_mb:.1f} MB)")

        output_dir = tempfile.mkdtemp(prefix="audio_proc_")
        output_path = os.path.join(output_dir, f"{session_id}_processed.mp3")

        try:
            t0 = time.time()
            logger.info("[PYDUB] Step 1/5 — Loading audio file...")
            audio = AudioSegment.from_file(file_path)
            logger.info(
                f"[PYDUB] Step 1/5 — Loaded in {time.time()-t0:.1f}s | "
                f"duration={len(audio)/1000:.1f}s  channels={audio.channels}  rate={audio.frame_rate}Hz"
            )

            if len(audio) == 0:
                raise ValueError("Empty audio data — file may be corrupt")

            if audio.channels > 1:
                logger.info(f"[PYDUB] Step 2/5 — Converting {audio.channels}-ch stereo → mono")
                audio = audio.set_channels(1)
            else:
                logger.info("[PYDUB] Step 2/5 — Already mono, skipping conversion")

            if audio.frame_rate != self.target_sample_rate:
                logger.info(f"[PYDUB] Step 3/5 — Resampling {audio.frame_rate}Hz → {self.target_sample_rate}Hz")
                audio = audio.set_frame_rate(self.target_sample_rate)
            else:
                logger.info(f"[PYDUB] Step 3/5 — Already at {self.target_sample_rate}Hz, skipping resample")

            duration = len(audio) / 1000.0
            if duration > self.max_duration:
                logger.warning(
                    f"[PYDUB] Duration {duration:.1f}s exceeds max {self.max_duration}s "
                    f"— Gemini will handle it but processing may be slow"
                )

            logger.info("[PYDUB] Step 4/5 — Normalizing volume...")
            audio = audio.normalize()

            logger.info(f"[PYDUB] Step 5/5 — Exporting to 64k mono MP3: {output_path}")
            t_export = time.time()
            audio.export(output_path, format="mp3", bitrate="64k")

            if not os.path.exists(output_path):
                raise RuntimeError("Export produced no output file")

            output_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            logger.info(
                f"[PYDUB] Export done in {time.time()-t_export:.1f}s | "
                f"output={output_size_mb:.1f} MB (was {input_size_mb:.1f} MB, "
                f"ratio={output_size_mb/input_size_mb*100:.0f}%) | "
                f"total pydub time={time.time()-t0:.1f}s"
            )
            return output_path

        except Exception as e:
            logger.error(f"[PYDUB] FAILED with {type(e).__name__}: {e}")
            logger.error(
                f"[PYDUB] FALLBACK — returning original file ({input_size_mb:.1f} MB). "
                f"This means the NLP analyzer will use the uncompressed file and may create MORE chunks."
            )
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