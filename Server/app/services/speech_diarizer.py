"""
Google Cloud Speech-to-Text with speaker diarization.
Replaces LLM-based transcription — uses actual voice fingerprinting for accurate speaker labels.
"""

import asyncio
import logging
import os
import time
from typing import List, Dict, Optional

from google.cloud import speech

from app.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SPEAKER_LABELS = ["Speaker 1", "Speaker 2", "Speaker 3", "Speaker 4", "Speaker 5", "Speaker 6"]


class SpeechDiarizer:
    """Google Cloud Speech-to-Text with speaker diarization."""

    def __init__(self):
        self.client = speech.SpeechClient()
        self._ready = True
        logger.info("SpeechDiarizer initialized (Google Cloud STT)")

    def is_ready(self) -> bool:
        return self._ready

    async def transcribe(self, audio_path: str, language: str = "hi-IN") -> List[dict]:
        """
        Transcribe audio with speaker diarization.

        Returns list of dicts with keys: speaker, text, start_time, end_time, confidence.
        """
        t0 = time.time()
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.MP3,
            sample_rate_hertz=16000,
            language_code=language,
            alternative_language_codes=["en-IN"],
            enable_speaker_diarization=True,
            diarization_speaker_count=0,  # auto-detect
            model="latest_long",
            enable_automatic_punctuation=True,
            use_enhanced=True,
        )

        if file_size_mb <= 10:
            return await self._transcribe_inline(audio_path, config, t0)
        return await self._transcribe_chunked(audio_path, config, t0)

    async def _transcribe_inline(self, audio_path: str, config: speech.RecognitionConfig, t0: float) -> List[dict]:
        logger.info(f"[STT] Using inline async recognition")
        with open(audio_path, "rb") as f:
            content = f.read()

        audio = speech.RecognitionAudio(content=content)

        t_start = time.time()
        operation = await asyncio.to_thread(
            self.client.long_running_recognize,
            config=config,
            audio=audio,
        )
        logger.info(f"[STT] LongRunningRecognize started in {time.time() - t_start:.1f}s, waiting...")

        result = await asyncio.to_thread(operation.result, timeout=600)
        return self._parse_result(result, t0)

    async def _transcribe_chunked(self, audio_path: str, config: speech.RecognitionConfig, t0: float) -> List[dict]:
        from pydub import AudioSegment
        import tempfile

        audio = await asyncio.to_thread(AudioSegment.from_file, audio_path)
        total_ms = len(audio)
        chunk_ms = 55 * 1000  # 55 seconds — safe under sync 60s limit

        all_segments: List[dict] = []
        chunk_paths: List[str] = []

        for i, start_ms in enumerate(range(0, total_ms, chunk_ms)):
            end_ms = min(start_ms + chunk_ms, total_ms)
            chunk = audio[start_ms:end_ms]
            fd, tmp = tempfile.mkstemp(suffix=f"_stt_{i:03d}.mp3")
            os.close(fd)
            await asyncio.to_thread(chunk.export, tmp, format="mp3", bitrate="64k")
            chunk_paths.append(tmp)

        total_chunks = len(chunk_paths)
        logger.info(f"[STT] Split into {total_chunks} chunks for sync recognition (~55s each)")

        for i, path in enumerate(chunk_paths):
            t_chunk = time.time()
            try:
                with open(path, "rb") as f:
                    content = f.read()

                chunk_audio = speech.RecognitionAudio(content=content)
                sync_config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.MP3,
                    sample_rate_hertz=16000,
                    language_code=config.language_code,
                    alternative_language_codes=["en-IN"],
                    enable_speaker_diarization=True,
                    diarization_speaker_count=0,
                    model="latest_short",
                    enable_automatic_punctuation=True,
                )

                response = await asyncio.to_thread(
                    self.client.recognize,
                    config=sync_config,
                    audio=chunk_audio,
                )

                offset = i * (chunk_ms / 1000.0)
                segments = self._parse_result(response, t_chunk, offset)
                logger.info(f"[STT] Chunk {i + 1}/{total_chunks}: {len(segments)} segments in {time.time() - t_chunk:.1f}s")
                all_segments.extend(segments)

            except Exception as e:
                logger.warning(f"[STT] Chunk {i + 1}/{total_chunks} failed: {e}")

        for p in chunk_paths:
            try:
                os.remove(p)
            except Exception:
                pass

        if not all_segments:
            raise RuntimeError("All STT chunks failed")

        logger.info(f"[STT] Total: {len(all_segments)} segments in {time.time() - t0:.1f}s")
        return all_segments

    def _parse_result(
        self, result, t0: float, time_offset: float = 0.0
    ) -> List[dict]:
        """Parse Google STT response into our standard transcript format."""
        segments: List[dict] = []

        for result_item in result.results:
            if not result_item.alternatives:
                continue

            alt = result_item.alternatives[0]
            confidence = round(alt.confidence, 3)

            if not alt.words:
                text = alt.transcript.strip()
                if text:
                    segments.append({
                        "speaker": "Speaker 1",
                        "text": text,
                        "start_time": round(time_offset, 2),
                        "end_time": round(time_offset + 1.0, 2),
                        "confidence": confidence,
                    })
                continue

            current_speaker = -1
            current_text: List[str] = []
            current_start = 0.0

            for word in alt.words:
                speaker_tag = getattr(word, "speaker_tag", 0) or 0
                word_start = (word.start_time.total_seconds() if word.start_time else current_start) + time_offset
                word_end = (word.end_time.total_seconds() if word.end_time else word_start + 0.5) + time_offset

                if speaker_tag != current_speaker:
                    if current_text and current_speaker >= 0:
                        speaker_label = SPEAKER_LABELS[current_speaker] if current_speaker < len(SPEAKER_LABELS) else f"Speaker {current_speaker + 1}"
                        segments.append({
                            "speaker": speaker_label,
                            "text": " ".join(current_text).strip(),
                            "start_time": round(current_start, 2),
                            "end_time": round(word_start, 2),
                            "confidence": confidence,
                        })
                    current_speaker = speaker_tag
                    current_text = [word.word]
                    current_start = word_start
                else:
                    current_text.append(word.word)

            if current_text and current_speaker >= 0:
                speaker_label = SPEAKER_LABELS[current_speaker] if current_speaker < len(SPEAKER_LABELS) else f"Speaker {current_speaker + 1}"
                last_word = alt.words[-1]
                last_end = (last_word.end_time.total_seconds() if last_word.end_time else current_start + 1.0) + time_offset
                segments.append({
                    "speaker": speaker_label,
                    "text": " ".join(current_text).strip(),
                    "start_time": round(current_start, 2),
                    "end_time": round(last_end, 2),
                    "confidence": confidence,
                })

        logger.info(f"[STT] Parsed {len(segments)} segments in {time.time() - t0:.1f}s")
        return segments
