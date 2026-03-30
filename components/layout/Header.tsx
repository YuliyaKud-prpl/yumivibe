'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface-container-lowest shadow-[0_4px_24px_rgba(82,99,79,0.08)]">
      <div className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-primary flex items-center gap-2 tracking-tight">
          YumiVibe
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary cursor-pointer"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-surface-container-low animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed flex items-center justify-center bg-surface-container-low cursor-pointer"
              >
                <span className="text-sm font-bold text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/20 p-3 min-w-[200px] z-50">
                  <div className="px-3 py-2 border-b border-outline-variant/10 mb-2">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
