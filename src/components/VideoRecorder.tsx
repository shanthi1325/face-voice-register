import { useRef, useState, useCallback } from "react";
import { Video, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoRecorderProps {
  onRecordComplete: (blob: Blob, thumbnailBlob: Blob) => void;
  recordedUrl?: string | null;
  onClear?: () => void;
}

export function VideoRecorder({ onRecordComplete, recordedUrl, onClear }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recording, setRecording] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      console.error("Camera/mic access denied:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStreaming(false);
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    // Take a thumbnail
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    }

    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
      canvasRef.current?.toBlob((thumbBlob) => {
        if (thumbBlob) onRecordComplete(videoBlob, thumbBlob);
      }, "image/jpeg", 0.8);
      stopCamera();
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  }, [onRecordComplete, stopCamera]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  if (recordedUrl) {
    return (
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border">
        <video src={recordedUrl} controls className="w-full h-full object-cover" />
        {onClear && (
          <Button size="icon" variant="destructive" className="absolute top-2 right-2" onClick={onClear}>
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
          {recording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
              Recording
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {recording ? (
              <Button variant="destructive" onClick={stopRecording} className="gap-2">
                <Square className="h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button onClick={startRecording} className="gap-2">
                <Video className="h-4 w-4" /> Record
              </Button>
            )}
            {!recording && (
              <Button variant="outline" onClick={stopCamera} className="bg-card/80 backdrop-blur">
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <Video className="h-10 w-10" />
          <span className="text-sm font-medium">Click to record video review</span>
        </button>
      )}
    </div>
  );
}
