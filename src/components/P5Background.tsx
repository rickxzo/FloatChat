import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    p5: any;
  }
}

export function P5Background() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically load p5.js
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
    script.onload = () => {
      const sketch = (p: any) => {
        let particles: any[] = [];
        let bubbles: any[] = [];
        let waveOffset = 0;
        let audioContext: AudioContext | null = null;
        let depthLayers: any[] = [];
        
        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.parent(canvasRef.current);
          canvas.style('position', 'fixed');
          canvas.style('top', '0');
          canvas.style('left', '0');
          canvas.style('z-index', '1');
          canvas.style('pointer-events', 'none');
          
          // Initialize depth-layered particles for realism
          for (let i = 0; i < 80; i++) {
            const depth = p.random(0.2, 1);
            particles.push({
              x: p.random(p.width),
              y: p.random(p.height),
              vx: p.random(-0.3, 0.3) * depth,
              vy: p.random(-0.2, 0.2) * depth,
              size: p.random(1, 6) * depth,
              alpha: p.random(0.1, 0.3) * depth,
              depth: depth,
              color: {
                r: p.lerp(20, 100, depth),
                g: p.lerp(40, 150, depth),
                b: p.lerp(80, 255, depth)
              },
              wobble: p.random(0, p.TWO_PI)
            });
          }

          // Initialize depth layers for atmospheric perspective
          for (let i = 0; i < 3; i++) {
            depthLayers.push({
              offset: p.random(0, p.TWO_PI),
              speed: 0.005 + i * 0.002,
              amplitude: 20 + i * 10,
              alpha: 0.1 - i * 0.02
            });
          }
        };

        p.draw = () => {
          p.clear();
          
          // Draw depth-based wave patterns
          for (let layer of depthLayers) {
            p.stroke(30, 80, 150, layer.alpha * 255);
            p.strokeWeight(0.5);
            p.noFill();
            
            p.beginShape();
            for (let x = 0; x <= p.width; x += 20) {
              const y = p.height * 0.7 + 
                p.sin(x * 0.01 + waveOffset + layer.offset) * layer.amplitude +
                p.sin(x * 0.003 + waveOffset * 0.7) * layer.amplitude * 0.5;
              p.vertex(x, y);
            }
            p.endShape();
            layer.offset += layer.speed;
          }
          
          // Draw sophisticated particles with depth and movement
          for (let particle of particles) {
            const wobbleX = p.sin(p.frameCount * 0.01 + particle.wobble) * 2 * particle.depth;
            const wobbleY = p.cos(p.frameCount * 0.008 + particle.wobble * 1.3) * 1.5 * particle.depth;
            
            // Add depth-based color variation
            p.fill(
              particle.color.r, 
              particle.color.g, 
              particle.color.b, 
              particle.alpha * 255
            );
            p.noStroke();
            
            // Draw particle with subtle glow effect
            p.ellipse(
              particle.x + wobbleX, 
              particle.y + wobbleY, 
              particle.size
            );
            
            // Add subtle glow for deeper particles
            if (particle.depth > 0.7) {
              p.fill(particle.color.r, particle.color.g, particle.color.b, particle.alpha * 100);
              p.ellipse(
                particle.x + wobbleX, 
                particle.y + wobbleY, 
                particle.size * 1.5
              );
            }
            
            // Update position with current simulation
            particle.x += particle.vx + p.sin(waveOffset) * 0.1 * particle.depth;
            particle.y += particle.vy + p.cos(waveOffset * 0.7) * 0.05 * particle.depth;
            
            // Wrap around edges
            if (particle.x > p.width + 50) particle.x = -50;
            if (particle.x < -50) particle.x = p.width + 50;
            if (particle.y > p.height + 50) particle.y = -50;
            if (particle.y < -50) particle.y = p.height + 50;
          }

          // Update rising bubbles
          for (let i = bubbles.length - 1; i >= 0; i--) {
            let bubble = bubbles[i];
            
            // Draw bubble with realistic transparency and movement
            p.fill(150, 200, 255, bubble.alpha);
            p.stroke(200, 230, 255, bubble.alpha * 0.5);
            p.strokeWeight(0.5);
            
            const wobbleX = p.sin(bubble.wobble + p.frameCount * 0.05) * bubble.wobbleAmount;
            p.ellipse(bubble.x + wobbleX, bubble.y, bubble.size);
            
            // Update bubble
            bubble.y -= bubble.speed;
            bubble.wobble += 0.1;
            bubble.alpha *= 0.995; // Gradual fade
            bubble.size *= 1.001; // Slight expansion
            
            // Remove old bubbles
            if (bubble.y < -50 || bubble.alpha < 0.01) {
              bubbles.splice(i, 1);
            }
          }
          
          waveOffset += 0.02;
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        // Enhanced sound effect for clicks
        p.mousePressed = () => {
          playRealisticWaterSound();
          createBubbleAt(p.mouseX, p.mouseY);
        };

        const createBubbleAt = (x: number, y: number) => {
          for (let i = 0; i < p.random(3, 8); i++) {
            bubbles.push({
              x: x + p.random(-20, 20),
              y: y,
              size: p.random(3, 12),
              speed: p.random(1, 3),
              alpha: p.random(150, 255),
              wobble: p.random(0, p.TWO_PI),
              wobbleAmount: p.random(5, 15)
            });
          }
        };

        const playRealisticWaterSound = () => {
          if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          
          // Create a more sophisticated water drop sound
          const now = audioContext.currentTime;
          
          // Main water drop frequency
          const osc1 = audioContext.createOscillator();
          const gain1 = audioContext.createGain();
          const filter1 = audioContext.createBiquadFilter();
          
          // Secondary harmonic for richness
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          
          // White noise for splash texture
          const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
          }
          const noiseSource = audioContext.createBufferSource();
          const noiseGain = audioContext.createGain();
          const noiseFilter = audioContext.createBiquadFilter();
          
          // Configure main oscillator
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(450, now);
          osc1.frequency.exponentialRampToValueAtTime(150, now + 0.15);
          osc1.frequency.exponentialRampToValueAtTime(80, now + 0.4);
          
          // Configure secondary oscillator
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(300, now);
          osc2.frequency.exponentialRampToValueAtTime(100, now + 0.3);
          
          // Configure filter for warmth
          filter1.type = 'lowpass';
          filter1.frequency.setValueAtTime(2000, now);
          filter1.frequency.exponentialRampToValueAtTime(400, now + 0.4);
          
          // Configure noise for splash realism
          noiseSource.buffer = buffer;
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.setValueAtTime(1000, now);
          
          // Connect main chain
          osc1.connect(filter1);
          filter1.connect(gain1);
          gain1.connect(audioContext.destination);
          
          // Connect secondary
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          
          // Connect noise
          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(audioContext.destination);
          
          // Envelope for main sound
          gain1.gain.setValueAtTime(0, now);
          gain1.gain.linearRampToValueAtTime(0.15, now + 0.01);
          gain1.gain.exponentialRampToValueAtTime(0.05, now + 0.1);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          
          // Envelope for secondary
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.linearRampToValueAtTime(0.08, now + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          
          // Envelope for noise
          noiseGain.gain.setValueAtTime(0.02, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          
          // Start and stop
          osc1.start(now);
          osc1.stop(now + 0.5);
          
          osc2.start(now);
          osc2.stop(now + 0.3);
          
          noiseSource.start(now);
          noiseSource.stop(now + 0.1);
        };
      };

      if (window.p5) {
        p5InstanceRef.current = new window.p5(sketch);
      }
    };
    
    document.head.appendChild(script);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return <div ref={canvasRef} className="fixed inset-0 pointer-events-none z-1" />;
}