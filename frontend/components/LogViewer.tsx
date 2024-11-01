type Props = { logs: string };

export default function LogViewer({ logs }: Props) {
  return (
    <pre className="log-viewer">
      {logs || 'No logs available.'}
    </pre>
  );
}
