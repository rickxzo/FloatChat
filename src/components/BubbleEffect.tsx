import { useEffect, useState } from 'react';

interface BubbleEffectProps {
  x: number;
  y: number;
}

export function BubbleEffect({ x, y }: BubbleEffectProps) {
  const [mounted, setMounted] = useState(false);
  const [bubbles] = useState(() => {
    // Generate realistic bubble cluster
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 8 + 2,
      offsetX: (Math.random() - 0.5) * 40,
      offsetY: (Math.random() - 0.5) * 40,
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.6,
      opacity: 0.4 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 20
    }));
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left: x - 30, top: y - 30 }}
    >
      {/* Main impact ripple with realistic water disturbance */}
      <div 
        className="absolute w-20 h-20 rounded-full animate-ping"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0.1) 50%, transparent 100%)',
          left: '10px',
          top: '10px',
          animationDuration: '1.2s'
        }}
      ></div>
      
      {/* Secondary ripple wave */}
      <div 
        className="absolute w-32 h-32 rounded-full animate-ping"
        style={{
          border: '1px solid rgba(59, 130, 246, 0.2)',
          left: '-6px',
          top: '-6px',
          animationDelay: '0.2s',
          animationDuration: '1.5s'
        }}
      ></div>

      {/* Realistic bubble cluster */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${30 + bubble.offsetX}px`,
            top: `${30 + bubble.offsetY}px`,
            background: `radial-gradient(circle at 30% 30%, 
              rgba(255, 255, 255, ${bubble.opacity}) 0%, 
              rgba(147, 197, 253, ${bubble.opacity * 0.8}) 40%, 
              rgba(59, 130, 246, ${bubble.opacity * 0.6}) 100%)`,
            boxShadow: `inset 1px 1px 2px rgba(255, 255, 255, 0.5), 
                       0 0 ${bubble.size}px rgba(59, 130, 246, 0.3)`,
            animation: `bubbleRise ${bubble.duration}s ease-out ${bubble.delay}s forwards`,
            transform: 'translateY(0px)',
            filter: bubble.size < 4 ? 'blur(0.5px)' : 'none'
          }}
        >
          {/* Bubble highlight for realism */}
          <div
            className="absolute rounded-full bg-white/60"
            style={{
              width: `${bubble.size * 0.3}px`,
              height: `${bubble.size * 0.3}px`,
              top: `${bubble.size * 0.2}px`,
              left: `${bubble.size * 0.25}px`,
              filter: 'blur(0.5px)'
            }}
          ></div>
        </div>
      ))}

      {/* Water splash particles */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`splash-${i}`}
          className="absolute w-1 h-1 bg-blue-200/60 rounded-full"
          style={{
            left: `${30 + (Math.random() - 0.5) * 60}px`,
            top: `${30 + (Math.random() - 0.5) * 60}px`,
            animation: `splashParticle 0.8s ease-out ${Math.random() * 0.2}s forwards`
          }}
        ></div>
      ))}

      {/* Caustic light effect */}
      <div
        className="absolute rounded-full animate-pulse"
        style={{
          width: '24px',
          height: '24px',
          left: '18px',
          top: '18px',
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, transparent 70%)',
          animationDuration: '1s',
          filter: 'blur(2px)'
        }}
      ></div>

      <style jsx>{`
        @keyframes bubbleRise {
          0% {
            transform: translateY(0px) scale(0.5);
            opacity: 1;
          }
          50% {
            transform: translateY(-20px) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-50px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes splashParticle {
          0% {
            transform: scale(1) translateY(0px);
            opacity: 1;
          }
          100% {
            transform: scale(0.3) translateY(-30px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}