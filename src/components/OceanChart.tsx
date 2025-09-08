import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const depthData = [
  { location: 'Mariana Trench', depth: 11034, pressure: 1086 },
  { location: 'Puerto Rico Trench', depth: 8648, pressure: 851 },
  { location: 'Java Trench', depth: 7725, pressure: 760 },
  { location: 'Peru-Chile Trench', depth: 8065, pressure: 794 },
  { location: 'Kermadec Trench', depth: 10047, pressure: 989 },
  { location: 'Tonga Trench', depth: 10882, pressure: 1071 },
  { location: 'Mid-Atlantic Ridge', depth: 3500, pressure: 345 },
  { location: 'East Pacific Rise', depth: 2800, pressure: 276 },
];

const currentData = [
  { name: 'Gulf Stream', value: 30, color: '#ef4444' },
  { name: 'Kuroshio Current', value: 25, color: '#f97316' },
  { name: 'Antarctic Circumpolar', value: 20, color: '#3b82f6' },
  { name: 'California Current', value: 15, color: '#10b981' },
  { name: 'Benguela Current', value: 10, color: '#8b5cf6' },
];

interface OceanChartProps {
  type: 'depth' | 'currents';
}

export function OceanChart({ type }: OceanChartProps) {
  if (type === 'depth') {
    return (
      <div className="w-full h-80">
        <h3 className="mb-4 text-center text-blue-800">Ocean Depth vs Pressure</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis 
              dataKey="depth" 
              type="number"
              stroke="#1e40af"
              label={{ value: 'Depth (meters)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="pressure"
              type="number"
              stroke="#1e40af"
              label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#dbeafe', 
                border: '1px solid #3b82f6',
                borderRadius: '8px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'depth') return [`${value}m`, 'Depth'];
                if (name === 'pressure') return [`${value} bar`, 'Pressure'];
                return [value, name];
              }}
              labelFormatter={(label: string, payload: any) => {
                if (payload && payload[0]) {
                  return payload[0].payload.location;
                }
                return label;
              }}
            />
            <Scatter data={depthData} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <h3 className="mb-4 text-center text-blue-800">Major Ocean Currents Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={currentData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}%`}
          >
            {currentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#dbeafe', 
              border: '1px solid #3b82f6',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value}%`, 'Flow Rate']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}