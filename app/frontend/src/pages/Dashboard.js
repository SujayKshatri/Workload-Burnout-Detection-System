import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, LogOut, Plus, Play, Pause, Square, Trash2, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus, Brain, Lightbulb, History, Settings as SettingsIcon, User, Coffee, Zap, Lock } from 'lucide-react';
import { tasksAPI, activityAPI, moodAPI, burnoutAPI, forecastAPI } from '@/lib/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [burnoutScore, setBurnoutScore] = useState(null);
  const [burnoutHistory, setBurnoutHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [moods, setMoods] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showMoodDialog, setShowMoodDialog] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    estimated_time: 60,
    priority: 'medium',
    deadline: ''
  });
  const [moodData, setMoodData] = useState({
    mood_score: 3,
    energy_score: 3,
    sleep_hours: 7
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(false);
      const tasksResponse = await tasksAPI.getAll();
      setTasks(tasksResponse.data);
      const moodsResponse = await moodAPI.getAll(7);
      setMoods(moodsResponse.data);

      try {
        const scoreResponse = await burnoutAPI.getLatest();
        setBurnoutScore(scoreResponse.data);
        const historyResponse = await burnoutAPI.getHistory(7);
        setBurnoutHistory(historyResponse.data.reverse()); // Reverse to get chronological order
      } catch (err) {
        console.log('No burnout score yet');
      }

      try {
        const forecastResponse = await forecastAPI.get(7);
        setForecast(forecastResponse.data);
      } catch (err) {
        console.log('No forecast available yet');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    let interval;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const calculateBurnout = async () => {
    try {
      setCalculating(true);
      const response = await burnoutAPI.calculate();
      setBurnoutScore(response.data);
      toast.success('Burnout score calculated successfully!');

      const historyResponse = await burnoutAPI.getHistory(7);
      setBurnoutHistory(historyResponse.data.reverse());

      const forecastResponse = await forecastAPI.get(7);
      setForecast(forecastResponse.data);
    } catch (error) {
      console.error('Error calculating burnout:', error);
      toast.error('Failed to calculate burnout score');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        estimated_time: parseInt(newTask.estimated_time),
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null
      };

      await tasksAPI.create(taskData);
      toast.success('Task created successfully!');
      setShowNewTaskDialog(false);
      setNewTask({ title: '', description: '', estimated_time: 60, priority: 'medium', deadline: '' });
      loadDashboardData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      await activityAPI.log({
        task_id: activeTimer.id,
        event_type: 'stop',
        duration: timerSeconds
      });

      await tasksAPI.update(activeTimer.id, { status: 'completed' });
      toast.success(`Stopped tracking: ${activeTimer.title}`);
      setActiveTimer(null);
      setTimerSeconds(0);
      loadDashboardData();
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  const handleStartTimer = async (task) => {
    try {
      if (activeTimer && activeTimer.id !== task.id) {
        await handleStopTimer();
      }

      setActiveTimer(task);
      setTimerSeconds(0);
      await activityAPI.log({ task_id: task.id, event_type: 'start' });
      toast.success(`Started tracking: ${task.title}`);
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const handleSubmitMood = async () => {
    try {
      await moodAPI.create(moodData);
      toast.success('Mood logged successfully!');
      setShowMoodDialog(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error logging mood:', error);
      toast.error('Failed to log mood');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'medium': return 'text-orange-500 bg-orange-500/20 border-orange-500/50';
      case 'low': return 'text-green-500 bg-green-500/20 border-green-500/50';
      default: return 'text-slate-500 bg-slate-500/20 border-slate-500/50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const calculateWorkRestRatio = () => {
    const workMins = tasks.reduce((sum, t) => sum + (t.actual_time || 0), 0);

    // Find today's sleep from moods or default to profile/8 hours
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysMood = moods.find(m => m.date === todayStr);
    const sleepHours = todaysMood?.sleep_hours || 8;
    const breakMins = sleepHours * 60;

    return {
      work: `${Math.floor(workMins / 60)}h ${workMins % 60}m`,
      breaks: `${sleepHours}h (sleep + rest)`,
      percentage: (workMins + breakMins) > 0 ? Math.round((workMins / (workMins + breakMins)) * 100) : 0
    };
  };

  const getContextSwitchLevel = () => {
    const completedToday = tasks.filter(t => t.status === 'completed').length;
    if (completedToday === 0) return { level: 'None', color: 'bg-slate-600', label: 'No activity yet' };
    if (completedToday <= 3) return { level: 'Low', color: 'bg-green-500', label: 'Focused work pattern' };
    if (completedToday <= 6) return { level: 'Moderate', color: 'bg-yellow-500', label: 'Some task switching' };
    return { level: 'High', color: 'bg-red-500', label: 'Frequent context switches' };
  };

  const hasData = tasks.length > 0 || burnoutScore !== null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" data-testid="dashboard">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Burnout Detector</h1>
              <p className="text-sm text-slate-400">Diagnostic workload monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/activity')} variant="ghost" className="text-slate-300 hover:bg-slate-800" size="sm">
              <History className="w-4 h-4 mr-2" />
              Activity
            </Button>
            <Button onClick={() => navigate('/profile')} variant="ghost" className="text-slate-300 hover:bg-slate-800" size="sm">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button onClick={() => navigate('/settings')} variant="ghost" className="text-slate-300 hover:bg-slate-800" size="sm">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTimer && (
          <Card className="mb-6 bg-blue-500/10 border-blue-500/30 backdrop-blur-lg">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-300">Currently tracking</div>
                    <div className="text-xl font-bold text-white">{activeTimer.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-mono font-bold text-white">{formatTime(timerSeconds)}</div>
                  <Button onClick={handleStopTimer} className="bg-red-600 hover:bg-red-700">
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">Burnout Score</CardTitle>
                    <CardDescription className="text-slate-400">Diagnostic health metric for workload</CardDescription>
                  </div>
                  <Button onClick={calculateBurnout} disabled={calculating} className="bg-blue-600 hover:bg-blue-700">
                    <Brain className="w-4 h-4 mr-2" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!burnoutScore ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <div className="w-40 h-40 rounded-full border-8 border-dashed border-slate-700 flex items-center justify-center opacity-50">
                          <div className="text-center">
                            <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <div className="text-sm text-slate-500">Not calculated</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="text-white text-lg font-medium">No burnout score yet</div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          Track tasks and log your mood to unlock insights. The system will analyze your workload patterns, context switches, and emotional state to provide a diagnostic burnout assessment.
                        </p>
                        <div className="flex gap-2 mt-4">
                          <Badge variant="outline" className="border-slate-700 text-slate-500">
                            <Lock className="w-3 h-3 mr-1" />
                            Workload analysis
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 text-slate-500">
                            <Lock className="w-3 h-3 mr-1" />
                            Context switches
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 text-slate-500">
                            <Lock className="w-3 h-3 mr-1" />
                            Mood drift
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-yellow-400 mb-1">Preview: Last 7 days</div>
                          <div className="h-20 flex items-end gap-1">
                            {[...Array(7)].map((_, i) => (
                              <div key={i} className="flex-1 bg-slate-700/30 border border-dashed border-slate-600 rounded-t" style={{ height: '20%' }} />
                            ))}
                          </div>
                          <div className="text-xs text-slate-500 mt-2">Trend analysis will appear after first calculation</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <div className={`w-40 h-40 rounded-full border-8 ${getRiskColor(burnoutScore.risk_level)} flex items-center justify-center`}>
                          <div className="text-center">
                            <div className="text-5xl font-bold text-white">{Math.round(burnoutScore.score)}</div>
                            <div className="text-sm text-slate-400">/ 100</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge className={getRiskColor(burnoutScore.risk_level)} variant="outline">{burnoutScore.risk_level.toUpperCase()} RISK</Badge>
                          <Badge variant="outline" className="text-slate-300 border-slate-700">
                            {burnoutScore.trend === 'rising' && <><TrendingUp className="w-3 h-3 mr-1 text-red-500" />Rising</>}
                            {burnoutScore.trend === 'falling' && <><TrendingDown className="w-3 h-3 mr-1 text-green-500" />Falling</>}
                            {burnoutScore.trend === 'stable' && <><Minus className="w-3 h-3 mr-1 text-yellow-500" />Stable</>}
                          </Badge>
                        </div>

                        <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Activity className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-300 mb-2">Trend: Last 7 calculations</div>
                              <div className="h-24 flex items-end gap-1">
                                {burnoutHistory.length > 0 ? burnoutHistory.slice(-7).map((score, idx) => (
                                  <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                                      {score.date.slice(5)}: {Math.round(score.score)}
                                    </div>
                                    <div
                                      className={`w-full rounded-t transition-all ${getRiskColor(score.risk_level).split(' ')[1] || 'bg-blue-500'}`}
                                      style={{ height: `${Math.max(score.score, 5)}%` }}
                                    />
                                  </div>
                                )) : (
                                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Not enough history</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          <h4 className="text-sm font-semibold text-white">Root Cause Analysis:</h4>
                          {burnoutScore.top_contributors.map((contributor, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{contributor.factor}</span>
                                <span className="text-slate-500">{contributor.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${contributor.percentage}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {burnoutScore.recommendations && burnoutScore.recommendations.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3">Intelligent Recommendations</h4>
                            <ul className="space-y-2">
                              {burnoutScore.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-blue-400 mt-1">•</span>
                                  <div className="flex-1">
                                    <div className="text-slate-300">{rec}</div>
                                    <div className="text-xs text-slate-500 mt-1">Expected impact: May reduce burnout by 6-10 points</div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {forecast && forecast.predicted_scores && forecast.predicted_scores.length > 0 ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">7-Day Burnout Forecast</CardTitle>
                  <CardDescription className="text-slate-400">{forecast.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={forecast.dates.map((date, idx) => ({ date: date.slice(5), score: forecast.predicted_scores[idx] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
                    <div className="text-xs text-slate-400">Confidence: {forecast.confidence}%</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900/50 border-slate-800 border-dashed opacity-60">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-slate-600" />
                    Trend Forecast
                  </CardTitle>
                  <CardDescription className="text-slate-400">Available after burnout calculation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                    7-day prediction will appear here
                  </div>
                </CardContent>
              </Card>
            )}

            {hasData ? (
              <>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Work–Rest Ratio</CardTitle>
                    <CardDescription className="text-slate-400">Balance indicator for today</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {calculateWorkRestRatio().percentage > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-slate-300 text-sm">Work: {calculateWorkRestRatio().work}</span>
                          <span className="text-slate-300 text-sm">Breaks: {calculateWorkRestRatio().breaks}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-3">
                          <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${calculateWorkRestRatio().percentage}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">Ratio: {calculateWorkRestRatio().percentage}% work time</p>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-sm">No work sessions tracked yet</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Context Switching</CardTitle>
                    <CardDescription className="text-slate-400">Task transition frequency</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full ${getContextSwitchLevel().color} flex items-center justify-center`}>
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-bold text-white">{getContextSwitchLevel().level}</div>
                        <div className="text-sm text-slate-400">{getContextSwitchLevel().label}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="bg-slate-900/50 border-slate-800 border-dashed opacity-60">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-slate-600" />
                      Work–Rest Ratio
                    </CardTitle>
                    <CardDescription className="text-slate-400">Unlocked after tracking work sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-24 flex items-center justify-center text-slate-500 text-sm">
                      Balance analysis will appear here
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800 border-dashed opacity-60">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-slate-600" />
                      Context Switching
                    </CardTitle>
                    <CardDescription className="text-slate-400">Unlocked after completing tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-24 flex items-center justify-center text-slate-500 text-sm">
                      Switching frequency will appear here
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Daily Check-in</CardTitle>
                <CardDescription className="text-slate-400">Log your emotional state</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">Log Today&apos;s Mood</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Daily Check-in</DialogTitle>
                      <DialogDescription className="text-slate-400">How are you feeling today?</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div>
                        <Label className="text-white mb-2">Mood: {moodData.mood_score}</Label>
                        <Slider value={[moodData.mood_score]} onValueChange={(val) => setMoodData({ ...moodData, mood_score: val[0] })} min={1} max={5} step={1} className="mt-2" />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Bad</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-white mb-2">Energy: {moodData.energy_score}</Label>
                        <Slider value={[moodData.energy_score]} onValueChange={(val) => setMoodData({ ...moodData, energy_score: val[0] })} min={1} max={5} step={1} className="mt-2" />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Exhausted</span>
                          <span>Energized</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-white">Sleep (hours)</Label>
                        <Input type="number" value={moodData.sleep_hours} onChange={(e) => setMoodData({ ...moodData, sleep_hours: parseFloat(e.target.value) })} className="bg-slate-800 border-slate-700 text-white mt-2" />
                      </div>
                      <Button onClick={handleSubmitMood} className="w-full bg-blue-600 hover:bg-blue-700">Submit</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Tasks</CardTitle>
                    <CardDescription className="text-slate-400">{tasks.length} total tasks</CardDescription>
                  </div>
                  <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateTask} className="space-y-4">
                        <div>
                          <Label className="text-white">Title</Label>
                          <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Description</Label>
                          <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Estimated Time (minutes)</Label>
                          <Input type="number" value={newTask.estimated_time} onChange={(e) => setNewTask({ ...newTask, estimated_time: e.target.value })} className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Priority</Label>
                          <Select value={newTask.priority} onValueChange={(val) => setNewTask({ ...newTask, priority: val })}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-white">Deadline (optional)</Label>
                          <Input type="datetime-local" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create Task</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Coffee className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p>No tasks yet</p>
                      <p className="text-sm text-slate-500 mt-2">Create your first task to start tracking workload</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className={`p-3 rounded-lg border transition-colors ${activeTimer?.id === task.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`} data-testid={`task-${task.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-white">{task.title}</h4>
                              <Badge variant={getPriorityColor(task.priority)} className="text-xs">{task.priority}</Badge>
                            </div>
                            {task.description && <p className="text-xs text-slate-400 mb-2">{task.description}</p>}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {task.estimated_time}min
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {task.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartTimer(task)}
                                className="text-slate-400 hover:text-white"
                                disabled={activeTimer?.id === task.id}
                              >
                                {activeTimer?.id === task.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {task.status !== 'not_started' && (
                          <Badge variant="outline" className="text-xs mt-2 border-slate-700 text-slate-400">{task.status.replace('_', ' ')}</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
