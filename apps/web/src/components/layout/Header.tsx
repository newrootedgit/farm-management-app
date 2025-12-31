import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/farm-store';

export function Header() {
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // For now, just clear local storage and redirect
    // When Clerk is integrated, this will use Clerk's signOut
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-accent"
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Rooted Planner</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 rounded-md hover:bg-accent relative">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        {/* User menu dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1 rounded-md hover:bg-accent transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              U
            </div>
            <div className="hidden md:block text-sm text-left">
              <p className="font-medium">User</p>
              <p className="text-muted-foreground text-xs">user@example.com</p>
            </div>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground hidden md:block" />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border rounded-lg shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">User</p>
                <p className="text-xs text-muted-foreground">user@example.com</p>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-3"
              >
                <SettingsIcon className="h-4 w-4" />
                Settings
              </button>

              <hr className="my-1" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent flex items-center gap-3 text-destructive"
              >
                <LogoutIcon className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
