import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user-store';
import { useFarmStore } from '@/stores/farm-store';
import { useFarm } from '@/lib/api-client';

// Format role for display
const formatRole = (role: string | undefined): string => {
  if (!role) return '';
  return role
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

export default function UserSettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, darkMode, setDarkMode, logout } = useUserStore();
  const { currentFarmId } = useFarmStore();
  const { data: currentFarm } = useFarm(currentFarmId ?? undefined);
  const userRole = formatRole(currentFarm?.role as string);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // TODO: Add actual API call to update user profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      updateUser({ name, email });
      setSaveMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    if (!currentPassword) {
      setSaveMessage({ type: 'error', text: 'Current password is required' });
      return;
    }

    if (newPassword.length < 6) {
      setSaveMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSaveMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Add actual API call to change password
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaveMessage({ type: 'success', text: 'Password changed successfully' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">User Settings</h1>

      {saveMessage && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-destructive/10 text-destructive'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Profile</h2>
          {userRole && (
            <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
              {userRole}
            </span>
          )}
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Appearance Section */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">
              Use dark theme throughout the application
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              darkMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-lg border border-destructive/20 p-6">
        <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Log Out</p>
            <p className="text-sm text-muted-foreground">Sign out of your account</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-destructive text-destructive rounded-lg font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
