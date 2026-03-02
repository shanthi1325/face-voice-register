import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  capturedImage?: string | null;
  onClear?: () => void;
  autoStart?: boolean;
}

export function CameraCapture({ onCapture, capturedImage, onClear, autoStart = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
      setStreaming(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      toast.error("Camera access denied. Please allow camera permission.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setCameraReady(false);
  }, []);

  // Auto-start camera if requested
  useEffect(() => {
    if (autoStart && !capturedImage && !streaming) {
      startCamera();
    }
    return () => {
      // Cleanup on unmount
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [autoStart]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          toast.success("Photo captured!");
        }
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }, [onCapture, stopCamera]);

  if (capturedImage) {
    return (
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border">
        <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
        {onClear && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={onClear}
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
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button onClick={capture} className="gap-2" disabled={!cameraReady}>
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
          type="button"
          className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <Camera className="h-10 w-10" />
          <span className="text-sm font-medium">Click to open camera</span>
        </button>
      )}
    </div>
  );
}
