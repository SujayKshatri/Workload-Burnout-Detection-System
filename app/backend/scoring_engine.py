from datetime import datetime
from typing import List, Dict, Tuple, Any
import statistics
from models import RiskLevel, BurnoutFactors


class BurnoutScoringEngine:
    # Default weights for scoring components
    DEFAULT_WEIGHTS = {
        "workload": 0.25,
        "context_switch": 0.20,
        "overdue": 0.20,
        "long_stint": 0.20,
        "mood_drift": 0.15
    }
    
    def __init__(self, weights: Dict[str, float] = None):
        self.weights = weights if weights else self.DEFAULT_WEIGHTS
    
    async def calculate_workload_index(self, tasks: List[dict], working_hours: int = 8) -> float:
        """Calculate workload based on estimated vs available time"""
        if not tasks:
            return 0.0
        
        active_tasks = [t for t in tasks if t.get("status") != "completed"]
        if not active_tasks:
            return 10.0 # Baseline low workload if everything is done
            
        total_estimated = sum(task.get("estimated_time", 60) for task in active_tasks)
        available_minutes = working_hours * 60
        
        if available_minutes == 0:
            return 100.0
        
        workload_ratio = (total_estimated / available_minutes) * 100
        return min(workload_ratio, 100.0)
    
    async def calculate_context_switch_index(self, activity_logs: List[dict]) -> float:
        """Calculate context switching frequency"""
        if not activity_logs:
            return 0.0
        
        # A start event represents a context switch
        switches = sum(1 for log in activity_logs if log.get("event_type") in ["start", "switch"])
        
        total_duration_mins = sum(log.get("duration", 0) for log in activity_logs if log.get("duration")) / 60
        hours_worked = max(total_duration_mins / 60, 2) # Assume at least 2 hours to avoid skewed division
        
        switches_per_hour = switches / hours_worked
        
        # Normalize: more than 4 switches per hour = 100
        normalized = (switches_per_hour / 4) * 100
        return min(normalized, 100.0)
    
    async def calculate_overdue_index(self, tasks: List[dict]) -> float:
        """Calculate percentage of overdue tasks and high backlog penalty"""
        if not tasks:
            return 0.0
        
        active_tasks = [t for t in tasks if t.get("status") != "completed"]
        if not active_tasks:
            return 0.0
            
        from datetime import timezone
        now = datetime.now(timezone.utc)
        overdue_count = 0
        
        for task in active_tasks:
            deadline = task.get("deadline")
            if deadline:
                if isinstance(deadline, str):
                    # Parse the ISO string and ensure it has timezone info
                    deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
                # Make sure deadline is timezone-aware
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                if deadline < now:
                    overdue_count += 1
        
        overdue_ratio = (overdue_count / len(active_tasks)) * 100
        
        # Also factor in sheer volume of backlog (e.g. > 10 active tasks = 50% penalty)
        backlog_penalty = min((len(active_tasks) / 10) * 50, 50.0)
        
        return min(overdue_ratio + backlog_penalty, 100.0)
    
    async def calculate_long_stint_index(self, activity_logs: List[dict]) -> float:
        """Calculate continuous work without breaks"""
        if not activity_logs:
            return 0.0
            
        max_duration_mins = 0
        
        # Check explicit durations first
        for log in activity_logs:
            if log.get("event_type") == "stop" and log.get("duration"):
                mins = log.get("duration") / 60
                max_duration_mins = max(max_duration_mins, mins)
                
        # If no explicit durations, try timestamp differences
        if max_duration_mins == 0:
            from datetime import timezone
            
            # Create a copy to avoid mutating original logs
            logs_copy = []
            for log in activity_logs:
                new_log = log.copy()
                if isinstance(new_log.get("timestamp"), str):
                    new_log["timestamp"] = datetime.fromisoformat(new_log["timestamp"].replace('Z', '+00:00'))
                if new_log.get("timestamp") and new_log["timestamp"].tzinfo is None:
                    new_log["timestamp"] = new_log["timestamp"].replace(tzinfo=timezone.utc)
                logs_copy.append(new_log)
            
            sorted_logs = sorted(logs_copy, key=lambda x: x.get("timestamp", datetime.now(timezone.utc)))
            
            current_stint = 0
            for i, log in enumerate(sorted_logs):
                if log.get("event_type") == "start":
                    if i + 1 < len(sorted_logs):
                        next_log = sorted_logs[i + 1]
                        if next_log.get("event_type") == "stop":
                            duration = (next_log["timestamp"] - log["timestamp"]).total_seconds() / 60
                            current_stint += duration
                            max_duration_mins = max(max_duration_mins, current_stint)
                        else:
                            current_stint = 0
                            
        # Normalize: 3 hours (180 min) continuous = 100
        normalized = (max_duration_mins / 180) * 100
        return min(normalized, 100.0)
    
    async def calculate_mood_drift_index(self, mood_entries: List[dict]) -> float:
        """Calculate index based on low mood absolute score and negative trend"""
        if not mood_entries:
            return 30.0 # Default baseline if no data
        
        # Sort by date
        sorted_moods = sorted(mood_entries, key=lambda x: x.get("date", ""))
        mood_scores = [entry.get("mood_score", 3) for entry in sorted_moods[-7:]]
        
        if not mood_scores:
            return 30.0
            
        current_avg = statistics.mean(mood_scores[-3:]) if len(mood_scores) >= 3 else statistics.mean(mood_scores)
        
        # Absolute mood penalty: 1=100%, 5=0%
        absolute_penalty = ((5.0 - current_avg) / 4.0) * 100.0
        
        # Trend penalty
        trend_penalty = 0.0
        if len(mood_scores) >= 4:
            first_half = mood_scores[:len(mood_scores)//2]
            second_half = mood_scores[len(mood_scores)//2:]
            avg_first = statistics.mean(first_half)
            avg_second = statistics.mean(second_half)
            
            if avg_second < avg_first:
                decline_ratio = ((avg_first - avg_second) / 4.0) * 100
                trend_penalty = min(decline_ratio * 1.5, 100.0)
                
        return min(absolute_penalty * 0.7 + trend_penalty * 0.3, 100.0)
    
    async def calculate_burnout_score(
        self, 
        tasks: List[dict], 
        activity_logs: List[dict], 
        mood_entries: List[dict],
        working_hours: int = 8
    ) -> Tuple[float, BurnoutFactors]:
        """Calculate overall burnout score"""
        workload = await self.calculate_workload_index(tasks, working_hours)
        context_switch = await self.calculate_context_switch_index(activity_logs)
        overdue = await self.calculate_overdue_index(tasks)
        long_stint = await self.calculate_long_stint_index(activity_logs)
        mood_drift = await self.calculate_mood_drift_index(mood_entries)
        
        factors = BurnoutFactors(
            workload_index=workload,
            context_switch_index=context_switch,
            overdue_index=overdue,
            long_stint_index=long_stint,
            mood_drift_index=mood_drift
        )
        
        # Calculate weighted score
        score = (
            workload * self.weights["workload"] +
            context_switch * self.weights["context_switch"] +
            overdue * self.weights["overdue"] +
            long_stint * self.weights["long_stint"] +
            mood_drift * self.weights["mood_drift"]
        )
        
        return round(score, 2), factors
    
    def get_risk_level(self, score: float) -> RiskLevel:
        """Determine risk level based on score"""
        if score < 40:
            return RiskLevel.LOW
        elif score < 70:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.HIGH
    
    def get_top_contributors(self, factors: BurnoutFactors) -> List[Dict[str, Any]]:
        """Identify top 3 contributing factors"""
        factor_dict = {
            "Long work sessions": factors.long_stint_index,
            "Overlapping deadlines": factors.overdue_index,
            "High workload": factors.workload_index,
            "Frequent task switching": factors.context_switch_index,
            "Mood decrease": factors.mood_drift_index
        }
        
        sorted_factors = sorted(factor_dict.items(), key=lambda x: x[1], reverse=True)
        
        top_3 = [
            {"factor": name, "percentage": round(value, 1)}
            for name, value in sorted_factors[:3]
            if value > 5  # Only include if > 5%
        ]
        
        return top_3
    
    def get_trend(self, current_score: float, previous_scores: List[float]) -> str:
        """Determine if burnout is rising, stable, or falling"""
        if not previous_scores:
            return "stable"
        
        avg_previous = statistics.mean(previous_scores[-5:])
        
        if current_score > avg_previous + 5:
            return "rising"
        elif current_score < avg_previous - 5:
            return "falling"
        else:
            return "stable"
