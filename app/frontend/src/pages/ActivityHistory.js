import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { activityAPI, tasksAPI, moodAPI } from '@/lib/api';
import { Clock, Coffee, Activity, TrendingUp } from 'lucide-react';

const ActivityHistory = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityData();
  }, []);

  const loadActivityData = async () => {
    try {
      const [activityRes, tasksRes, moodsRes] = await Promise.all([
        activityAPI.getAll({ days: 7 }),
        tasksAPI.getAll(),
        moodAPI.getAll(7)
      ]);

      setActivities(activityRes.data);
      setTasks(tasksRes.data);
      setMoods(moodsRes.data);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.title : 'Unknown Task';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const groupedActivities = activities.reduce((acc, activity) => {
    const date = new Date(activity.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {});

  const todaysMood = moods.find(m => m.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Activity History</h1>
            <p className="text-slate-400">Track your work patterns and break intervals</p>
          </div>
          <button onClick={() => window.location.href = '/dashboard'} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition">
            Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading activity history...</div>
        ) : (
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Work Sessions</div>
                    <div className="text-2xl font-bold text-white">
                      {activities.filter(a => a.event_type === 'start').length}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Total Duration</div>
                    <div className="text-2xl font-bold text-white">
                      {formatDuration(activities.reduce((sum, a) => sum + (a.duration || 0), 0))}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Today's Mood</div>
                    <div className="text-2xl font-bold text-white">
                      {todaysMood ? `${todaysMood.mood_score}/5` : 'Not logged'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.keys(groupedActivities).length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No activity recorded yet</p>
                  <p className="text-sm text-slate-500 mt-2">Start tracking tasks to see your work patterns</p>
                </CardContent>
              </Card>
            ) : (
              Object.keys(groupedActivities).sort((a, b) => new Date(b) - new Date(a)).map(date => (
                <Card key={date} className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{date}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {groupedActivities[date].map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <div className="mt-1">
                            {activity.event_type === 'start' && <Clock className="w-4 h-4 text-green-400" />}
                            {activity.event_type === 'stop' && <Clock className="w-4 h-4 text-red-400" />}
                            {activity.event_type === 'idle' && <Coffee className="w-4 h-4 text-yellow-400" />}
                            {activity.event_type === 'switch' && <Activity className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium">{getTaskName(activity.task_id)}</div>
                                <div className="text-sm text-slate-400">
                                  {new Date(activity.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-slate-300 border-slate-600">
                                {activity.event_type}
                              </Badge>
                            </div>
                            {activity.duration && (
                              <div className="text-sm text-slate-500 mt-1">
                                Duration: {formatDuration(activity.duration)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {moods.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Mood Check-ins</CardTitle>
                  <CardDescription className="text-slate-400">Your emotional state over the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {moods.slice(0, 7).map((mood, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <div className="flex-1">
                          <div className="text-white font-medium">{mood.date}</div>
                          <div className="flex gap-4 mt-1 text-sm text-slate-400">
                            <span>Mood: {mood.mood_score}/5</span>
                            <span>Energy: {mood.energy_score}/5</span>
                            {mood.sleep_hours && <span>Sleep: {mood.sleep_hours}h</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-8 rounded ${i < mood.mood_score ? 'bg-blue-500' : 'bg-slate-700'}`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;
