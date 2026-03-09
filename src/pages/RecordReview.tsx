import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, Loader2, ScanFace, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoRecorder } from "@/components/VideoRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSchema, reviewSchema } from "@/lib/validation";
import { getSignedUrls } from "@/lib/signedUrl";

export default function RecordReview() {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>("");
  const [matchedVisitor, setMatchedVisitor] = useState<{ name: string; photoUrl?: string; confidence: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanCameraOpen, setScanCameraOpen] = useState(false);
  const [capturedFaceBase64, setCapturedFaceBase64] = useState<string | null>(null);

  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);

  // Auto-open camera on mount
  useEffect(() => {
    openScanCamera();
    return () => {
      scanStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const openScanCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      scanStreamRef.current = stream;
      setScanCameraOpen(true);
    } catch {
      toast.error("Camera access denied. Please allow permissions.");
    }
  };

  const closeScanCamera = useCallback(() => {
    scanStreamRef.current?.getTracks().forEach(t => t.stop());
    scanStreamRef.current = null;
    setScanCameraOpen(false);
  }, []);

  const captureAndMatch = useCallback(async () => {
    if (!scanVideoRef.current || !scanCanvasRef.current) return;
    const video = scanVideoRef.current;
    const canvas = scanCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    setCapturedFaceBase64(base64);

    setScanning(true);
    setMatchedVisitor(null);
    try {
      const { data, error } = await supabase.functions.invoke("match-face", {
        body: { capturedImageBase64: base64 },
      });

      if (error) throw error;

      if (data?.matched && data.visitor_id) {
        setSelectedVisitorId(data.visitor_id);

        // Get signed photo URL for matched visitor
        let photoUrl: string | undefined;
        const { data: visitor } = await supabase
          .from("visitors")
          .select("photo_url")
          .eq("id", data.visitor_id)
          .single();
        if (visitor?.photo_url) {
          const signed = await getSignedUrls([visitor.photo_url]);
          photoUrl = signed.get(visitor.photo_url) || undefined;
        }

        setMatchedVisitor({
          name: data.visitor_name,
          photoUrl,
          confidence: data.confidence || 0,
        });
        toast.success(`Identified: ${data.visitor_name}!`);
        closeScanCamera();
      } else {
        toast.error(data?.message || "No matching face found. Please try again.");
      }
    } catch (err: any) {
      toast.error("Face matching failed. Please try again.");
      console.error("match-face error:", err);
    } finally {
      setScanning(false);
    }
  }, [closeScanCamera]);

  const handleRecordComplete = (video: Blob, _thumb: Blob) => {
    setVideoBlob(video);
    setVideoUrl(URL.createObjectURL(video));
  };

  const handleSubmit = async () => {
    if (!selectedVisitorId) {
      toast.error("Please scan your face to identify yourself first.");
      return;
    }

    const validation = validateSchema(reviewSchema, {
      projectTitle,
      reviewText,
      rating,
      visitorId: selectedVisitorId,
    });
    if (!validation.success) {
      const firstErr = Object.values(validation.errors)[0];
      if (firstErr) toast.error(firstErr);
      return;
    }

    setSubmitting(true);
    try {
      // Upload review face photo
      let photoAtReviewUrl: string | undefined;
      if (capturedFaceBase64) {
        const photoName = `reviews/${Date.now()}_face.jpg`;
        const binaryStr = atob(capturedFaceBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/jpeg" });
        const { error: photoUpErr } = await supabase.storage.from("expo-media").upload(photoName, blob);
        if (!photoUpErr) {
          photoAtReviewUrl = supabase.storage.from("expo-media").getPublicUrl(photoName).data.publicUrl;
        }
      }

      // Upload video
      let uploadedVideoUrl: string | undefined;
      if (videoBlob) {
        const videoName = `reviews/${Date.now()}_review.webm`;
        const { error: uploadErr } = await supabase.storage.from("expo-media").upload(videoName, videoBlob);
        if (!uploadErr) {
          uploadedVideoUrl = supabase.storage.from("expo-media").getPublicUrl(videoName).data.publicUrl;
        }
      }

      const { error } = await supabase.from("video_reviews").insert({
        review_text: reviewText || null,
        rating,
        video_url: uploadedVideoUrl || null,
        visitor_id: selectedVisitorId,
        project_title: projectTitle.trim(),
        photo_at_review: photoAtReviewUrl || null,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setRating(0);
    setReviewText("");
    setProjectTitle("");
    setVideoBlob(null);
    setVideoUrl(null);
    setSelectedVisitorId("");
    setMatchedVisitor(null);
    setCapturedFaceBase64(null);
    openScanCamera();
  };

  const retryScan = () => {
    setSelectedVisitorId("");
    setMatchedVisitor(null);
    setCapturedFaceBase64(null);
    openScanCamera();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero py-8">
        <div className="container max-w-3xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Record Your Review
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Share your experience at the expo with a video review
          </p>
        </div>
      </header>

      {submitted ? (
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl p-10 shadow-card border border-border text-center space-y-4"
          >
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-display font-bold">Thank You for Your Review!</h2>
            <p className="text-muted-foreground">Your feedback is valuable to us.</p>
            <Button variant="outline" onClick={resetForm}>Submit Another Review</Button>
          </motion.div>
        </main>
      ) : (
        <main className="container max-w-2xl mx-auto px-4 py-8 -mt-4 space-y-6">
          {/* Face Scan - auto identify */}
          {!matchedVisitor && scanCameraOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4"
            >
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-primary" /> Face Identification
              </h3>
              <p className="text-sm text-muted-foreground">
                Look at the camera and tap "Scan" to identify yourself from your registration photo.
              </p>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted">
                <video
                  ref={(el) => {
                    scanVideoRef.current = el;
                    if (el && scanStreamRef.current && !el.srcObject) {
                      el.srcObject = scanStreamRef.current;
                      el.play().catch(console.error);
                    }
                  }}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={scanCanvasRef} className="hidden" />
                {scanning && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm font-medium text-foreground">Matching face...</span>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={captureAndMatch} disabled={scanning} className="w-full gap-2">
                <ScanFace className="h-4 w-4" />
                {scanning ? "Scanning..." : "Scan Face"}
              </Button>
            </motion.div>
          )}

          {/* Matched visitor display */}
          {matchedVisitor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border"
            >
              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                {matchedVisitor.photoUrl ? (
                  <img src={matchedVisitor.photoUrl} alt={matchedVisitor.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-2xl">
                    {matchedVisitor.name?.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{matchedVisitor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ✅ Identified ({Math.round(matchedVisitor.confidence * 100)}% confidence)
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={retryScan} className="gap-1">
                  <RefreshCw className="h-4 w-4" /> Rescan
                </Button>
              </div>
            </motion.div>
          )}

          {/* Project Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border"
          >
            <Label>Project Title *</Label>
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Enter the project/stall name you're reviewing"
              className="mt-2"
            />
          </motion.div>

          {/* Video */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border"
          >
            <h3 className="font-display font-semibold text-lg mb-4">Video Review</h3>
            <VideoRecorder
              onRecordComplete={handleRecordComplete}
              recordedUrl={videoUrl}
              onClear={() => { setVideoBlob(null); setVideoUrl(null); }}
            />
          </motion.div>

          {/* Rating & Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border space-y-6"
          >
            <div>
              <h3 className="font-display font-semibold text-lg mb-3">Rating *</h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${star <= rating ? "fill-accent text-accent" : "text-border"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-display font-semibold text-lg mb-3">Written Review (optional)</h3>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={4}
              />
            </div>

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting || !selectedVisitorId}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </motion.div>
        </main>
      )}
    </div>
  );
}
