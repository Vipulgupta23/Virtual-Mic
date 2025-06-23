import { useEffect, useRef } from "react";

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
        // Use qr-code library via CDN
        const QRCode = (window as any).QRCode;
        if (QRCode) {
          await QRCode.toCanvas(canvas, value, {
            width: size,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
        } else {
          // Fallback: simple pattern for demo
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#FFFFFF';
            
            // Create a simple QR-like pattern
            const moduleSize = size / 21; // Standard QR code is 21x21 modules
            for (let i = 0; i < 21; i++) {
              for (let j = 0; j < 21; j++) {
                if ((i + j) % 2 === 0) {
                  ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('QR Code generation failed:', error);
      }
    };

    // Load QR code library if not already loaded
    if (!(window as any).QRCode) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = generateQR;
      document.head.appendChild(script);
    } else {
      generateQR();
    }
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
