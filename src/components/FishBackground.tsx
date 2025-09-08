import { useState, useEffect } from 'react';

interface Fish {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: number;
  type: 'angelfish' | 'tuna' | 'sardine' | 'grouper' | 'ray' | 'shark';
  color: string;
  secondaryColor: string;
  opacity: number;
  finMovement: number;
}

export function FishBackground() {
  const [fish, setFish] = useState<Fish[]>([]);

  useEffect(() => {
    // Initialize realistic marine fish
    const initialFish: Fish[] = [];
    
    for (let i = 0; i < 14; i++) {
      const fishTypes = ['angelfish', 'tuna', 'sardine', 'grouper', 'ray', 'shark'] as const;
      const type = fishTypes[Math.floor(Math.random() * fishTypes.length)];
      
      let size, color, secondaryColor, opacity, speed;
      switch (type) {
        case 'angelfish':
          size = 35 + Math.random() * 15;
          color = '#1e40af'; // Deep blue
          secondaryColor = '#60a5fa'; // Light blue
          opacity = 0.7 + Math.random() * 0.2;
          speed = 0.4 + Math.random() * 0.6;
          break;
        case 'tuna':
          size = 45 + Math.random() * 20;
          color = '#475569'; // Steel blue-grey
          secondaryColor = '#cbd5e1'; // Light grey
          opacity = 0.6 + Math.random() * 0.3;
          speed = 0.8 + Math.random() * 1.0;
          break;
        case 'sardine':
          size = 18 + Math.random() * 12;
          color = '#0891b2'; // Cyan
          secondaryColor = '#67e8f9'; // Light cyan
          opacity = 0.5 + Math.random() * 0.4;
          speed = 0.6 + Math.random() * 0.8;
          break;
        case 'grouper':
          size = 50 + Math.random() * 25;
          color = '#059669'; // Emerald
          secondaryColor = '#34d399'; // Light emerald
          opacity = 0.6 + Math.random() * 0.2;
          speed = 0.3 + Math.random() * 0.5;
          break;
        case 'ray':
          size = 60 + Math.random() * 30;
          color = '#374151'; // Dark grey
          secondaryColor = '#9ca3af'; // Light grey
          opacity = 0.4 + Math.random() * 0.3;
          speed = 0.2 + Math.random() * 0.4;
          break;
        default: // shark
          size = 70 + Math.random() * 35;
          color = '#1f2937'; // Very dark grey
          secondaryColor = '#6b7280'; // Medium grey
          opacity = 0.5 + Math.random() * 0.2;
          speed = 0.5 + Math.random() * 0.7;
      }

      initialFish.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size,
        speed,
        direction: Math.random() * Math.PI * 2,
        type,
        color,
        secondaryColor,
        opacity,
        finMovement: Math.random() * Math.PI * 2
      });
    }
    
    setFish(initialFish);
  }, []);

  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      setFish(prevFish => 
        prevFish.map(fishItem => {
          let newX = fishItem.x + Math.cos(fishItem.direction) * fishItem.speed;
          let newY = fishItem.y + Math.sin(fishItem.direction) * fishItem.speed;
          let newDirection = fishItem.direction;
          let newFinMovement = fishItem.finMovement + 0.1;

          // Boundary checking and direction changes
          if (newX < -fishItem.size * 1.5) {
            newX = window.innerWidth + fishItem.size * 1.5;
          } else if (newX > window.innerWidth + fishItem.size * 1.5) {
            newX = -fishItem.size * 1.5;
          }

          if (newY < -fishItem.size) {
            newY = window.innerHeight + fishItem.size;
          } else if (newY > window.innerHeight + fishItem.size) {
            newY = -fishItem.size;
          }

          // Natural turning behavior based on fish type
          let turnProbability = 0.001;
          if (fishItem.type === 'sardine') turnProbability = 0.004; // More erratic
          if (fishItem.type === 'ray') turnProbability = 0.0005; // More steady
          if (fishItem.type === 'shark') turnProbability = 0.0008; // Purposeful turns

          if (Math.random() < turnProbability) {
            const turnAmount = fishItem.type === 'sardine' ? 0.8 : 0.3;
            newDirection += (Math.random() - 0.5) * turnAmount;
          }

          // Subtle vertical drift for more natural movement
          const verticalDrift = Math.sin(Date.now() * 0.001 + fishItem.id) * 0.1;
          newY += verticalDrift;

          return {
            ...fishItem,
            x: newX,
            y: newY,
            direction: newDirection,
            finMovement: newFinMovement
          };
        })
      );
      
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const getFishBody = (size: number, type: string) => {
    const s = size;
    switch (type) {
      case 'angelfish':
        // Tall, compressed body typical of angelfish
        return `M ${s * 0.8} ${s * 0.5} 
                Q ${s * 0.6} ${s * 0.15} ${s * 0.2} ${s * 0.3}
                Q ${s * 0.05} ${s * 0.5} ${s * 0.2} ${s * 0.7}
                Q ${s * 0.6} ${s * 0.85} ${s * 0.8} ${s * 0.5} Z`;
      case 'tuna':
        // Streamlined, fusiform body
        return `M ${s * 0.85} ${s * 0.5}
                Q ${s * 0.5} ${s * 0.25} ${s * 0.05} ${s * 0.45}
                Q ${s * 0.02} ${s * 0.5} ${s * 0.05} ${s * 0.55}
                Q ${s * 0.5} ${s * 0.75} ${s * 0.85} ${s * 0.5} Z`;
      case 'sardine':
        // Small, elongated body
        return `M ${s * 0.75} ${s * 0.5}
                Q ${s * 0.45} ${s * 0.35} ${s * 0.1} ${s * 0.48}
                Q ${s * 0.08} ${s * 0.5} ${s * 0.1} ${s * 0.52}
                Q ${s * 0.45} ${s * 0.65} ${s * 0.75} ${s * 0.5} Z`;
      case 'grouper':
        // Large, robust body
        return `M ${s * 0.82} ${s * 0.5}
                Q ${s * 0.55} ${s * 0.2} ${s * 0.08} ${s * 0.42}
                Q ${s * 0.03} ${s * 0.5} ${s * 0.08} ${s * 0.58}
                Q ${s * 0.55} ${s * 0.8} ${s * 0.82} ${s * 0.5} Z`;
      case 'ray':
        // Flat, diamond-shaped body
        return `M ${s * 0.7} ${s * 0.5}
                Q ${s * 0.4} ${s * 0.1} ${s * 0.1} ${s * 0.5}
                Q ${s * 0.4} ${s * 0.9} ${s * 0.7} ${s * 0.5} Z`;
      default: // shark
        // Typical shark silhouette
        return `M ${s * 0.9} ${s * 0.5}
                Q ${s * 0.6} ${s * 0.3} ${s * 0.05} ${s * 0.45}
                Q ${s * 0.02} ${s * 0.5} ${s * 0.05} ${s * 0.55}
                Q ${s * 0.6} ${s * 0.7} ${s * 0.9} ${s * 0.5} Z`;
    }
  };

  const getTailFin = (size: number, type: string, finMovement: number) => {
    const s = size;
    const sway = Math.sin(finMovement) * 0.1;
    
    switch (type) {
      case 'angelfish':
        return `M ${s * 0.8} ${s * 0.5}
                L ${s * (0.95 + sway)} ${s * (0.25 + sway)}
                L ${s * (1.0 + sway)} ${s * 0.5}
                L ${s * (0.95 + sway)} ${s * (0.75 - sway)}
                Z`;
      case 'tuna':
        return `M ${s * 0.85} ${s * 0.5}
                L ${s * (1.0 + sway)} ${s * (0.3 + sway)}
                L ${s * (1.05 + sway)} ${s * 0.5}
                L ${s * (1.0 + sway)} ${s * (0.7 - sway)}
                Z`;
      case 'sardine':
        return `M ${s * 0.75} ${s * 0.5}
                L ${s * (0.9 + sway)} ${s * (0.35 + sway)}
                L ${s * (0.95 + sway)} ${s * 0.5}
                L ${s * (0.9 + sway)} ${s * (0.65 - sway)}
                Z`;
      case 'grouper':
        return `M ${s * 0.82} ${s * 0.5}
                L ${s * (0.96 + sway)} ${s * (0.32 + sway)}
                L ${s * (1.0 + sway)} ${s * 0.5}
                L ${s * (0.96 + sway)} ${s * (0.68 - sway)}
                Z`;
      case 'ray':
        return `M ${s * 0.7} ${s * 0.5}
                L ${s * (0.85 + sway)} ${s * (0.45 + sway)}
                L ${s * (0.9 + sway)} ${s * 0.5}
                L ${s * (0.85 + sway)} ${s * (0.55 - sway)}
                Z`;
      default: // shark
        return `M ${s * 0.9} ${s * 0.5}
                L ${s * (1.05 + sway)} ${s * (0.32 + sway)}
                L ${s * (1.1 + sway)} ${s * 0.5}
                L ${s * (1.05 + sway)} ${s * (0.68 - sway)}
                Z`;
    }
  };

  const getDorsalFin = (size: number, type: string, finMovement: number) => {
    const s = size;
    const flutter = Math.sin(finMovement * 1.5) * 0.05;
    
    if (type === 'ray') return ''; // Rays don't have prominent dorsal fins
    
    switch (type) {
      case 'angelfish':
        return `M ${s * 0.4} ${s * (0.25 + flutter)}
                Q ${s * 0.5} ${s * (0.15 + flutter)} ${s * 0.6} ${s * (0.25 + flutter)}
                L ${s * 0.55} ${s * 0.45}
                L ${s * 0.45} ${s * 0.45}
                Z`;
      case 'shark':
        return `M ${s * 0.45} ${s * (0.3 + flutter)}
                Q ${s * 0.55} ${s * (0.15 + flutter)} ${s * 0.65} ${s * (0.3 + flutter)}
                L ${s * 0.6} ${s * 0.45}
                L ${s * 0.5} ${s * 0.45}
                Z`;
      default:
        return `M ${s * 0.45} ${s * (0.3 + flutter)}
                Q ${s * 0.5} ${s * (0.2 + flutter)} ${s * 0.55} ${s * (0.3 + flutter)}
                L ${s * 0.52} ${s * 0.45}
                L ${s * 0.48} ${s * 0.45}
                Z`;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <svg className="w-full h-full">
        {fish.map((fishItem) => {
          const rotation = (fishItem.direction * 180) / Math.PI;
          const transformOrigin = `${fishItem.size/2} ${fishItem.size/2}`;
          const fishTransform = `translate(${fishItem.x - fishItem.size/2}, ${fishItem.y - fishItem.size/2}) rotate(${rotation}, ${fishItem.size/2}, ${fishItem.size/2})`;
          
          return (
            <g key={fishItem.id}>
              {/* Fish shadow for depth */}
              <g transform={`translate(${fishItem.x - fishItem.size/2 + 3}, ${fishItem.y - fishItem.size/2 + 3}) rotate(${rotation}, ${fishItem.size/2}, ${fishItem.size/2})`}>
                <path
                  d={getFishBody(fishItem.size, fishItem.type)}
                  fill={fishItem.color}
                  opacity={fishItem.opacity * 0.15}
                  style={{ filter: 'blur(4px)' }}
                />
              </g>
              
              {/* Main fish body */}
              <g transform={fishTransform}>
                <path
                  d={getFishBody(fishItem.size, fishItem.type)}
                  fill={fishItem.color}
                  opacity={fishItem.opacity}
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(59, 130, 246, 0.2))',
                  }}
                />
                
                {/* Secondary body coloring/patterns */}
                <path
                  d={getFishBody(fishItem.size, fishItem.type)}
                  fill={fishItem.secondaryColor}
                  opacity={fishItem.opacity * 0.4}
                  transform={`scale(0.7) translate(${fishItem.size * 0.15}, ${fishItem.size * 0.15})`}
                  style={{ 
                    transformOrigin: transformOrigin,
                    mixBlendMode: 'overlay'
                  }}
                />
                
                {/* Tail fin */}
                <path
                  d={getTailFin(fishItem.size, fishItem.type, fishItem.finMovement)}
                  fill={fishItem.color}
                  opacity={fishItem.opacity * 0.9}
                  style={{
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))',
                  }}
                />
                
                {/* Dorsal fin */}
                <path
                  d={getDorsalFin(fishItem.size, fishItem.type, fishItem.finMovement)}
                  fill={fishItem.secondaryColor}
                  opacity={fishItem.opacity * 0.8}
                />
                
                {/* Pectoral fin */}
                {fishItem.type !== 'ray' && (
                  <ellipse
                    cx={fishItem.size * 0.3}
                    cy={fishItem.size * 0.6}
                    rx={fishItem.size * 0.12}
                    ry={fishItem.size * 0.06}
                    fill={fishItem.secondaryColor}
                    opacity={fishItem.opacity * 0.6}
                    transform={`rotate(${Math.sin(fishItem.finMovement) * 20}, ${fishItem.size * 0.3}, ${fishItem.size * 0.6})`}
                  />
                )}
              </g>
              
              {/* Fish eye - positioned after rotation */}
              <circle
                cx={fishItem.x + Math.cos(rotation * Math.PI / 180) * (-fishItem.size * 0.25) - Math.sin(rotation * Math.PI / 180) * (-fishItem.size * 0.1)}
                cy={fishItem.y + Math.sin(rotation * Math.PI / 180) * (-fishItem.size * 0.25) + Math.cos(rotation * Math.PI / 180) * (-fishItem.size * 0.1)}
                r={fishItem.size * 0.06}
                fill="rgba(255, 255, 255, 0.95)"
                opacity={fishItem.opacity}
              />
              
              {/* Fish pupil */}
              <circle
                cx={fishItem.x + Math.cos(rotation * Math.PI / 180) * (-fishItem.size * 0.22) - Math.sin(rotation * Math.PI / 180) * (-fishItem.size * 0.1)}
                cy={fishItem.y + Math.sin(rotation * Math.PI / 180) * (-fishItem.size * 0.22) + Math.cos(rotation * Math.PI / 180) * (-fishItem.size * 0.1)}
                r={fishItem.size * 0.025}
                fill="rgba(0, 0, 0, 0.8)"
                opacity={fishItem.opacity}
              />
              
              {/* Species-specific details */}
              {fishItem.type === 'shark' && (
                <g transform={fishTransform}>
                  {/* Shark gill slits */}
                  {[0, 1, 2].map(gill => (
                    <line
                      key={gill}
                      x1={fishItem.size * (0.25 + gill * 0.08)}
                      y1={fishItem.size * 0.55}
                      x2={fishItem.size * (0.25 + gill * 0.08)}
                      y2={fishItem.size * 0.65}
                      stroke={fishItem.secondaryColor}
                      strokeWidth={1}
                      opacity={fishItem.opacity * 0.6}
                    />
                  ))}
                </g>
              )}
              
              {fishItem.type === 'tuna' && (
                <g transform={fishTransform}>
                  {/* Tuna lateral line */}
                  <line
                    x1={fishItem.size * 0.1}
                    y1={fishItem.size * 0.5}
                    x2={fishItem.size * 0.8}
                    y2={fishItem.size * 0.5}
                    stroke={fishItem.secondaryColor}
                    strokeWidth={1}
                    opacity={fishItem.opacity * 0.5}
                  />
                </g>
              )}
              
              {/* Swimming disturbance for fast fish */}
              {(fishItem.type === 'tuna' || fishItem.type === 'shark') && fishItem.speed > 1.0 && (
                <>
                  <ellipse
                    cx={fishItem.x + fishItem.size * 0.6}
                    cy={fishItem.y + Math.sin(Date.now() * 0.02 + fishItem.id) * 2}
                    rx={3}
                    ry={1}
                    fill={fishItem.color}
                    opacity={fishItem.opacity * 0.2}
                  />
                  <ellipse
                    cx={fishItem.x + fishItem.size * 0.8}
                    cy={fishItem.y + Math.sin(Date.now() * 0.015 + fishItem.id) * 1.5}
                    rx={2}
                    ry={0.8}
                    fill={fishItem.color}
                    opacity={fishItem.opacity * 0.15}
                  />
                </>
              )}
            </g>
          );
        })}
        
        {/* Sophisticated bubble system */}
        {fish.slice(0, 4).map((fishItem, index) => (
          <g key={`bubbles-${fishItem.id}`}>
            {/* Breathing bubbles for larger fish */}
            {fishItem.size > 40 && (
              <>
                <circle
                  cx={fishItem.x + Math.sin(Date.now() * 0.002 + index) * 8}
                  cy={fishItem.y - 15 + Math.cos(Date.now() * 0.0015 + index) * 3}
                  r={1.5 + Math.sin(Date.now() * 0.003 + index) * 0.5}
                  fill="rgba(203, 213, 225, 0.4)"
                  opacity={0.7}
                />
                <circle
                  cx={fishItem.x + Math.sin(Date.now() * 0.0025 + index + 1) * 6}
                  cy={fishItem.y - 25 + Math.cos(Date.now() * 0.002 + index + 1) * 2}
                  r={1 + Math.sin(Date.now() * 0.004 + index + 1) * 0.3}
                  fill="rgba(203, 213, 225, 0.3)"
                  opacity={0.5}
                />
              </>
            )}
            
            {/* Trail disturbance for schooling fish */}
            {fishItem.type === 'sardine' && (
              <circle
                cx={fishItem.x + fishItem.size * 0.4}
                cy={fishItem.y + Math.sin(Date.now() * 0.008 + fishItem.id) * 1}
                r={0.8}
                fill={fishItem.secondaryColor}
                opacity={fishItem.opacity * 0.3}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}