import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import LogViewer from '../../components/LogViewer';
import AnalysisCard from '../../components/AnalysisCard';
import MetricsChart from '../../components/MetricsChart';

type LogItem = { id: number; pipeline_id: string; timestamp: string; content: string };
type Analysis = { root_cause: string; suggested_fix: string; confidence: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

export default function PipelineDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const [analyzing, setAnalyzing] = useState(false);
  const joinedLogs = useMemo(() => logs.map(l => `[${new Date(l.timestamp).toLocaleString()}]` + '\n' + l.content).join('\n\n'), [logs]);

  const fetchLogs = async (reset = false) => {
    if (!id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(reset ? 0 : offset), q });
      const res = await fetch(`${API_BASE}/logs/${id}?${params.toString()}`);
      const data = await res.json();
      setLogs(reset ? (data || []) : [...logs, ...(data || [])]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/analyze/${id}`, { method: 'POST' });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
      setAnalysis({ root_cause: 'Request failed', suggested_fix: 'Retry later', confidence: 'Low' });
    } finally {
      setAnalyzing(false);
    }
  };

  // Very rough aggregation by date for chart
  const chart = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const d = new Date(l.timestamp).toISOString().slice(0, 10);
      counts[d] = (counts[d] || 0) + 1;
    });
    const labels = Object.keys(counts).sort();
    const values = labels.map(l => counts[l]);
    return { labels, values };
  }, [logs]);

  return (
    <Layout title={`Pipeline ${id}`} subtitle="Logs, analysis, and run metrics">
      <div className="flex items-center justify-end gap-2">
        <button disabled={analyzing} onClick={handleAnalyze} className={`btn-primary ${analyzing ? 'opacity-70 cursor-not-allowed' : ''}`}>{analyzing ? 'Analyzing…' : 'Analyze'}</button>
        {id && (
          <button className="btn-secondary" onClick={async () => {
            try {
              await fetch(`${API_BASE}/agent/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipeline_id: id, type: 'rca' }) });
              alert('RCA agent task created. See Agents page.');
            } catch (e) { console.error(e); }
          }}>Create RCA Task</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <h3 className="font-semibold mb-2 heading-gradient">Logs</h3>
          <div className="flex items-center gap-2 mb-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              className="btn-secondary"
              onClick={() => { setOffset(0); fetchLogs(true); }}
            >Search</button>
            <button
              className="btn-ghost"
              onClick={() => { navigator.clipboard.writeText(joinedLogs || ''); }}
            >Copy</button>
          </div>
          {loading ? (
            <div className="panel">Loading logs...</div>
          ) : (
            <LogViewer logs={joinedLogs} />
          )}
          <div className="mt-2 flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => { const next = offset + limit; setOffset(next); fetchLogs(false); }}
            >Load more</button>
            <button
              className="btn-ghost"
              onClick={() => { setOffset(0); fetchLogs(true); }}
            >Refresh</button>
          </div>
        </div>
        <div>
          <AnalysisCard root_cause={analysis?.root_cause} suggested_fix={analysis?.suggested_fix} confidence={analysis?.confidence} />
        </div>
      </div>

      <div className="panel mt-6">
        <h3 className="font-semibold mb-2 heading-gradient">Past Runs</h3>
        {chart.labels.length > 0 ? (
          <MetricsChart labels={chart.labels} values={chart.values} title="Log Entries per Day" />
        ) : (
          <div className="text-gray-400">No data to chart yet.</div>
        )}
      </div>
    </Layout>
  );
}
