from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EventType(str, Enum):
    START = "start"
    STOP = "stop"
    IDLE = "idle"
    SWITCH = "switch"


# User Models
class UserBase(BaseModel):
    email: str
    name: str
    timezone: Optional[str] = "UTC"
    working_hours_start: Optional[int] = 9
    working_hours_end: Optional[int] = 17
    notification_enabled: Optional[bool] = True


class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    working_hours_start: Optional[int] = None
    working_hours_end: Optional[int] = None
    focus_hours_start: Optional[int] = None
    focus_hours_end: Optional[int] = None
    notification_enabled: Optional[bool] = None
    break_reminders: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    role: Optional[str] = None
    workday_length: Optional[int] = None
    typical_tasks_per_day: Optional[int] = None


class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: datetime


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project: Optional[str] = None
    estimated_time: Optional[int] = None  # in minutes
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: Optional[datetime] = None
    tags: Optional[List[str]] = []


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project: Optional[str] = None
    estimated_time: Optional[int] = None
    priority: Optional[TaskPriority] = None
    deadline: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    status: TaskStatus
    created_at: datetime
    actual_time: Optional[int] = 0  # tracked time in minutes


# Activity Log Models
class ActivityLogCreate(BaseModel):
    task_id: str
    event_type: EventType
    duration: Optional[int] = None  # in seconds


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    task_id: str
    event_type: EventType
    timestamp: datetime
    duration: Optional[int] = None


# Mood Entry Models
class MoodEntryCreate(BaseModel):
    mood_score: int = Field(ge=1, le=5)
    energy_score: int = Field(ge=1, le=5)
    sleep_hours: Optional[float] = None
    notes: Optional[str] = None


class MoodEntryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    date: str  # YYYY-MM-DD format
    mood_score: int
    energy_score: int
    sleep_hours: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime


# Burnout Score Models
class BurnoutFactors(BaseModel):
    workload_index: float
    context_switch_index: float
    overdue_index: float
    long_stint_index: float
    mood_drift_index: float


class BurnoutScoreResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    date: str
    score: float
    risk_level: RiskLevel
    trend: str  # "rising", "stable", "falling"
    factors: BurnoutFactors
    top_contributors: List[dict]
    recommendations: List[str]
    created_at: datetime


# Notification Models
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # "alert", "warning", "info"


class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime


# Forecast Models
class ForecastResponse(BaseModel):
    dates: List[str]
    predicted_scores: List[float]
    confidence: float
    message: str
