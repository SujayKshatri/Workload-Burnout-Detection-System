import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, LogOut, Plus, Play, Square, Trash2, Edit, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus, Calendar, Brain, Lightbulb } from 'lucide-react';
import { tasksAPI, activityAPI, moodAPI, burnoutAPI, forecastAPI } from '@/lib/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [burnoutScore, setBurnoutScore] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  
  // Form states
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load tasks
      const tasksResponse = await tasksAPI.getAll();
      setTasks(tasksResponse.data);
      
      // Try to get latest burnout score
      try {
        const scoreResponse = await burnoutAPI.getLatest();
        setBurnoutScore(scoreResponse.data);
      } catch (err) {
        console.log('No burnout score yet');
      }
      
      // Try to get forecast
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
  };

  const calculateBurnout = async () => {
    try {
      setCalculating(true);
      const response = await burnoutAPI.calculate();
      setBurnoutScore(response.data);
      toast.success('Burnout score calculated successfully!');
      
      // Reload forecast after calculation
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

  const handleToggleTask = async (task) => {
    try {
      let newStatus = task.status;
      let eventType = 'start';
      
      if (task.status === 'not_started') {
        newStatus = 'in_progress';
        eventType = 'start';
      } else if (task.status === 'in_progress') {
        newStatus = 'completed';
        eventType = 'stop';
      }
      
      await tasksAPI.update(task.id, { status: newStatus });
      await activityAPI.log({ task_id: task.id, event_type: eventType });
      
      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 'started'}!`);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" data-testid="dashboard">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Burnout Detector</h1>
              <p className="text-sm text-slate-400">Welcome back, {user?.name}</p>
            </div>
          </div>
          <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Score Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">Burnout Score</CardTitle>
                    <CardDescription className="text-slate-400">Your current workload health metric</CardDescription>
                  </div>
                  <Button onClick={calculateBurnout} disabled={calculating} className="bg-blue-600 hover:bg-blue-700">
                    <Brain className="w-4 h-4 mr-2" />
                    {calculating ? 'Calculating...' : 'Calculate'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {burnoutScore ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <div className="w-40 h-40 rounded-full border-8 ${getRiskColor(burnoutScore.risk_level)} flex items-center justify-center">
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
                            {burnoutScore.trend === 'rising' && <TrendingUp className="w-3 h-3 mr-1 text-red-500" />}
                            {burnoutScore.trend === 'falling' && <TrendingDown className="w-3 h-3 mr-1 text-green-500" />}
                            {burnoutScore.trend === 'stable' && <Minus className="w-3 h-3 mr-1 text-yellow-500" />}
                            {burnoutScore.trend}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-white">Top Contributors:</h4>
                          {burnoutScore.top_contributors.map((contributor, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${contributor.percentage}%` }}></div>
                              </div>
                              <span className="text-xs text-slate-400 w-32">{contributor.factor}</span>
                              <span className="text-xs text-slate-500">{contributor.percentage}%</span>
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
                            <h4 className="text-sm font-semibold text-blue-300 mb-2">Recommendations</h4>
                            <ul className="space-y-1 text-sm text-slate-300">
                              {burnoutScore.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-400 mt-1">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No burnout score calculated yet</p>
                    <Button onClick={calculateBurnout} disabled={calculating}>
                      Calculate Burnout Score
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Forecast */}
            {forecast && forecast.predicted_scores.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">7-Day Forecast</CardTitle>
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mood Check-in */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Daily Check-in</CardTitle>
                <CardDescription className="text-slate-400">Log your mood and energy</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">Log Today's Mood</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Daily Check-in</DialogTitle>
                      <DialogDescription className="text-slate-400">How are you feeling today?</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div>
                        <Label className="text-white mb-2">Mood: {moodData.mood_score}</Label>
                        <Slider value={[moodData.mood_score]} onValueChange={(val) => setMoodData({...moodData, mood_score: val[0]})} min={1} max={5} step={1} className="mt-2" />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Bad</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-white mb-2">Energy: {moodData.energy_score}</Label>
                        <Slider value={[moodData.energy_score]} onValueChange={(val) => setMoodData({...moodData, energy_score: val[0]})} min={1} max={5} step={1} className="mt-2" />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>Exhausted</span>
                          <span>Energized</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-white">Sleep (hours)</Label>
                        <Input type="number" value={moodData.sleep_hours} onChange={(e) => setMoodData({...moodData, sleep_hours: parseFloat(e.target.value)})} className="bg-slate-800 border-slate-700 text-white mt-2" />
                      </div>
                      <Button onClick={handleSubmitMood} className="w-full bg-blue-600 hover:bg-blue-700">Submit</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Tasks */}
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
                          <Input value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Description</Label>
                          <Textarea value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Estimated Time (minutes)</Label>
                          <Input type="number" value={newTask.estimated_time} onChange={(e) => setNewTask({...newTask, estimated_time: e.target.value})} className="bg-slate-800 border-slate-700 text-white mt-1" />
                        </div>
                        <div>
                          <Label className="text-white">Priority</Label>
                          <Select value={newTask.priority} onValueChange={(val) => setNewTask({...newTask, priority: val})}>
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
                          <Input type="datetime-local" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} className="bg-slate-800 border-slate-700 text-white mt-1" />
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
                      <p>No tasks yet. Create one to get started!</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors" data-testid={`task-${task.id}`}>
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
                              {task.deadline && (
                                <>
                                  <Calendar className="w-3 h-3 ml-2" />
                                  {new Date(task.deadline).toLocaleDateString()}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleToggleTask(task)} className="text-slate-400 hover:text-white">
                              {task.status === 'completed' ? '✓' : task.status === 'in_progress' ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
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
