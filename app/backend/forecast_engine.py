from datetime import datetime, timedelta
from typing import List
import statistics


class ForecastEngine:
    """Simple trend-based forecasting for burnout scores"""
    
    async def forecast_scores(self, historical_scores: List[dict], days: int = 7) -> dict:
        """Generate forecast for next N days using simple trend analysis"""
        
        if len(historical_scores) < 3:
            return {
                "dates": [],
                "predicted_scores": [],
                "confidence": 0.0,
                "message": "Not enough historical data for forecasting. Need at least 3 days of data."
            }
        
        # Sort by date
        sorted_scores = sorted(historical_scores, key=lambda x: x["date"])
        recent_scores = [s["score"] for s in sorted_scores[-14:]]  # Last 14 days
        
        # Calculate trend using simple linear regression
        trend = self._calculate_trend(recent_scores)
        avg_score = statistics.mean(recent_scores)
        std_dev = statistics.stdev(recent_scores) if len(recent_scores) > 1 else 5
        
        # Generate future dates
        last_date = datetime.strptime(sorted_scores[-1]["date"], "%Y-%m-%d")
        future_dates = [(last_date + timedelta(days=i+1)).strftime("%Y-%m-%d") for i in range(days)]
        
        # Generate predictions
        predicted_scores = []
        for i in range(days):
            # Simple linear projection with some dampening
            predicted = avg_score + (trend * (i + 1) * 0.7)  # 0.7 dampening factor
            # Add slight variation
            predicted = max(0, min(100, predicted))
            predicted_scores.append(round(predicted, 1))
        
        # Calculate confidence based on data consistency
        confidence = self._calculate_confidence(std_dev, len(recent_scores))
        
        # Generate message
        if trend > 2:
            message = f"Burnout risk is projected to increase over the next {days} days. Consider implementing preventive measures now."
        elif trend < -2:
            message = f"Burnout risk is projected to decrease. Your current strategies are working well."
        else:
            message = f"Burnout risk is expected to remain stable over the next {days} days."
        
        return {
            "dates": future_dates,
            "predicted_scores": predicted_scores,
            "confidence": confidence,
            "message": message
        }
    
    def _calculate_trend(self, scores: List[float]) -> float:
        """Calculate trend using simple slope calculation"""
        if len(scores) < 2:
            return 0.0
        
        n = len(scores)
        x = list(range(n))
        y = scores
        
        # Calculate slope (trend)
        x_mean = statistics.mean(x)
        y_mean = statistics.mean(y)
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        return slope
    
    def _calculate_confidence(self, std_dev: float, data_points: int) -> float:
        """Calculate confidence score based on data consistency and quantity"""
        # More data points = higher confidence
        data_confidence = min(data_points / 14, 1.0)  # Max at 14 days
        
        # Lower std deviation = higher confidence
        consistency_confidence = max(0, 1 - (std_dev / 50))  # Normalize by max score range
        
        # Combined confidence
        confidence = (data_confidence * 0.6 + consistency_confidence * 0.4) * 100
        return round(confidence, 1)
