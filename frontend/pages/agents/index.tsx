import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

type AgentTask = {
  id: number;
  type: string;
  pipeline_id: string;
  status: string;
  result_json?: string;
  created_at: string;
  updated_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function Agents() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [pipelineId, setPipelineId] = useState('');
  const [type, setType] = useState('rca');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/tasks?limit=100`);
      const data = await res.json();
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { load(); }, []);

  const createTask = async () => {
    if (!pipelineId) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/agent/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_id: pipelineId, type })
      });
      setPipelineId('');
      await load();
    } catch (e) { console.error(e); }
    setBusy(false);
  };

  const rerun = async (id: number) => {
    try {
      await fetch(`${API_BASE}/agent/tasks/${id}/run`, { method: 'POST' });
      await load();
    } catch (e) { console.error(e); }
  };

  return (
    <Layout title="Agents" subtitle="Create and view agent tasks">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel space-y-3">
          <h3 className="font-semibold heading-gradient">New Task</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400">Pipeline ID</label>
              <input value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} placeholder="demo-1" className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-gray-100">
                <option value="rca">RCA</option>
                <option value="triage">Triage</option>
                <option value="fix" disabled>Fix (coming soon)</option>
              </select>
            </div>
            <button disabled={busy || !pipelineId} onClick={createTask} className={`btn-primary ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}>{busy ? 'Creating…' : 'Create & Run'}</button>
          </div>
        </div>

        <div className="lg:col-span-2 panel overflow-auto">
          <h3 className="font-semibold mb-3 heading-gradient">Tasks</h3>
          <table className="min-w-full">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="px-3 py-2 text-gray-300">ID</th>
                <th className="px-3 py-2 text-gray-300">Type</th>
                <th className="px-3 py-2 text-gray-300">Pipeline</th>
                <th className="px-3 py-2 text-gray-300">Status</th>
                <th className="px-3 py-2 text-gray-300">Updated</th>
                <th className="px-3 py-2 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-white/10 hover:bg-white/10">
                  <td className="px-3 py-2 text-gray-200">{t.id}</td>
                  <td className="px-3 py-2 text-gray-200 uppercase text-xs">{t.type}</td>
                  <td className="px-3 py-2 text-gray-300">{t.pipeline_id}</td>
                  <td className="px-3 py-2 text-gray-300">{t.status}</td>
                  <td className="px-3 py-2 text-gray-400">{new Date(t.updated_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button className="btn-ghost" onClick={() => rerun(t.id)}>Run</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

