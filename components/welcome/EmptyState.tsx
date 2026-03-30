'use client';

interface EmptyStateProps {
  onCreateDashboard: (templateName?: string) => void;
}

interface Template {
  name: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
}

const TEMPLATES: Template[] = [
  {
    name: 'Morning Vibes',
    subtitle: 'Daily ritual tracker',
    gradientFrom: '#f59e0b',
    gradientTo: '#fbbf24',
    icon: 'wb_sunny',
  },
  {
    name: 'Work Focus',
    subtitle: 'Deep work timer & tasks',
    gradientFrom: '#0ea5e9',
    gradientTo: '#38bdf8',
    icon: 'work',
  },
  {
    name: 'Chill & Music',
    subtitle: 'Ambient soundscape',
    gradientFrom: '#10b981',
    gradientTo: '#facc15',
    icon: 'library_music',
  },
];

export function EmptyState({ onCreateDashboard }: EmptyStateProps) {
  return (
    <main className="flex flex-col items-center justify-center px-6 w-full" style={{ minHeight: 'calc(100vh - 72px)' }}>
      <div className="relative w-full max-w-4xl flex flex-col items-center text-center">
        {/* Organic blob hero */}
        <div className="organic-blob w-40 h-40 md:w-52 md:h-52 bg-sage-100 flex items-center justify-center relative mb-8 shadow-[0_20px_50px_rgba(82,99,79,0.1)]">
          <span className="material-symbols-outlined text-5xl md:text-6xl text-sage-300 opacity-80">
            dashboard
          </span>

          {/* Floating decorative elements */}
          <div className="absolute -top-3 -right-3 w-12 h-12 bg-sage-200 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
          </div>
          <div className="absolute bottom-2 -left-6 w-11 h-11 bg-sage-300 rounded-full flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-lg">layers</span>
          </div>
        </div>

        {/* Typography & Headers */}
        <div className="space-y-2 mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-sage-text tracking-tight leading-tight">
            Create Your First Dashboard
          </h1>
          <p className="text-lg md:text-xl text-sage-muted max-w-lg mx-auto font-medium">
            Start with a template or build from scratch. Your digital sanctuary begins here.
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-8">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => onCreateDashboard(t.name)}
              className="group flex flex-col items-center p-6 bg-surface-container-lowest rounded-[12px] shadow-[0_12px_30px_-10px_rgba(82,99,79,0.15)] hover:shadow-[0_15px_35px_-8px_rgba(82,99,79,0.25)] transition-all duration-300 transform hover:-translate-y-2"
            >
              <div
                className="w-full aspect-[4/3] rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(to bottom right, ${t.gradientFrom}33, ${t.gradientTo}33)`,
                }}
              >
                <span className="material-symbols-outlined text-5xl text-primary relative z-10">
                  {t.icon}
                </span>
              </div>
              <span className="text-lg font-bold text-on-surface mb-1">
                {t.name}
              </span>
              <span className="text-sm text-on-surface-variant/70">
                {t.subtitle}
              </span>
            </button>
          ))}
        </div>

        {/* Primary Action */}
        <button
          onClick={() => onCreateDashboard()}
          className="group flex items-center gap-3 bg-sage-300 hover:bg-primary text-white px-8 py-4 rounded-full text-lg font-bold transition-all duration-300 shadow-xl shadow-sage-300/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">
            add_circle
          </span>
          Start from Scratch
        </button>
      </div>
    </main>
  );
}
