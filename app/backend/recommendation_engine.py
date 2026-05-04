from typing import List, Dict, Any
import os
from dotenv import load_dotenv

import logging

load_dotenv()
logger = logging.getLogger(__name__)


class RecommendationEngine:
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        self.use_llm = bool(self.api_key)
    
    async def generate_recommendations(
        self, 
        score: float, 
        risk_level: str,
        top_contributors: List[Dict[str, Any]],
        trend: str
    ) -> List[str]:
        """Generate personalized recommendations using LLM with rule-based fallback"""
        
        # Try LLM first
        if self.use_llm:
            try:
                llm_recommendations = await self._generate_llm_recommendations(
                    score, risk_level, top_contributors, trend
                )
                if llm_recommendations:
                    return llm_recommendations
            except Exception as e:
                logger.warning(f"LLM recommendation failed, falling back to rules: {e}")
        
        # Fallback to rule-based
        return self._generate_rule_based_recommendations(score, risk_level, top_contributors, trend)
    
    async def _generate_llm_recommendations(
        self,
        score: float,
        risk_level: str,
        top_contributors: List[Dict[str, Any]],
        trend: str
    ) -> List[str]:
        """Generate recommendations using LLM"""
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
            
            contributors_text = ", ".join([f"{c['factor']} ({c['percentage']}%)" for c in top_contributors])
            
            prompt = f"""A professional has a burnout score of {score}/100 (Risk: {risk_level}, Trend: {trend}).

Top contributing factors:
{contributors_text}

Provide exactly 4-5 specific, actionable recommendations to reduce burnout. Each recommendation should:
- Be one clear sentence
- Be immediately actionable
- Address the top contributors
- Be practical for a working professional

Format: Return ONLY a numbered list, one recommendation per line."""
            
            completion = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a workplace wellness expert who provides actionable, specific recommendations to prevent burnout. Always give exactly 4-5 concrete, actionable suggestions."},
                    {"role": "user", "content": prompt}
                ]
            )
            response = completion.choices[0].message.content
            
            # Parse response into list
            recommendations = []
            for line in response.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    # Remove numbering/bullets
                    clean_line = line.lstrip('0123456789.-•) ').strip()
                    if clean_line:
                        recommendations.append(clean_line)
            
            return recommendations[:5] if recommendations else None
            
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return None
    
    def _generate_rule_based_recommendations(
        self,
        score: float,
        risk_level: str,
        top_contributors: List[Dict[str, Any]],
        trend: str
    ) -> List[str]:
        """Fallback rule-based recommendations"""
        recommendations = []
        
        # Get contributor names
        contributor_names = [c["factor"].lower() for c in top_contributors]
        
        # Long work sessions
        if any("long work" in name or "session" in name for name in contributor_names):
            recommendations.append("Schedule regular 10-minute breaks every 50 minutes using the Pomodoro technique")
            recommendations.append("Set hard stop times for your workday and stick to them")
        
        # Overlapping deadlines
        if any("deadline" in name or "overdue" in name for name in contributor_names):
            recommendations.append("Negotiate deadline extensions for non-critical tasks")
            recommendations.append("Break large tasks into smaller milestones with intermediate deadlines")
        
        # High workload
        if any("workload" in name for name in contributor_names):
            recommendations.append("Delegate or defer lower-priority tasks to reduce immediate workload")
            recommendations.append("Review your task list and identify items that can be eliminated")
        
        # Task switching
        if any("switch" in name for name in contributor_names):
            recommendations.append("Block 2-hour focus periods in your calendar for deep work")
            recommendations.append("Turn off notifications during focused work sessions")
        
        # Mood decrease
        if any("mood" in name for name in contributor_names):
            recommendations.append("Schedule activities you enjoy during breaks to boost mood")
            recommendations.append("Consider talking to a colleague or mentor about workplace stress")
        
        # Add general recommendations based on risk level
        if risk_level == "high":
            recommendations.append("Consider taking a mental health day or half-day off to recharge")
        
        if trend == "rising":
            recommendations.append("Review your workload with your manager to prevent further escalation")
        
        # Limit to 5 recommendations
        return recommendations[:5]
