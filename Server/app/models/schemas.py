"""
Complete Pydantic models for meeting analysis data structures.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator


class Priority(str, Enum):
    """Action item priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SentimentLabel(str, Enum):
    """Sentiment classification labels."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class ProcessingStatus(str, Enum):
    """Analysis processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TranscriptSegment(BaseModel):
    """Individual transcript segment with timing and speaker info."""
    
    id: str = Field(..., description="Unique segment identifier")
    speaker: str = Field(..., description="Speaker name or identifier")
    text: str = Field(..., description="Transcribed text content")
    start_time: float = Field(..., description="Segment start time in seconds")
    end_time: float = Field(..., description="Segment end time in seconds")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Transcription confidence score")
    
    @validator('end_time')
    def end_time_must_be_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be greater than start_time')
        return v


class ActionItem(BaseModel):
    """Extracted action item from meeting."""
    
    id: str = Field(..., description="Unique action item identifier")
    text: str = Field(..., description="Action item description")
    assignee: Optional[str] = Field(None, description="Person assigned to the action")
    deadline: Optional[str] = Field(None, description="Extracted deadline or due date")
    priority: Priority = Field(Priority.MEDIUM, description="Action item priority")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score")


class KeyDecision(BaseModel):
    """Important decision made during the meeting."""
    
    id: str = Field(..., description="Unique decision identifier")
    decision: str = Field(..., description="Decision description")
    rationale: Optional[str] = Field(None, description="Reasoning behind the decision")
    impact: str = Field(..., description="Expected impact of the decision")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score")


class SpeakerStats(BaseModel):
    """Speaker statistics and information."""
    
    name: str = Field(..., description="Speaker name or identifier")
    speaking_time: float = Field(..., ge=0.0, description="Total speaking time in seconds")
    word_count: int = Field(..., ge=0, description="Total words spoken")
    sentiment: SentimentLabel = Field(..., description="Overall speaker sentiment")


class MeetingInsights(BaseModel):
    """Meeting insights and analytics."""
    
    key_topics: List[str] = Field(default_factory=list, description="Main topics discussed")
    sentiment_analysis: Dict[str, Any] = Field(default_factory=dict, description="Sentiment analysis results")
    meeting_tone: str = Field(..., description="Overall meeting tone description")
    participation_balance: Dict[str, float] = Field(default_factory=dict, description="Speaker participation percentages")


class AnalysisResponse(BaseModel):
    """Complete meeting analysis response."""
    
    session_id: str = Field(..., description="Unique session identifier")
    filename: str = Field(..., description="Original filename")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")
    
    # Core analysis results
    transcript: List[TranscriptSegment] = Field(default_factory=list, description="Full meeting transcript")
    summary: str = Field(..., description="Meeting summary")
    action_items: List[ActionItem] = Field(default_factory=list, description="Extracted action items")
    key_decisions: List[KeyDecision] = Field(default_factory=list, description="Key decisions made")
    
    # Analytics and insights
    speakers: List[SpeakerStats] = Field(default_factory=list, description="Speaker statistics")
    insights: MeetingInsights = Field(..., description="Meeting insights and analytics")
    
    # Metadata
    duration: float = Field(..., ge=0.0, description="Total meeting duration in seconds")
    word_count: int = Field(..., ge=0, description="Total word count")
    processing_time: float = Field(..., ge=0.0, description="Total processing time in seconds")
    
    class Config:
        """Pydantic model configuration."""
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.replace(tzinfo=timezone.utc).isoformat() if v.tzinfo is None else v.isoformat()
        }


class ErrorResponse(BaseModel):
    """Standard error response format."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    session_id: Optional[str] = Field(None, description="Session ID if applicable")


class UploadResponse(BaseModel):
    """File upload response."""
    
    session_id: str = Field(..., description="Session identifier for tracking")
    filename: str = Field(..., description="Uploaded filename")
    file_size: int = Field(..., description="File size in bytes")
    message: str = Field(..., description="Upload status message")


class SessionStatusResponse(BaseModel):
    """Session status response."""
    
    session_id: str = Field(..., description="Session identifier")
    status: ProcessingStatus = Field(..., description="Current processing status")
    progress: float = Field(..., ge=0.0, le=100.0, description="Processing progress percentage")
    message: str = Field(..., description="Status message")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    results_available: bool = Field(False, description="Whether results are ready")


# For backward compatibility - alias SpeakerInfo to SpeakerStats
SpeakerInfo = SpeakerStats


# Export all models
__all__ = [
    "Priority",
    "SentimentLabel", 
    "ProcessingStatus",
    "TranscriptSegment",
    "ActionItem",
    "KeyDecision",
    "SpeakerStats",
    "SpeakerInfo",  # Alias
    "MeetingInsights",
    "AnalysisResponse",
    "ErrorResponse",
    "UploadResponse",
    "SessionStatusResponse"
]