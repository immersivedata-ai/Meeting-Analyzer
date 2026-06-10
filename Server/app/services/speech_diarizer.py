"""
Deepgram speech-to-text with speaker diarization.
"""

import asyncio
import logging
import os
import time
from typing import List

from deepgram import DeepgramClient

logger = logging.getLogger(__name__)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "").strip()
SPEAKER_LABELS = ["Speaker 1", "Speaker 2", "Speaker 3", "Speaker 4", "Speaker 5", "Speaker 6"]


class SpeechDiarizer:
    """Deepgram STT with speaker diarization."""

    def __init__(self):
        if not DEEPGRAM_API_KEY:
            self._ready = False
            logger.warning("DEEPGRAM_API_KEY not set — SpeechDiarizer disabled")
            return

        self.client = DeepgramClient(api_key=DEEPGRAM_API_KEY)
        self._ready = True
        logger.info("SpeechDiarizer initialized (Deepgram)")

    def is_ready(self) -> bool:
        return self._ready

    async def transcribe(self, audio_path: str, language: str = "hi") -> List[dict]:
        t0 = time.time()
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        logger.info(f"[DEEPGRAM] Transcribing {file_size_mb:.1f} MB — diarization + punctuation")

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        response = await asyncio.to_thread(
            self.client.listen.v1.media.transcribe_file,
            request=audio_bytes,
            model="nova-3",
            language=language,
            diarize_model="latest",
            punctuate=True,
            smart_format=True,
            utterances=True,
        )

        segments = self._parse_response(response)
        logger.info(f"[DEEPGRAM] Done in {time.time() - t0:.1f}s — {len(segments)} segments")
        return segments

    def _parse_response(self, response) -> List[dict]:
        results = getattr(response, "results", None)
        if results is None:
            return []

        utterances = getattr(results, "utterances", None) or []

        segments: List[dict] = []
        for u in utterances:
            speaker_idx = getattr(u, "speaker", 0) or 0
            speaker = SPEAKER_LABELS[speaker_idx] if speaker_idx < len(SPEAKER_LABELS) else f"Speaker {speaker_idx + 1}"
            text = (getattr(u, "transcript", "") or "").strip()
            if text:
                segments.append({
                    "speaker": speaker,
                    "text": text,
                    "start_time": round(getattr(u, "start", 0) or 0, 2),
                    "end_time": round(getattr(u, "end", 0) or 0, 2),
                    "confidence": round(getattr(u, "confidence", 0.9) or 0.9, 3),
                })

        return segments
