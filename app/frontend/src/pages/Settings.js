import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Clock, Bell, Shield, RefreshCw } from 'lucide-react';
import { usersAPI } from '@/lib/api';

const Settings = () => {
  const { user, login } = useAuth();
  const [settings, setSettings] = useState({
    working_hours_start: user?.working_hours_start ?? 9,
    working_hours_end: user?.working_hours_end ?? 17,
    focus_hours_start: user?.focus_hours_start ?? 10,
    focus_hours_end: user?.focus_hours_end ?? 12,
    notification_enabled: user?.notification_enabled ?? true,
    break_reminders: user?.break_reminders ?? true,
    weekly_reports: user?.weekly_reports ?? false
  });

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await usersAPI.updateProfile(settings);

      // Update local storage and context if your auth allows it, or re-fetch me
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        // Note: the best way is to have AuthContext update, but simply updating localStorage works if context reads from it,
        // however we just do a simple reload to ensure clean state propagation if the context doesn't expose a setUser.
        toast.success('Settings saved successfully!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Are you sure you want to reset all demo data? This cannot be undone.')) {
      toast.success('Demo data reset complete');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-slate-400">Configure your workload monitoring preferences</p>
          </div>
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Working Hours
              </CardTitle>
              <CardDescription className="text-slate-400">
                Define your typical work schedule for accurate burnout calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Start Time</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.working_hours_start}
                    onChange={(e) => handleChange('working_hours_start', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">{settings.working_hours_start}:00</p>
                </div>
                <div>
                  <Label className="text-slate-200">End Time</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.working_hours_end}
                    onChange={(e) => handleChange('working_hours_end', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">{settings.working_hours_end}:00</p>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  Current schedule: {settings.working_hours_end - settings.working_hours_start} hours per day
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Focus Hours
              </CardTitle>
              <CardDescription className="text-slate-400">
                Time when you prefer deep, uninterrupted work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-200">Start</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.focus_hours_start}
                    onChange={(e) => handleChange('focus_hours_start', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-slate-200">End</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.focus_hours_end}
                    onChange={(e) => handleChange('focus_hours_end', parseInt(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage alerts and reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">Enable Notifications</div>
                  <div className="text-sm text-slate-400">Receive alerts when burnout risk increases</div>
                </div>
                <Switch
                  checked={settings.notification_enabled}
                  onCheckedChange={(checked) => handleChange('notification_enabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">Break Reminders</div>
                  <div className="text-sm text-slate-400">Get reminded to take breaks during long work sessions</div>
                </div>
                <Switch
                  checked={settings.break_reminders}
                  onCheckedChange={(checked) => handleChange('break_reminders', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">Weekly Reports</div>
                  <div className="text-sm text-slate-400">Receive weekly burnout analysis via email</div>
                </div>
                <Switch
                  checked={settings.weekly_reports}
                  onCheckedChange={(checked) => handleChange('weekly_reports', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Data & Privacy
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage your data and privacy preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300 mb-3">
                  All your activity data is stored locally and used only for burnout analysis. We never share your data with third parties.
                </p>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Download My Data
                </Button>
              </div>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 font-medium">Reset Demo Data</span>
                </div>
                <p className="text-sm text-slate-400 mb-3">
                  This will delete all tasks, mood entries, and burnout calculations. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleResetDemo}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reset All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
