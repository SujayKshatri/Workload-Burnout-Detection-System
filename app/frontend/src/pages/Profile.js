import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Briefcase, TrendingUp, Calendar } from 'lucide-react';
import { burnoutAPI, usersAPI } from '@/lib/api';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'professional',
    workday_length: user?.workday_length || 8,
    typical_tasks_per_day: user?.typical_tasks_per_day || 5
  });
  const [burnoutHistory, setBurnoutHistory] = useState([]);
  const [averageScore, setAverageScore] = useState(null);

  const loadBurnoutHistory = async () => {
    try {
      const response = await burnoutAPI.getHistory(30);
      setBurnoutHistory(response.data);
      if (response.data.length > 0) {
        const avg = response.data.reduce((sum, score) => sum + score.score, 0) / response.data.length;
        setAverageScore(avg.toFixed(1));
      }
    } catch (error) {
      console.error('Error loading burnout history:', error);
    }
  };

  useEffect(() => {
    loadBurnoutHistory();
  }, []);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await usersAPI.updateProfile({
        name: profile.name,
        role: profile.role,
        workday_length: parseInt(profile.workday_length),
        typical_tasks_per_day: parseInt(profile.typical_tasks_per_day)
      });
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        toast.success('Profile updated successfully!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  const getRiskLevel = (score) => {
    if (score < 40) return { level: 'Low', color: 'text-green-500 bg-green-500/20' };
    if (score < 70) return { level: 'Medium', color: 'text-orange-500 bg-orange-500/20' };
    return { level: 'High', color: 'text-red-500 bg-red-500/20' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-slate-400">Your workload baseline and burnout analysis context</p>
          </div>
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                User Information
              </CardTitle>
              <CardDescription className="text-slate-400">
                Basic information used for personalized analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-slate-800/50 border-slate-700 text-slate-400 mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Context */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                Work Context
              </CardTitle>
              <CardDescription className="text-slate-400">
                Helps calibrate burnout thresholds for your work style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-200">Role</Label>
                <Select value={profile.role} onValueChange={(val) => handleChange('role', val)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Typical Workday (hours)</Label>
                  <Input
                    type="number"
                    min="4"
                    max="16"
                    value={profile.workday_length}
                    onChange={(e) => handleChange('workday_length', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">Tasks Per Day (typical)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={profile.typical_tasks_per_day}
                    onChange={(e) => handleChange('typical_tasks_per_day', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>Context:</strong> As a {profile.role}, your baseline is set for {profile.workday_length}-hour workdays with approximately {profile.typical_tasks_per_day} tasks.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Burnout Baseline */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Burnout Baseline
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your burnout patterns over the past 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {burnoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No burnout data yet</p>
                  <p className="text-sm text-slate-500 mt-2">Calculate your first burnout score to establish a baseline</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="text-sm text-slate-400 mb-1">Average Score</div>
                      <div className="text-3xl font-bold text-white">{averageScore}</div>
                      <Badge className={`mt-2 ${getRiskLevel(parseFloat(averageScore)).color}`}>
                        {getRiskLevel(parseFloat(averageScore)).level} Risk
                      </Badge>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="text-sm text-slate-400 mb-1">Highest Score</div>
                      <div className="text-3xl font-bold text-white">
                        {Math.max(...burnoutHistory.map(s => s.score)).toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">Peak stress period</div>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div className="text-sm text-slate-400 mb-1">Lowest Score</div>
                      <div className="text-3xl font-bold text-white">
                        {Math.min(...burnoutHistory.map(s => s.score)).toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">Best recovery point</div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                    <h4 className="text-white font-medium mb-2">Recent Trend</h4>
                    <div className="flex gap-2">
                      {burnoutHistory.slice(-7).map((score, idx) => (
                        <div key={idx} className="flex-1">
                          <div
                            className="bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(score.score, 5)}px` }}
                          />
                          <div className="text-xs text-slate-500 text-center mt-1">
                            {score.date.slice(-2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-3 text-center">Last 7 days</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
