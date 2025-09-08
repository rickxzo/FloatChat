import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const salinityData = [
  { region: 'Arctic Ocean', salinity: 30.2, color: '#60a5fa' },
  { region: 'North Atlantic', salinity: 35.8, color: '#3b82f6' },
  { region: 'Mediterranean', salinity: 38.5, color: '#1d4ed8' },
  { region: 'Red Sea', salinity: 40.1, color: '#1e3a8a' },
  { region: 'Pacific Ocean', salinity: 34.7, color: '#2563eb' },
  { region: 'Indian Ocean', salinity: 35.2, color: '#1e40af' },
  { region: 'Antarctic', salinity: 33.8, color: '#7c3aed' },
];

export function SalinityChart() {
  return (
    <div className="w-full h-80">
      <h3 className="mb-4 text-center text-blue-800">Ocean Salinity by Region</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salinityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
          <XAxis 
            dataKey="region" 
            stroke="#1e40af"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis 
            stroke="#1e40af"
            label={{ value: 'Salinity (PSU)', angle: -90, position: 'insideLeft' }}
            domain={[25, 45]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#dbeafe', 
              border: '1px solid #3b82f6',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`${value} PSU`, 'Salinity']}
          />
          <Bar dataKey="salinity" radius={[4, 4, 0, 0]}>
            {salinityData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}