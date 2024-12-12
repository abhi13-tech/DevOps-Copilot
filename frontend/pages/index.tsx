import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';

type Pipeline = {
  id: string;
  name: string;
  status: string;
  last_run: string;
  success_rate: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function Home() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/pipelines`);
        const data = await res.json();
        setPipelines(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return pipelines;
    const q = query.toLowerCase();
    return pipelines.filter(p => (p.name || p.id).toLowerCase().includes(q) || (p.status || '').toLowerCase().includes(q));
  }, [pipelines, query]);

  return (
    <Layout title="Pipelines" subtitle="Overview of GitHub Actions pipelines">
      {(!loading && pipelines.length === 0) && (
        <div className="mb-4 panel">
          <h3 className="font-semibold mb-1 heading-gradient">Welcome to DevOps Copilot</h3>
          <p className="text-sm text-gray-300">No pipelines yet. Seed demo data from Settings or POST logs to the API.</p>
          <div className="mt-3">
            <Link className="btn-primary" href="/settings">Go to Settings</Link>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or status..."
          className="w-full max-w-md px-3 py-2 rounded-md bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <div className="text-sm text-gray-400 ml-4">{filtered.length} result{filtered.length === 1 ? '' : 's'}</div>
      </div>
      {/* Cards on small screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:hidden">
        {filtered.map((p) => (
          <div key={p.id} className="panel">
            <div className="flex items-center justify-between">
              <Link className="text-blue-300 hover:underline" href={`/pipeline/${p.id}`}>{p.name || p.id}</Link>
              <span className={`${p.status === 'success' ? 'badge-ok' : p.status === 'failed' ? 'badge-err' : 'badge-warn'}`}>{p.status || 'unknown'}</span>
            </div>
            <div className="mt-2 text-sm text-gray-300">Success: {Math.round((p.success_rate || 0) * 100)}%</div>
            <div className="text-xs text-gray-400">Last run: {new Date(p.last_run).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Table on large screens */}
      <div className="hidden lg:block panel overflow-hidden">
        <table className="min-w-full">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-300">Name</th>
                <th className="px-4 py-2 font-medium text-gray-300">Status</th>
                <th className="px-4 py-2 font-medium text-gray-300">Success Rate</th>
                <th className="px-4 py-2 font-medium text-gray-300">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="px-4 py-3 text-gray-400" colSpan={4}>Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td className="px-4 py-3 text-gray-400" colSpan={4}>No pipelines yet. Post logs to the API to populate.</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-t border-white/10 ${i % 2 ? 'bg-white/5' : ''} hover:bg-white/10`}>
                  <td className="px-4 py-3">
                    <Link className="text-blue-300 hover:underline" href={`/pipeline/${p.id}`}>{p.name || p.id}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`${p.status === 'success' ? 'badge-ok' : p.status === 'failed' ? 'badge-err' : 'badge-warn'}`}>{p.status || 'unknown'}</span>
                  </td>
                  <td className="px-4 py-3">{Math.round((p.success_rate || 0) * 100)}%</td>
                  <td className="px-4 py-3">{new Date(p.last_run).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
        </table>
      </div>
    </Layout>
  );
}
// meta: housekeeping note 2024-11-06T10:38:43-05:00
// meta: housekeeping note 2024-11-16T12:23:12-05:00
// meta: housekeeping note 2024-12-12T15:48:53-05:00
