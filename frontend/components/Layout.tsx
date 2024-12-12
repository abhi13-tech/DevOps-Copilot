import { ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function Layout({ title, subtitle, children }: Props) {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        setHealthy(res.ok);
      } catch {
        setHealthy(false);
      }
    };
    check();
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar hidden on small screens */}
      <div className="hidden md:block"><Sidebar /></div>
      <main className="md:ml-64 flex-1 p-4 md:p-8">
        {/* Top bar */}
        <div className="glass-card sticky top-0 z-10 mb-6 px-4 py-3 flex items-center justify-between border-white/10">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold heading-gradient">{title}</h2>
            {subtitle && <p className="text-gray-400 text-sm md:text-base">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${healthy === null ? 'bg-gray-500' : healthy ? 'bg-emerald-400' : 'bg-rose-400'}`}>
              <span className={`absolute inset-0 rounded-full animate-ping ${healthy ? 'bg-emerald-400/40' : 'bg-rose-400/40'}`} />
            </span>
            API
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
// meta: housekeeping note 2024-11-01T17:26:20-04:00
// meta: housekeeping note 2024-11-18T15:52:32-05:00
// meta: housekeeping note 2024-12-12T12:37:12-05:00
