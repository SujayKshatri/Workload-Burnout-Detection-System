from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import uuid

# Import models and services
from models import (
    UserCreate, UserUpdate, UserLogin, UserResponse, TokenResponse,
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus,
    ActivityLogCreate, ActivityLogResponse,
    MoodEntryCreate, MoodEntryResponse,
    BurnoutScoreResponse, NotificationResponse,
    ForecastResponse
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from scoring_engine import BurnoutScoringEngine
from recommendation_engine import RecommendationEngine
from forecast_engine import ForecastEngine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Workload Burnout Detection System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize engines
scoring_engine = BurnoutScoringEngine()
recommendation_engine = RecommendationEngine()
forecast_engine = ForecastEngine()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ================== AUTH ENDPOINTS ==================

@api_router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user_dict["id"]})
    
    # Return user without password
    user_response = UserResponse(**{k: v for k, v in user_dict.items() if k != "password"})
    
    return TokenResponse(access_token=token, user=user_response)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    token = create_access_token({"sub": user["id"]})
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password"})
    
    return TokenResponse(access_token=token, user=user_response)


@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    """Get current user info"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**{k: v for k, v in user.items() if k != "password"})

@api_router.patch("/users/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update current user profile and settings"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        return UserResponse(**{k: v for k, v in user.items() if k != "password"})
        
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_dict}
    )
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserResponse(**{k: v for k, v in updated_user.items() if k != "password"})

# ================== TASK ENDPOINTS ==================

@api_router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(task_data: TaskCreate, user_id: str = Depends(get_current_user)):
    """Create a new task"""
    task_dict = task_data.model_dump()
    task_dict["id"] = str(uuid.uuid4())
    task_dict["user_id"] = user_id
    task_dict["status"] = TaskStatus.NOT_STARTED
    task_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    task_dict["actual_time"] = 0
    
    # Convert deadline to ISO string if present
    if task_dict.get("deadline"):
        task_dict["deadline"] = task_dict["deadline"].isoformat()
    
    await db.tasks.insert_one(task_dict)
    
    return TaskResponse(**task_dict)


@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[TaskStatus] = None,
    user_id: str = Depends(get_current_user)
):
    """Get all tasks for current user"""
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    return [TaskResponse(**task) for task in tasks]


@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific task"""
    task = await db.tasks.find_one({"id": task_id, "user_id": user_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskResponse(**task)


@api_router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a task"""
    task = await db.tasks.find_one({"id": task_id, "user_id": user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.model_dump(exclude_unset=True)
    
    # Convert deadline to ISO string if present
    if "deadline" in update_data and update_data["deadline"]:
        update_data["deadline"] = update_data["deadline"].isoformat()
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated_task)


@api_router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")


# ================== ACTIVITY LOG ENDPOINTS ==================

@api_router.post("/activity", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def log_activity(
    activity_data: ActivityLogCreate,
    user_id: str = Depends(get_current_user)
):
    """Log an activity event"""
    # Verify task belongs to user
    task = await db.tasks.find_one({"id": activity_data.task_id, "user_id": user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    activity_dict = activity_data.model_dump()
    activity_dict["id"] = str(uuid.uuid4())
    activity_dict["user_id"] = user_id
    activity_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.activity_logs.insert_one(activity_dict)
    
    # Update task actual time if duration provided
    if activity_data.duration and activity_data.event_type == "stop":
        await db.tasks.update_one(
            {"id": activity_data.task_id},
            {"$inc": {"actual_time": activity_data.duration // 60}}  # Convert seconds to minutes
        )
    
    return ActivityLogResponse(**activity_dict)


@api_router.get("/activity", response_model=List[ActivityLogResponse])
async def get_activity_logs(
    task_id: Optional[str] = None,
    days: int = 7,
    user_id: str = Depends(get_current_user)
):
    """Get activity logs"""
    query = {"user_id": user_id}
    if task_id:
        query["task_id"] = task_id
    
    # Get logs from last N days
    since_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    query["timestamp"] = {"$gte": since_date}
    
    logs = await db.activity_logs.find(query, {"_id": 0}).to_list(1000)
    return [ActivityLogResponse(**log) for log in logs]


# ================== MOOD ENTRY ENDPOINTS ==================

@api_router.post("/mood", response_model=MoodEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_mood_entry(
    mood_data: MoodEntryCreate,
    user_id: str = Depends(get_current_user)
):
    """Create or update daily mood entry"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if entry exists for today
    existing = await db.mood_entries.find_one({"user_id": user_id, "date": today})
    
    mood_dict = mood_data.model_dump()
    mood_dict["user_id"] = user_id
    mood_dict["date"] = today
    mood_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing
        mood_dict["id"] = existing["id"]
        await db.mood_entries.update_one(
            {"id": existing["id"]},
            {"$set": mood_dict}
        )
    else:
        # Create new
        mood_dict["id"] = str(uuid.uuid4())
        await db.mood_entries.insert_one(mood_dict)
    
    return MoodEntryResponse(**mood_dict)


@api_router.get("/mood", response_model=List[MoodEntryResponse])
async def get_mood_entries(
    days: int = 30,
    user_id: str = Depends(get_current_user)
):
    """Get mood entries"""
    since_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    entries = await db.mood_entries.find(
        {"user_id": user_id, "date": {"$gte": since_date}},
        {"_id": 0}
    ).to_list(1000)
    
    return [MoodEntryResponse(**entry) for entry in entries]


# ================== BURNOUT SCORE ENDPOINTS ==================

@api_router.post("/burnout/calculate", response_model=BurnoutScoreResponse)
async def calculate_burnout_score(user_id: str = Depends(get_current_user)):
    """Calculate current burnout score"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get user data
    user = await db.users.find_one({"id": user_id})
    working_hours = user.get("working_hours_end", 17) - user.get("working_hours_start", 9)
    
    # Get tasks (active and recent)
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)
    
    # Get activity logs (last 7 days)
    since_date = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    activity_logs = await db.activity_logs.find(
        {"user_id": user_id, "timestamp": {"$gte": since_date}},
        {"_id": 0}
    ).to_list(10000)
    
    # Get mood entries (last 14 days)
    since_mood_date = (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%Y-%m-%d")
    mood_entries = await db.mood_entries.find(
        {"user_id": user_id, "date": {"$gte": since_mood_date}},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate score
    score, factors = await scoring_engine.calculate_burnout_score(
        tasks, activity_logs, mood_entries, working_hours
    )
    
    risk_level = scoring_engine.get_risk_level(score)
    top_contributors = scoring_engine.get_top_contributors(factors)
    
    # Get previous scores for trend
    previous_scores_docs = await db.burnout_scores.find(
        {"user_id": user_id},
        {"_id": 0, "score": 1}
    ).sort("date", -1).limit(5).to_list(5)
    previous_scores = [doc["score"] for doc in previous_scores_docs]
    
    trend = scoring_engine.get_trend(score, previous_scores)
    
    # Generate recommendations
    recommendations = await recommendation_engine.generate_recommendations(
        score, risk_level.value, top_contributors, trend
    )
    
    # Save score
    burnout_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": today,
        "score": score,
        "risk_level": risk_level.value,
        "trend": trend,
        "factors": factors.model_dump(),
        "top_contributors": top_contributors,
        "recommendations": recommendations,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if score exists for today
    existing = await db.burnout_scores.find_one({"user_id": user_id, "date": today})
    if existing:
        burnout_dict["id"] = existing["id"]
        await db.burnout_scores.update_one(
            {"id": existing["id"]},
            {"$set": burnout_dict}
        )
    else:
        await db.burnout_scores.insert_one(burnout_dict)
    
    # Check for high risk and create notification
    if risk_level.value == "high" and not existing:
        await create_notification(
            user_id,
            "High Burnout Risk Detected",
            f"Your burnout score is {score}. Please review the recommendations and consider taking action.",
            "alert"
        )
    
    return BurnoutScoreResponse(**burnout_dict)


@api_router.get("/burnout", response_model=List[BurnoutScoreResponse])
async def get_burnout_scores(
    days: int = 30,
    user_id: str = Depends(get_current_user)
):
    """Get historical burnout scores"""
    since_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    scores = await db.burnout_scores.find(
        {"user_id": user_id, "date": {"$gte": since_date}},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return [BurnoutScoreResponse(**score) for score in scores]


@api_router.get("/burnout/latest", response_model=BurnoutScoreResponse)
async def get_latest_burnout_score(user_id: str = Depends(get_current_user)):
    """Get most recent burnout score"""
    scores = await db.burnout_scores.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(1).to_list(1)
    
    if not scores:
        raise HTTPException(status_code=404, detail="No burnout scores found. Please calculate first.")
    
    return BurnoutScoreResponse(**scores[0])


# ================== FORECAST ENDPOINTS ==================

@api_router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    days: int = 7,
    user_id: str = Depends(get_current_user)
):
    """Get burnout forecast"""
    # Get historical scores
    scores = await db.burnout_scores.find(
        {"user_id": user_id},
        {"_id": 0, "date": 1, "score": 1}
    ).sort("date", -1).limit(30).to_list(30)
    
    forecast = await forecast_engine.forecast_scores(scores, days)
    
    return ForecastResponse(**forecast)


# ================== NOTIFICATION ENDPOINTS ==================

async def create_notification(user_id: str, title: str, message: str, notification_type: str):
    """Helper to create notification"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)


@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user_id: str = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return [NotificationResponse(**notif) for notif in notifications]


@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_current_user)
):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


# ================== DASHBOARD ENDPOINT ==================

@api_router.get("/dashboard")
async def get_dashboard(user_id: str = Depends(get_current_user)):
    """Get dashboard data"""
    # Get latest burnout score
    latest_score = await db.burnout_scores.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    # Get tasks summary
    tasks = await db.tasks.find({"user_id": user_id}).to_list(1000)
    task_summary = {
        "total": len(tasks),
        "not_started": len([t for t in tasks if t["status"] == "not_started"]),
        "in_progress": len([t for t in tasks if t["status"] == "in_progress"]),
        "completed": len([t for t in tasks if t["status"] == "completed"])
    }
    
    # Get unread notifications
    unread_count = await db.notifications.count_documents({
        "user_id": user_id,
        "read": False
    })
    
    return {
        "burnout_score": latest_score,
        "task_summary": task_summary,
        "unread_notifications": unread_count
    }


# ================== ROOT ENDPOINTS ==================

@api_router.get("/")
async def root():
    return {"message": "Workload Burnout Detection API", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
