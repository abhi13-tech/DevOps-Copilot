import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const router = useRouter();
  const isActive = (href: string) => router.pathname === href || (href !== '/' && router.pathname.startsWith(href));
  return (
    <aside className="h-screen w-64 glass-card text-gray-100 fixed left-4 top-4 bottom-4 p-4 border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold heading-gradient">DevOps Copilot</h1>
        <span className="text-[10px] text-gray-400">v0.1</span>
      </div>
      <nav className="space-y-1">
        <Link href="/" className={`sidebar-link ${isActive('/') ? 'bg-white/10 text-white' : ''}`}>Dashboard</Link>
        <Link href="/agents" className={`sidebar-link ${isActive('/agents') ? 'bg-white/10 text-white' : ''}`}>Agents</Link>
        <Link href="/settings" className={`sidebar-link ${isActive('/settings') ? 'bg-white/10 text-white' : ''}`}>Settings</Link>
        <a className="sidebar-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
      <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-400">
        <div className="opacity-70">Minimal • Responsive • AI</div>
      </div>
    </aside>
  );
}
// meta: housekeeping note 2024-11-05T15:57:19-05:00
// meta: housekeeping note 2024-11-05T13:20:32-05:00
