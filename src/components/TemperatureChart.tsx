import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const temperatureData = [
  { depth: 0, temperature: 25.2, location: 'Surface' },
  { depth: 50, temperature: 22.8, location: 'Epipelagic' },
  { depth: 100, temperature: 18.5, location: 'Epipelagic' },
  { depth: 200, temperature: 12.3, location: 'Mesopelagic' },
  { depth: 500, temperature: 8.1, location: 'Mesopelagic' },
  { depth: 1000, temperature: 4.2, location: 'Bathypelagic' },
  { depth: 2000, temperature: 2.8, location: 'Bathypelagic' },
  { depth: 4000, temperature: 1.9, location: 'Abyssopelagic' },
  { depth: 6000, temperature: 1.2, location: 'Hadalpelagic' },
];

export function TemperatureChart() {
  return (
    <div className="w-full h-80">
      <h3 className="mb-4 text-center text-blue-800">Ocean Temperature by Depth</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={temperatureData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
          <XAxis 
            dataKey="depth" 
            stroke="#1e40af"
            label={{ value: 'Depth (meters)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            stroke="#1e40af"
            label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#dbeafe', 
              border: '1px solid #3b82f6',
              borderRadius: '8px'
            }}
            formatter={(value: number, name: string) => [
              `${value}°C`, 
              'Temperature'
            ]}
            labelFormatter={(depth: number) => `Depth: ${depth}m`}
          />
          <Area
            type="monotone"
            dataKey="temperature"
            stroke="#2563eb"
            strokeWidth={3}
            fill="url(#temperatureGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}