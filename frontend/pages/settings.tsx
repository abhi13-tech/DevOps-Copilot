import { useState } from 'react';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function Settings() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const curlExample =
    "curl -X POST http://localhost:8000/logs -H 'Content-Type: application/json' -d '{\"pipeline_id\":\"demo-1\",\"name\":\"Demo\",\"status\":\"failed\",\"logs\":\"Build failed: npm ERR!\"}'";

  const seed = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      const data = await res.json();
      setMsg(`Seeded: ${Array.isArray(data?.pipelines) ? data.pipelines.join(', ') : 'ok'}`);
    } catch (e) {
      setMsg('Seeding failed. See console.');
      console.error(e);
    } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
      const data = await res.json();
      setMsg(data?.message || 'Reset complete');
    } catch (e) {
      setMsg('Reset failed. See console.');
      console.error(e);
    } finally { setBusy(false); }
  };

  return (
    <Layout title="Settings" subtitle="Configure and learn how to use DevOps Copilot">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel space-y-3">
          <h3 className="font-semibold heading-gradient">Quick Actions</h3>
          <div className="flex gap-3">
            <button disabled={busy} onClick={seed} className={`btn-primary ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}>{busy ? 'Working…' : 'Seed Demo Data'}</button>
            <button disabled={busy} onClick={reset} className={`btn-secondary ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}>Reset Data</button>
          </div>
          {msg && <div className="text-sm text-gray-300">{msg}</div>}
          <p className="text-sm text-gray-400">Seeding creates a few pipelines with realistic logs and run history so you can explore the UI.</p>
        </div>

        <div className="panel space-y-3">
          <h3 className="font-semibold heading-gradient">Configuration</h3>
          <ul className="list-disc pl-6 text-gray-300 text-sm space-y-1">
            <li><span className="font-mono">NEXT_PUBLIC_API_BASE</span>: Frontend → Backend base URL. Default: <span className="font-mono">http://localhost:8000</span>.</li>
            <li><span className="font-mono">OPENAI_API_KEY</span>: Backend → Enables real AI analysis. Without it, you get a safe placeholder.</li>
          </ul>
          <div className="text-xs text-gray-400">
            Docker Compose reads <span className="font-mono">OPENAI_API_KEY</span> from your shell or <span className="font-mono">infra/.env</span>. Rebuild frontend if changing <span className="font-mono">NEXT_PUBLIC_API_BASE</span>.
          </div>
        </div>

        <div className="panel space-y-3 lg:col-span-2">
          <h3 className="font-semibold heading-gradient">How To Use</h3>
          <ol className="list-decimal pl-6 text-sm text-gray-200 space-y-2">
            <li>Post CI logs to the backend:
              <pre className="mt-2 log-viewer text-xs">{curlExample}</pre>
            </li>
            <li>Open the dashboard and click a pipeline: <span className="font-mono">http://localhost:3000</span></li>
            <li>Use search, load more, and copy in the log viewer to navigate logs.</li>
            <li>Click <span className="font-semibold">Analyze</span> to get AI-driven root cause and fix.
              <div className="text-xs text-gray-400">Requires <span className="font-mono">OPENAI_API_KEY</span> to be set; otherwise shows a placeholder.</div>
            </li>
          </ol>
          <div className="text-xs text-gray-400">API docs: <a className="text-blue-300 underline" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">http://localhost:8000/docs</a></div>
        </div>
      </div>
    </Layout>
  );
}
