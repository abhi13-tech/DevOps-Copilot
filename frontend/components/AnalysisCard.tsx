type Props = {
  root_cause?: string;
  suggested_fix?: string;
  confidence?: string;
};

export default function AnalysisCard({ root_cause, suggested_fix, confidence }: Props) {
  const badge = confidence?.toLowerCase() === 'high' ? 'badge-ok' : confidence?.toLowerCase() === 'medium' ? 'badge-warn' : 'badge-err';
  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-2 heading-gradient">AI Analysis</h3>
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">Root Cause</div>
          <div className="mt-1 text-gray-100">{root_cause || 'Not analyzed yet.'}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">Suggested Fix</div>
          <div className="mt-1 text-gray-100">{suggested_fix || '—'}</div>
        </div>
        <div className="text-xs text-gray-300">Confidence: <span className={badge}>{confidence || '—'}</span></div>
      </div>
    </div>
  );
}
