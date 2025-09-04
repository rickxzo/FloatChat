export function OceanBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-900 to-slate-800"></div>
      
      {/* Depth layers for realistic ocean atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-blue-950/40"></div>
      
      {/* Advanced wave system with multiple realistic layers */}
      <div className="absolute inset-0 opacity-40">
        <svg className="absolute bottom-0 w-full h-48" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,100 C150,60 300,140 450,100 C600,60 750,140 900,100 C1050,60 1150,120 1200,100 L1200,200 L0,200 Z"
            fill="url(#deepWave1)"
            className="wave-animation"
          />
          <defs>
            <linearGradient id="deepWave1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(15, 23, 42)" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="rgb(30, 58, 138)" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="rgb(15, 23, 42)" stopOpacity="1"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="absolute inset-0 opacity-30">
        <svg className="absolute bottom-0 w-full h-56" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 L1200,200 L0,200 Z"
            fill="url(#deepWave2)"
            style={{ animationDelay: '-3s' }}
            className="wave-animation"
          />
          <defs>
            <linearGradient id="deepWave2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(30, 58, 138)" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="rgb(29, 78, 216)" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="rgb(30, 58, 138)" stopOpacity="0.9"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute inset-0 opacity-20">
        <svg className="absolute bottom-0 w-full h-64" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,140 C300,100 500,180 800,140 C900,120 1100,160 1200,140 L1200,200 L0,200 Z"
            fill="url(#deepWave3)"
            style={{ animationDelay: '-1.5s' }}
            className="wave-animation"
          />
          <defs>
            <linearGradient id="deepWave3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Realistic floating marine particles and debris */}
      <div className="absolute inset-0">
        {[...Array(35)].map((_, i) => {
          const size = Math.random() * 3 + 1;
          const depth = Math.random();
          return (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: `rgba(${100 + depth * 100}, ${150 + depth * 100}, ${200 + depth * 55}, ${0.2 + depth * 0.3})`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${4 + Math.random() * 6}s`,
                filter: depth > 0.7 ? 'blur(0.5px)' : 'none'
              }}
            />
          );
        })}
      </div>

      {/* Caustic light effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-radial from-blue-200/20 to-transparent rounded-full animate-pulse"
              style={{
                width: `${50 + Math.random() * 100}px`,
                height: `${30 + Math.random() * 60}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 70}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                transform: `rotate(${Math.random() * 45}deg)`,
                filter: 'blur(1px)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Deep sea ambient glow */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-radial from-cyan-500 to-transparent rounded-full animate-pulse" 
             style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-radial from-blue-400 to-transparent rounded-full animate-pulse" 
             style={{ animationDuration: '12s', animationDelay: '-4s' }}></div>
      </div>
    </div>
  );
}