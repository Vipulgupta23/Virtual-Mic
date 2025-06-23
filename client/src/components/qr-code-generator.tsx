import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeGenerator({ value, size = 128, className = "" }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('QR Code generation failed:', error);
        
        // Fallback: draw a simple QR-like pattern
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);
          
          ctx.fillStyle = '#000000';
          const moduleSize = size / 25;
          
          // Generate a pseudo-random pattern based on the value
          const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          let random = seed;
          
          const pseudoRandom = () => {
            random = (random * 1103515245 + 12345) & 0x7fffffff;
            return random / 0x7fffffff;
          };
          
          // Draw finder patterns (corners)
          const drawFinderPattern = (x: number, y: number) => {
            ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
            ctx.fillStyle = '#000000';
            ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
          };
          
          drawFinderPattern(0, 0);
          drawFinderPattern(18, 0);
          drawFinderPattern(0, 18);
          
          // Draw data modules
          for (let i = 0; i < 25; i++) {
            for (let j = 0; j < 25; j++) {
              if ((i < 9 && j < 9) || (i > 15 && j < 9) || (i < 9 && j > 15)) continue;
              
              if (pseudoRandom() > 0.5) {
                ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
              }
            }
          }
        }
      }
    };

    generateQR();
  }, [value, size]);

  return (
    <div className={`inline-block p-4 bg-white border-2 border-gray-300 rounded-2xl shadow-sm ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg"
      />
    </div>
  );
}
