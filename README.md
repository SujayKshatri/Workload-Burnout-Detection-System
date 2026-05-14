# 🔋 Workload Burnout Detection System

A preventative analytics platform designed to proactively track, forecast, and mitigate professional burnout. By analyzing task volume, context switching, continuous work stints, and self-reported mood, the system provides real-time risk assessments and actionable recovery recommendations.

## ✨ Features
- **📊 Multi-Factor Burnout Scoring:** An advanced algorithm that weighs workload, context switching, backlogs, and mood to generate a 0-100 risk score.
- **🔮 Trend Forecasting:** Analyzes historical data to predict if your burnout risk is rising, stabilizing, or falling.
- **⏱️ Integrated Activity Tracking:** Track tasks with start/stop events to measure actual vs. estimated effort.
- **💡 Smart Recommendations:** Contextual advice generated based on your specific top burnout contributors.
- **🔔 Proactive Alerts:** Get notified when you transition into a high-risk burnout state.

## 🛠️ Tech Stack
- **Frontend:** React 19, Tailwind CSS, Radix UI, Recharts
- **Backend:** Python 3, FastAPI, Uvicorn, Pydantic
- **Database:** MongoDB (Motor Async Driver)
- **Security:** JWT, bcrypt

## 🏗️ Architecture
The system utilizes a modern decoupled architecture. The React frontend provides a responsive dashboard utilizing headless UI components. It communicates via REST with a FastAPI backend. The backend features dedicated, modular engines (`ScoringEngine`, `RecommendationEngine`, `ForecastEngine`) that process asynchronous queries from MongoDB, ensuring non-blocking performance during heavy analytical calculations.

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+ & Yarn
- MongoDB instance (Local or Atlas)

### Backend Setup
1. `cd app/backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file in the `backend` directory:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=burnout_db
   SECRET_KEY=your_super_secret_key_here
