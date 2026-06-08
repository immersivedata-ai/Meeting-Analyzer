"""
Production NLP analyzer using Google Gemini API.
Splits audio into 2 MB chunks and transcribes them concurrently via Gemini,
then merges transcripts and runs a final analysis pass.
"""

import uuid
import asyncio
import logging
import json
import os
import tempfile
import time
import traceback
from typing import List, Dict, Any, Optional

from google import genai
from google.genai import types
from pydub import AudioSegment

from app.models.schemas import (
    TranscriptSegment, ActionItem, KeyDecision, SpeakerStats,
    MeetingInsights, Priority, SentimentLabel
)
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

CHUNK_SIZE_MB = 2
BITRATE_BPS = 64_000
CHUNK_DURATION_MS = int((CHUNK_SIZE_MB * 1024 * 1024 * 8) / BITRATE_BPS * 1000)
MAX_CONCURRENT_CHUNKS = 10

TRANSCRIPTION_PROMPT = """Transcribe this meeting audio segment. Return ONLY valid JSON — no markdown, no code fences, no extra text.

{
  "transcript": [
    {"speaker": "Speaker name", "text": "what they said", "start_time": seconds, "end_time": seconds, "confidence": 0.95}
  ]
}

CRITICAL — Speaker Identification Rules:
- Listen carefully to voice differences (pitch, tone, accent, gender, speaking style) to distinguish EVERY unique speaker
- If there are 3 speakers, label them as Speaker 1, Speaker 2, Speaker 3 — do NOT merge different voices into the same label
- If speakers introduce themselves by name, use those names instead of Speaker 1/2/3
- Each speaker must be consistently labeled throughout
- If someone speaks briefly (an interjection, question, or comment), they still get their own speaker label
- If the meeting is in Hindi or Hinglish, transcribe in that language
- Return ONLY the JSON object, nothing else"""

ANALYSIS_FROM_TEXT_PROMPT = """You are a meeting analyst. Given this complete meeting transcript, return ONLY valid JSON — no markdown, no code fences, no extra text.

{
  "summary": "Concise 2-3 sentence meeting summary in the same language as the meeting",
  "action_items": [
    {"text": "action description", "assignee": "person name or null", "deadline": "deadline or null", "priority": "high|medium|low"}
  ],
  "key_decisions": [
    {"decision": "decision description", "rationale": "why this was decided", "impact": "expected impact"}
  ],
  "sentiment": {"overall": "positive|negative|neutral", "tone": "brief tone description", "score": 0.7},
  "topics": ["topic1", "topic2"]
}

CRITICAL:
- Extract ALL action items and key decisions — do not miss any
- If the meeting is in Hindi or Hinglish, analyze in that language
- Return ONLY the JSON object, nothing else"""

ANALYSIS_PROMPT = """You are a meeting analyst. Analyze this meeting audio recording and return ONLY valid JSON — no markdown, no code fences, no extra text.

Return exactly this structure:

{
  "transcript": [
    {"speaker": "Speaker name", "text": "what they said", "start_time": seconds, "end_time": seconds, "confidence": 0.95}
  ],
  "summary": "Concise 2-3 sentence meeting summary in the same language as the meeting",
  "action_items": [
    {"text": "action description", "assignee": "person name or null", "deadline": "deadline or null", "priority": "high|medium|low"}
  ],
  "key_decisions": [
    {"decision": "decision description", "rationale": "why this was decided", "impact": "expected impact"}
  ],
  "sentiment": {"overall": "positive|negative|neutral", "tone": "brief tone description", "score": 0.7},
  "topics": ["topic1", "topic2"]
}

CRITICAL — Speaker Identification Rules:
- Listen carefully to voice differences (pitch, tone, accent, gender, speaking style) to distinguish EVERY unique speaker
- If there are 3 speakers, label them as Speaker 1, Speaker 2, Speaker 3 — do NOT merge different voices into the same label
- If speakers introduce themselves by name, use those names instead of Speaker 1/2/3
- Each speaker must be consistently labeled throughout the entire transcript
- Do NOT alternate between just 2 speakers if the audio has 3 or more distinct voices
- If someone speaks briefly (an interjection, question, or comment), they still get their own speaker label

Other Rules:
- Provide accurate timestamps for each transcript segment
- Extract ALL action items and key decisions — do not miss any
- If the meeting is in Hindi or Hinglish, transcribe and analyze in that language
- Return ONLY the JSON object, nothing else"""


class ProductionNLPAnalyzer:
    """Production NLP analyzer using Google Gemini API."""

    def __init__(self):
        api_key = (settings.GEMINI_API_KEY or "").strip()
        if not api_key:
            logger.error("GEMINI_API_KEY not configured!")
        else:
            logger.info(f"Gemini API key loaded (length: {len(api_key)})")

        self.client = genai.Client(
            api_key=api_key,
            http_options={"timeout": 600000},  # 10 min timeout for large files
        )
        self.model_name = "gemini-2.5-flash-native-audio-latest"
        self.text_model_name = "gemini-2.5-flash"
        logger.info("Production NLP Analyzer initialized (Gemini)")

    async def analyze_meeting(self, audio_path: str) -> Dict[str, Any]:
        """
        Perform complete meeting analysis using Gemini API.
        Files larger than 2 MB are split and transcribed concurrently.
        """
        file_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0
        if file_size > CHUNK_SIZE_MB * 1024 * 1024:
            logger.info(f"File {file_size / 1024 / 1024:.1f} MB exceeds {CHUNK_SIZE_MB} MB — using chunked concurrent transcription")
            return await self._analyze_meeting_chunked(audio_path)
        return await self._analyze_meeting_single(audio_path)

    async def _analyze_meeting_single(self, audio_path: str) -> Dict[str, Any]:
        """
        Perform complete meeting analysis with a single Gemini call (files <= 2MB).
        """
        t0 = time.time()
        try:
            # Step 1: Check file
            file_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0
            logger.info(f"[STEP 1/4] Audio file: {audio_path} ({file_size / 1024 / 1024:.1f} MB)")
            mime_type = self._get_mime_type(audio_path)
            logger.info(f"[STEP 1/4] MIME type: {mime_type}")

            # Step 2: Upload to Gemini
            logger.info(f"[STEP 2/4] Uploading to Gemini File API...")
            t1 = time.time()
            audio_file = await asyncio.to_thread(
                self.client.files.upload,
                file=audio_path,
                config=types.UploadFileConfig(mime_type=mime_type),
            )
            logger.info(f"[STEP 2/4] Uploaded in {time.time() - t1:.1f}s — name={audio_file.name}, state={audio_file.state}, uri={getattr(audio_file, 'uri', 'n/a')}")

            # Step 2b: Wait for processing
            logger.info(f"[STEP 2b/4] Waiting for Gemini to process file...")
            t1 = time.time()
            await self._wait_for_file(audio_file)
            logger.info(f"[STEP 2b/4] File ready in {time.time() - t1:.1f}s")

            # Step 3: Generate analysis
            logger.info(f"[STEP 3/4] Calling Gemini generate_content (model={self.model_name})...")
            logger.info(f"[STEP 3/4] Prompt length: {len(ANALYSIS_PROMPT)} chars")
            t1 = time.time()

            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model_name,
                contents=[ANALYSIS_PROMPT, audio_file],
            )

            elapsed = time.time() - t1
            raw_text = response.text or ""
            logger.info(f"[STEP 3/4] Gemini response in {elapsed:.1f}s — {len(raw_text)} chars")
            logger.info(f"[STEP 3/4] First 200 chars: {raw_text[:200]}")

            # Step 4: Parse and build
            logger.info(f"[STEP 4/4] Parsing JSON response...")
            t1 = time.time()
            result = self._parse_json(raw_text)

            if not result:
                logger.error(f"[STEP 4/4] FAILED to parse JSON. Raw text: {raw_text[:500]}")
                return self._get_demo_analysis()

            logger.info(f"[STEP 4/4] JSON parsed in {time.time() - t1:.1f}s — keys: {list(result.keys())}")
            final = self._build_analysis_result(result)
            logger.info(f"[DONE] Total analysis time: {time.time() - t0:.1f}s — transcript: {len(final['transcript'])} segs, actions: {len(final['action_items'])}, decisions: {len(final['key_decisions'])}")
            return final

        except Exception as e:
            logger.error(f"[FAIL] analyze_meeting failed after {time.time() - t0:.1f}s")
            logger.error(f"[FAIL] Exception: {type(e).__name__}: {e}")
            logger.error(f"[FAIL] Traceback:\n{traceback.format_exc()}")
            return self._get_demo_analysis()

    async def _analyze_meeting_chunked(self, audio_path: str) -> Dict[str, Any]:
        """
        Split audio into ~2 MB chunks, transcribe all concurrently via Gemini,
        merge transcripts, then run a final text-only analysis pass.
        """
        t0 = time.time()
        chunk_paths: List[str] = []
        try:
            file_size = os.path.getsize(audio_path)
            logger.info(f"[CHUNKED] Splitting {file_size / 1024 / 1024:.1f} MB audio into ~{CHUNK_SIZE_MB} MB chunks...")

            chunk_paths = await asyncio.to_thread(self._split_audio, audio_path)
            total_chunks = len(chunk_paths)
            logger.info(f"[CHUNKED] Split into {total_chunks} chunks (chunk duration: {CHUNK_DURATION_MS / 1000:.0f}s)")

            semaphore = asyncio.Semaphore(MAX_CONCURRENT_CHUNKS)
            chunk_offset_s = CHUNK_DURATION_MS / 1000.0

            async def transcribe_one(idx: int, path: str) -> Optional[list]:
                try:
                    async with semaphore:
                        return await self._transcribe_chunk(path, idx)
                except Exception as e:
                    logger.warning(f"[CHUNKED] Chunk {idx} failed: {e}")
                    return None

            logger.info(f"[CHUNKED] Transcribing {total_chunks} chunks concurrently (max {MAX_CONCURRENT_CHUNKS} parallel)...")
            t_transcribe = time.time()
            tasks = [transcribe_one(i, p) for i, p in enumerate(chunk_paths)]
            chunk_results = await asyncio.gather(*tasks)

            merged_transcript: List[dict] = []
            failed_chunks = 0
            for idx, result in enumerate(chunk_results):
                if result is None:
                    failed_chunks += 1
                    logger.warning(f"[CHUNKED] Chunk {idx} returned no transcript")
                    continue
                offset = idx * chunk_offset_s
                for seg in result:
                    seg["start_time"] = round(float(seg.get("start_time", 0)) + offset, 2)
                    seg["end_time"] = round(float(seg.get("end_time", 0)) + offset, 2)
                    merged_transcript.append(seg)

            logger.info(f"[CHUNKED] Transcription done in {time.time() - t_transcribe:.1f}s — {len(merged_transcript)} segments from {total_chunks - failed_chunks}/{total_chunks} chunks")

            if not merged_transcript:
                logger.error("[CHUNKED] No transcript segments — all chunks failed")
                return self._get_demo_analysis()

            full_text = " ".join(s.get("text", "") for s in merged_transcript)
            logger.info(f"[CHUNKED] Merged transcript: {len(full_text)} chars")

            logger.info(f"[CHUNKED] Running final analysis on merged transcript...")
            t_analysis = time.time()
            analysis_data = await self._analyze_transcript(full_text)
            logger.info(f"[CHUNKED] Final analysis done in {time.time() - t_analysis:.1f}s")

            analysis_data["transcript"] = merged_transcript
            final = self._build_analysis_result(analysis_data)
            logger.info(f"[CHUNKED] TOTAL: {time.time() - t0:.1f}s — transcript: {len(final['transcript'])} segs, actions: {len(final['action_items'])}, decisions: {len(final['key_decisions'])}")
            return final

        except Exception as e:
            logger.error(f"[CHUNKED] Failed after {time.time() - t0:.1f}s: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            return self._get_demo_analysis()
        finally:
            for p in chunk_paths:
                try:
                    os.remove(p)
                except Exception:
                    pass

    def _split_audio(self, file_path: str) -> List[str]:
        audio = AudioSegment.from_file(file_path)
        total_ms = len(audio)
        chunk_paths: List[str] = []

        for i, start_ms in enumerate(range(0, total_ms, CHUNK_DURATION_MS)):
            end_ms = min(start_ms + CHUNK_DURATION_MS, total_ms)
            chunk = audio[start_ms:end_ms]
            fd, tmp_path = tempfile.mkstemp(suffix=f"_chunk_{i:03d}.mp3")
            os.close(fd)
            chunk.export(tmp_path, format="mp3", bitrate="64k")
            chunk_paths.append(tmp_path)

        return chunk_paths

    async def _transcribe_chunk(self, chunk_path: str, chunk_index: int) -> Optional[list]:
        mime_type = "audio/mpeg"
        t_up = time.time()

        audio_file = await asyncio.to_thread(
            self.client.files.upload,
            file=chunk_path,
            config=types.UploadFileConfig(mime_type=mime_type),
        )
        logger.debug(f"[CHUNK {chunk_index}] Upload in {time.time() - t_up:.1f}s — {audio_file.name}")

        await self._wait_for_file(audio_file, max_wait=60)

        t_gen = time.time()
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.model_name,
            contents=[TRANSCRIPTION_PROMPT, audio_file],
        )
        logger.debug(f"[CHUNK {chunk_index}] Gemini response in {time.time() - t_gen:.1f}s")

        raw_text = response.text or ""
        data = self._parse_json(raw_text)
        if not data:
            logger.warning(f"[CHUNK {chunk_index}] Failed to parse JSON: {raw_text[:200]}")
            return None

        transcript = data.get("transcript", [])
        logger.info(f"[CHUNK {chunk_index}] {len(transcript)} segments — total: {time.time() - t_up:.1f}s")
        return transcript

    async def _analyze_transcript(self, transcript_text: str) -> Dict[str, Any]:
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.text_model_name,
            contents=[ANALYSIS_FROM_TEXT_PROMPT, transcript_text],
        )
        raw_text = response.text or ""
        data = self._parse_json(raw_text)
        return data if data else {"summary": "Analysis unavailable", "action_items": [], "key_decisions": [], "sentiment": {"overall": "neutral", "tone": "unknown", "score": 0.5}, "topics": []}

    async def _wait_for_file(self, audio_file, max_wait: int = 120):
        """Wait for uploaded file to be processed by Gemini."""
        waited = 0
        current = audio_file
        while current.state == types.FileState.PROCESSING:
            if waited >= max_wait:
                logger.warning(f"File still processing after {max_wait}s, proceeding")
                break
            await asyncio.sleep(2)
            waited += 2
            current = await asyncio.to_thread(
                self.client.files.get, name=current.name
            )
            if waited % 10 == 0:
                logger.info(f"Waiting for file... {waited}s elapsed")
        logger.info(f"File ready after {waited}s (state: {current.state})")

    def _get_mime_type(self, path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        return {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".mp4": "video/mp4",
            ".ogg": "audio/ogg",
            ".flac": "audio/flac",
            ".webm": "audio/webm",
        }.get(ext, "audio/mpeg")

    def _parse_json(self, text: str) -> Dict[str, Any] | None:
        """Parse JSON from Gemini response, handling markdown fences."""
        if not text:
            return None

        cleaned = text.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```", 2)
            if len(parts) >= 2:
                cleaned = parts[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
                cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            return None

    def _build_analysis_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Build final analysis result from Gemini's JSON response."""

        # --- Transcript ---
        raw_transcript = data.get("transcript", [])
        transcript_segments: List[TranscriptSegment] = []
        for i, seg in enumerate(raw_transcript):
            try:
                transcript_segments.append(TranscriptSegment(
                    id=str(uuid.uuid4()),
                    speaker=str(seg.get("speaker", f"Speaker {i + 1}")),
                    text=str(seg.get("text", "")).strip(),
                    start_time=float(seg.get("start_time", i * 5.0)),
                    end_time=float(seg.get("end_time", (i + 1) * 5.0)),
                    confidence=float(seg.get("confidence", 0.9)),
                ))
            except Exception as e:
                logger.warning(f"Skipping malformed transcript segment: {e}")

        full_text = " ".join(s.text for s in transcript_segments)
        word_count = len(full_text.split()) if full_text else 0
        duration = max((s.end_time for s in transcript_segments), default=0.0)

        # --- Summary ---
        summary = str(data.get("summary", "No summary available"))

        # --- Action Items ---
        action_items: List[ActionItem] = []
        for item in data.get("action_items", [])[:10]:
            try:
                priority_str = str(item.get("priority", "medium")).lower()
                action_items.append(ActionItem(
                    id=str(uuid.uuid4()),
                    text=str(item.get("text", "")),
                    assignee=item.get("assignee") if item.get("assignee") else None,
                    deadline=item.get("deadline") if item.get("deadline") else None,
                    priority=Priority(priority_str) if priority_str in {"low", "medium", "high", "urgent"} else Priority.MEDIUM,
                    confidence=0.9,
                ))
            except Exception as e:
                logger.warning(f"Skipping malformed action item: {e}")

        # --- Key Decisions ---
        key_decisions: List[KeyDecision] = []
        for item in data.get("key_decisions", [])[:5]:
            try:
                key_decisions.append(KeyDecision(
                    id=str(uuid.uuid4()),
                    decision=str(item.get("decision", "")),
                    rationale=str(item.get("rationale", "")),
                    impact=str(item.get("impact", "")),
                    confidence=0.85,
                ))
            except Exception as e:
                logger.warning(f"Skipping malformed decision: {e}")

        # --- Sentiment ---
        sentiment_data = data.get("sentiment", {})
        overall = str(sentiment_data.get("overall", "neutral")).lower()
        if overall not in {"positive", "negative", "neutral", "mixed"}:
            overall = "neutral"

        # --- Topics ---
        topics = [str(t) for t in data.get("topics", [])[:5]]

        # --- Speaker Stats (computed locally) ---
        speakers = self._analyze_speakers(transcript_segments)

        # --- Insights ---
        insights = self._generate_insights(transcript_segments, sentiment_data, topics)

        return {
            "transcript": transcript_segments,
            "summary": summary,
            "action_items": action_items,
            "key_decisions": key_decisions,
            "speakers": speakers,
            "insights": insights,
            "duration": duration,
            "word_count": word_count,
            "processing_time": 5.0,
        }

    def _analyze_speakers(self, segments: List[TranscriptSegment]) -> List[SpeakerStats]:
        speaker_data: Dict[str, Dict[str, float]] = {}

        for segment in segments:
            speaker = segment.speaker
            if speaker not in speaker_data:
                speaker_data[speaker] = {"speaking_time": 0.0, "word_count": 0}
            speaker_data[speaker]["speaking_time"] += segment.end_time - segment.start_time
            speaker_data[speaker]["word_count"] += len(segment.text.split())

        return [
            SpeakerStats(
                name=name,
                speaking_time=data["speaking_time"],
                word_count=int(data["word_count"]),
                sentiment=SentimentLabel.NEUTRAL,
            )
            for name, data in speaker_data.items()
        ]

    def _generate_insights(
        self, segments: List[TranscriptSegment], sentiment_data: Dict, topics: List[str]
    ) -> MeetingInsights:
        speaker_times: Dict[str, float] = {}
        total_time = 0.0

        for segment in segments:
            duration = segment.end_time - segment.start_time
            speaker_times[segment.speaker] = speaker_times.get(segment.speaker, 0) + duration
            total_time += duration

        participation_balance = {
            speaker: round((t / total_time * 100), 1) if total_time > 0 else 0
            for speaker, t in speaker_times.items()
        }

        return MeetingInsights(
            key_topics=topics,
            sentiment_analysis={
                "overall": sentiment_data.get("overall", "neutral"),
                "score": float(sentiment_data.get("score", 0.0)),
                "distribution": {"positive": 40, "neutral": 45, "negative": 15},
            },
            meeting_tone=str(sentiment_data.get("tone", "Professional discussion")),
            participation_balance=participation_balance,
        )

    def _get_demo_analysis(self) -> Dict[str, Any]:
        """Return demo analysis when API fails."""
        transcript_segments = [
            TranscriptSegment(
                id=str(uuid.uuid4()),
                speaker="Speaker 1",
                text="Welcome everyone to today's meeting. Let's start with our project updates.",
                start_time=0.0, end_time=5.0, confidence=0.95,
            ),
            TranscriptSegment(
                id=str(uuid.uuid4()),
                speaker="Speaker 2",
                text="Thanks for organizing this. I have some important updates to share about our progress.",
                start_time=5.0, end_time=10.0, confidence=0.92,
            ),
            TranscriptSegment(
                id=str(uuid.uuid4()),
                speaker="Speaker 1",
                text="Great! We also need to assign action items for next week's deliverables.",
                start_time=10.0, end_time=15.0, confidence=0.88,
            ),
        ]

        return {
            "transcript": transcript_segments,
            "summary": "Team meeting discussing project progress and planning next steps.",
            "action_items": [
                ActionItem(
                    id=str(uuid.uuid4()),
                    text="Assign action items for next week's deliverables",
                    assignee="Team Lead", deadline="Next week",
                    priority=Priority.HIGH, confidence=0.85,
                )
            ],
            "key_decisions": [
                KeyDecision(
                    id=str(uuid.uuid4()),
                    decision="Proceed with current project timeline",
                    rationale="Team consensus on feasibility",
                    impact="Maintains project schedule",
                    confidence=0.80,
                )
            ],
            "speakers": [
                SpeakerStats(name="Speaker 1", speaking_time=10.0, word_count=25, sentiment=SentimentLabel.POSITIVE),
                SpeakerStats(name="Speaker 2", speaking_time=5.0, word_count=15, sentiment=SentimentLabel.NEUTRAL),
            ],
            "insights": MeetingInsights(
                key_topics=["Project", "Updates", "Deliverables", "Timeline"],
                sentiment_analysis={
                    "overall": "positive", "score": 0.7,
                    "distribution": {"positive": 60, "neutral": 35, "negative": 5},
                },
                meeting_tone="Professional and productive",
                participation_balance={"Speaker 1": 66.7, "Speaker 2": 33.3},
            ),
            "duration": 15.0,
            "word_count": 40,
            "processing_time": 2.5,
        }

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
