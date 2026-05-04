import requests
import json
import random
from datetime import datetime, timedelta, timezone

BASE_URL = "http://localhost:8000/api"
EMAIL = "sujaykshatri@gmail.com"
PASSWORD = "12345678"
NAME = "Sujay K"

# 1. Login to get token
print(f"Logging in as {EMAIL}...")
login_resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})

if login_resp.status_code != 200:
    print("Login failed! Attempting to register...")
    reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": EMAIL, 
        "password": PASSWORD, 
        "name": NAME
    })
    if reg_resp.status_code == 201:
        print("Registration successful!")
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    else:
        print("Registration also failed:", reg_resp.text)
        exit(1)

token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Successfully authenticated!")

# 2. Create Tasks (Different from User 1)
print("\nCreating tasks...")
tasks = [
    {"title": "Complete Physics Lab Report", "project": "Academics", "estimated_time": 180, "priority": "high", "tags": ["study", "lab"]},
    {"title": "Study for Midterm Exam", "project": "Academics", "estimated_time": 240, "priority": "high", "tags": ["study", "exam"]},
    {"title": "Write CS 101 Programming Assignment", "project": "Academics", "estimated_time": 120, "priority": "high", "tags": ["coding", "assignment"]},
    {"title": "Attend Debate Club Meeting", "project": "Extracurriculars", "estimated_time": 90, "priority": "medium", "tags": ["meeting", "club"]},
    {"title": "Work shift at Library", "project": "Job", "estimated_time": 240, "priority": "low", "tags": ["work"]},
    {"title": "Group Project Sync Call", "project": "Academics", "estimated_time": 45, "priority": "medium", "tags": ["call", "collaboration"]},
    {"title": "Read Chapter 4 for Literature Class", "project": "Academics", "estimated_time": 60, "priority": "medium", "tags": ["reading"]}
]

created_task_ids = []
for task in tasks:
    resp = requests.post(f"{BASE_URL}/tasks", json=task, headers=headers)
    if resp.status_code == 201:
        task_id = resp.json()["id"]
        created_task_ids.append(task_id)
        print(f"  Created task: {task['title']}")
    else:
        print(f"  Failed to create task {task['title']}: {resp.text}")

# 3. Simulate Activity Logs
print("\nSimulating task activity...")
for task_id in created_task_ids:
    requests.post(f"{BASE_URL}/activity", json={"task_id": task_id, "event_type": "start"}, headers=headers)
    
    # Healthy work pattern - not too extreme, lots of completions
    if random.choice([True, True, False]): # 66% chance of completion
        duration = random.randint(1200, 5400) # 20 mins to 1.5 hours (shorter focused chunks)
        requests.post(f"{BASE_URL}/activity", json={"task_id": task_id, "event_type": "stop", "duration": duration}, headers=headers)
        
        requests.patch(f"{BASE_URL}/tasks/{task_id}", json={"status": "completed"}, headers=headers)
        print(f"  Completed task {task_id} with {duration}s duration")
    else:
        print(f"  Started task {task_id} (still in progress)")

# 4. Add Mood Entries (7 days, stable/healthy trend)
print("\nAdding mood and sleep entries for the past 7 days...")
today = datetime.now(timezone.utc)
for i in range(6, -1, -1): # 6 days ago up to today (total 7 days)
    entry_date = today - timedelta(days=i)
    
    # Simulate a healthy, generally stable trend with minor random fluctuations
    mood_score = random.choice([4, 5, 4, 5, 3]) # Mostly 4s and 5s
    energy_score = random.choice([4, 4, 5, 3])  # Mostly solid energy
    sleep_hours = random.uniform(7.0, 8.5)      # Good consistent sleep
    
    mood_data = {
        "mood_score": mood_score,
        "energy_score": energy_score,
        "sleep_hours": round(sleep_hours, 1),
        "notes": f"Simulated stable entry for day -{i}"
    }
    
    resp = requests.post(f"{BASE_URL}/mood", json=mood_data, headers=headers)
    if resp.status_code in [200, 201]:
        print(f"  Added mood block for {entry_date.strftime('%Y-%m-%d')} (Mood: {mood_score}, Sleep: {round(sleep_hours, 1)}h)")

# 5. Calculate Burnout Score
print("\nCalculating final burnout score...")
calc_resp = requests.post(f"{BASE_URL}/burnout/calculate", headers=headers)
if calc_resp.status_code in [200, 201]:
    score_data = calc_resp.json()
    print("\n--- BURNOUT REPORT ---")
    print(f"Overall Score: {score_data.get('score')}")
    print(f"Risk Level: {score_data.get('risk_level')}")
    print(f"Trend: {score_data.get('trend')}")
    print("\nTop Contributors:")
    for c in score_data.get('top_contributors', []):
        print(f"  - {c}")
    print("\nRecommendations:")
    for r in score_data.get('recommendations', []):
        print(f"  * {r}")
else:
    print("Burnout calculation failed:", calc_resp.text)

print(f"\nAll done! 7-day trend Data has been successfully seeded for {EMAIL}")
