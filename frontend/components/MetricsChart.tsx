import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

type Props = {
  labels: string[];
  values: number[];
  title?: string;
};

export default function MetricsChart({ labels, values, title }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: title || 'Runs',
        data: values,
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.3)'
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: !!title, text: title }
    }
  };

  return <Line options={options} data={data} />;
}

