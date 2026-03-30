'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboards } from '@/hooks/useDashboards';
import { DashboardCard } from './DashboardCard';
import { EmptyState } from './EmptyState';

export function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { dashboards, isLoading, error, createDashboard, deleteDashboard } = useDashboards();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-100 border-t-transparent" />
      </div>
    );
  }

  const handleCreate = async (templateName?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const name = templateName ?? 'My Dashboard';
      const dashboard = await createDashboard(name);
      router.push(`/dashboard/${dashboard.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-sage-100 border-t-transparent"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <p className="text-lg font-medium text-sage-text">
          Something went wrong
        </p>
        <p className="mt-2 text-sm text-sage-muted">{error}</p>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return <EmptyState onCreateDashboard={handleCreate} />;
  }

  return (
    <main className="relative px-6 pt-20 pb-32 max-w-7xl mx-auto">
      {/* Organic Decorative Element */}
      <div
        className="organic-bg pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] -z-10"
        aria-hidden="true"
      />

      {/* Hero Header */}
      <header className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold text-sage-text tracking-tight mb-4">
          Welcome back!
        </h1>
        <p className="text-lg text-sage-muted font-medium max-w-xl mx-auto">
          Choose a dashboard or create something new
        </p>
      </header>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {dashboards.map((dashboard) => (
          <DashboardCard key={dashboard.id} dashboard={dashboard} onDelete={deleteDashboard} />
        ))}
      </div>

      {/* Create New Dashboard */}
      <div className="mt-20 text-center">
        <CreateMenu onCreate={handleCreate} isCreating={isCreating} />
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </main>
  );
}

const CREATE_OPTIONS = [
  { name: 'Start from Scratch', icon: 'add_circle', template: undefined },
  { name: 'Morning Vibes', icon: 'wb_sunny', template: 'Morning Vibes' },
  { name: 'Work Focus', icon: 'work', template: 'Work Focus' },
  { name: 'Chill & Music', icon: 'library_music', template: 'Chill & Music' },
];

function CreateMenu({ onCreate, isCreating }: { onCreate: (t?: string) => void; isCreating: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={isCreating}
        className="bg-sage-300 hover:bg-primary disabled:opacity-60 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-sage-300/20 flex items-center gap-3 mx-auto transition-all active:scale-95 duration-200 cursor-pointer"
      >
        {isCreating ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Creating...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">add</span>
            Create New Dashboard
          </>
        )}
      </button>

      {open && !isCreating && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/20 p-2 min-w-[240px] z-50">
          {CREATE_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              onClick={() => { setOpen(false); onCreate(opt.template); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-primary">{opt.icon}</span>
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileNav() {
  const navItems: { icon: string; label: string; active: boolean }[] = [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'eco', label: 'Growth', active: false },
    { icon: 'local_library', label: 'Library', active: false },
    { icon: 'settings', label: 'Settings', active: false },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-surface-container-lowest py-4 px-6 shadow-[0_-4px_24px_rgba(82,99,79,0.08)] rounded-t-3xl md:hidden"
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => (
        <button
          key={item.label}
          className={`flex flex-col items-center gap-1 ${
            item.active
              ? 'text-primary'
              : 'text-primary/60'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
          <span className={`text-[10px] ${item.active ? 'font-bold' : 'font-medium'}`}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
