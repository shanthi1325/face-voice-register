import { useRef, useState, useCallback } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  capturedImage?: string | null;
  onClear?: () => void;
}

export function CameraCapture({ onCapture, capturedImage, onClear }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
      stopCamera();
    }, "image/jpeg", 0.85);
  }, [onCapture, stopCamera]);

  if (capturedImage) {
    return (
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border">
        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        {onClear && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={() => { onClear(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {streaming ? (
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button onClick={capture} className="gap-2">
              <Camera className="h-4 w-4" /> Capture
            </Button>
            <Button variant="outline" onClick={stopCamera} className="bg-card/80 backdrop-blur">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <Camera className="h-10 w-10" />
          <span className="text-sm font-medium">Click to open camera</span>
        </button>
      )}
    </div>
  );
}
