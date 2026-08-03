'use client';

import { useState, useEffect } from 'react';
import { 
  Settings,
  Save,
  RotateCcw,
  Bell,
  Shield,
  DollarSign,
  Clock,
  GamepadIcon,
  Users,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface AdminSettings {
  game: {
    defaultTicketPrice: number;
    defaultMaxPlayers: number;
    defaultDrawInterval: number;
    minTicketPrice: number;
    maxTicketPrice: number;
    autoStartGames: boolean;
    allowManualDraw: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    gameStartAlert: boolean;
    gameEndAlert: boolean;
    lowBalanceAlert: boolean;
    userRegistrationAlert: boolean;
  };
  security: {
    requireApproval: boolean;
    maxDailySpend: number;
    blockSuspiciousActivity: boolean;
    sessionTimeout: number;
  };
  system: {
    maintenanceMode: boolean;
    maxConcurrentGames: number;
    backupInterval: number;
    logRetentionDays: number;
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>({
    game: {
      defaultTicketPrice: 50,
      defaultMaxPlayers: 100,
      defaultDrawInterval: 30,
      minTicketPrice: 5,
      maxTicketPrice: 1000,
      autoStartGames: false,
      allowManualDraw: true
    },
    notifications: {
      emailAlerts: true,
      gameStartAlert: true,
      gameEndAlert: true,
      lowBalanceAlert: true,
      userRegistrationAlert: false
    },
    security: {
      requireApproval: false,
      maxDailySpend: 5000,
      blockSuspiciousActivity: true,
      sessionTimeout: 60
    },
    system: {
      maintenanceMode: false,
      maxConcurrentGames: 5,
      backupInterval: 24,
      logRetentionDays: 30
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'notifications' | 'security' | 'system'>('game');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save settings to backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setSaveMessage({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to save settings. Please try again.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        game: {
          defaultTicketPrice: 50,
          defaultMaxPlayers: 100,
          defaultDrawInterval: 30,
          minTicketPrice: 5,
          maxTicketPrice: 1000,
          autoStartGames: false,
          allowManualDraw: true
        },
        notifications: {
          emailAlerts: true,
          gameStartAlert: true,
          gameEndAlert: true,
          lowBalanceAlert: true,
          userRegistrationAlert: false
        },
        security: {
          requireApproval: false,
          maxDailySpend: 5000,
          blockSuspiciousActivity: true,
          sessionTimeout: 60
        },
        system: {
          maintenanceMode: false,
          maxConcurrentGames: 5,
          backupInterval: 24,
          logRetentionDays: 30
        }
      });
      setSaveMessage({ type: 'success', message: 'Settings reset to defaults' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const updateSettings = (category: keyof AdminSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const tabs = [
    { id: 'game', name: 'Game Settings', icon: GamepadIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Settings }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {saveMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Game Settings */}
        {activeTab === 'game' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Ticket Price (ETB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={settings.game.defaultTicketPrice}
                    onChange={(e) => updateSettings('game', 'defaultTicketPrice', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Max Players
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.game.defaultMaxPlayers}
                    onChange={(e) => updateSettings('game', 'defaultMaxPlayers', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Draw Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.game.defaultDrawInterval}
                    onChange={(e) => updateSettings('game', 'defaultDrawInterval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min/Max Ticket Price Range (ETB)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Min"
                      value={settings.game.minTicketPrice}
                      onChange={(e) => updateSettings('game', 'minTicketPrice', parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Max"
                      value={settings.game.maxTicketPrice}
                      onChange={(e) => updateSettings('game', 'maxTicketPrice', parseFloat(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.game.autoStartGames}
                    onChange={(e) => updateSettings('game', 'autoStartGames', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-start games when player limit is reached</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.game.allowManualDraw}
                    onChange={(e) => updateSettings('game', 'allowManualDraw', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow manual number drawing by admins</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Email Alerts</span>
                    <p className="text-sm text-gray-500">Receive email notifications for important events</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => updateSettings('notifications', 'emailAlerts', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Game Start Notifications</span>
                    <p className="text-sm text-gray-500">Get notified when new games begin</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.gameStartAlert}
                    onChange={(e) => updateSettings('notifications', 'gameStartAlert', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Game End Notifications</span>
                    <p className="text-sm text-gray-500">Get notified when games end or winners are declared</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.gameEndAlert}
                    onChange={(e) => updateSettings('notifications', 'gameEndAlert', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Low Balance Alerts</span>
                    <p className="text-sm text-gray-500">Alert when users have insufficient balance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.lowBalanceAlert}
                    onChange={(e) => updateSettings('notifications', 'lowBalanceAlert', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">User Registration Alerts</span>
                    <p className="text-sm text-gray-500">Get notified when new users register</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.userRegistrationAlert}
                    onChange={(e) => updateSettings('notifications', 'userRegistrationAlert', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security & Safety</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Daily Spend per User (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.security.maxDailySpend}
                    onChange={(e) => updateSettings('security', 'maxDailySpend', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Set to 0 for no limit</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Require Admin Approval</span>
                      <p className="text-sm text-gray-500">Require approval for large transactions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.requireApproval}
                      onChange={(e) => updateSettings('security', 'requireApproval', e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Block Suspicious Activity</span>
                      <p className="text-sm text-gray-500">Automatically block accounts with suspicious patterns</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.blockSuspiciousActivity}
                      onChange={(e) => updateSettings('security', 'blockSuspiciousActivity', e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Concurrent Games
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.system.maxConcurrentGames}
                      onChange={(e) => updateSettings('system', 'maxConcurrentGames', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Backup Interval (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.system.backupInterval}
                      onChange={(e) => updateSettings('system', 'backupInterval', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Log Retention (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.system.logRetentionDays}
                      onChange={(e) => updateSettings('system', 'logRetentionDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                      <p className="text-sm text-gray-500">Temporarily disable the system for maintenance</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.system.maintenanceMode}
                      onChange={(e) => updateSettings('system', 'maintenanceMode', e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </label>
                  
                  {settings.system.maintenanceMode && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Maintenance Mode Active</h4>
                          <p className="text-sm text-red-700 mt-1">
                            The system is currently in maintenance mode. New games cannot be created and users cannot join existing games.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Settings Information</h4>
            <p className="text-sm text-blue-700 mt-1">
              Changes to these settings will take effect immediately after saving. Some settings may require active games to restart for full effect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}