import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, ScanFace, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [visitors, setVisitors] = useState<any[]>([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>("");
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<Map<string, string>>(new Map());
  const [scanning, setScanning] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; visitor_name?: string; confidence?: number } | null>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);
  const [scanCameraOpen, setScanCameraOpen] = useState(false);

  useEffect(() => {
    supabase.from("visitors").select("id, name, photo_url").order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (data) {
          setVisitors(data);
          const photoUrls = data.filter(v => v.photo_url).map(v => v.photo_url!);
          if (photoUrls.length > 0) {
            const signed = await getSignedUrls(photoUrls);
            setSignedPhotoUrls(signed);
          }
        }
      });
  }, []);

  const openScanCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      scanStreamRef.current = stream;
      setScanCameraOpen(true);
    } catch {
      toast.error("Camera access denied. Please allow permissions.");
    }
  }, []);

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

    setScanning(true);
    setMatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("match-face", {
        body: { capturedImageBase64: base64 },
      });

      if (error) throw error;

      if (data?.matched && data.visitor_id) {
        setSelectedVisitorId(data.visitor_id);
        setMatchResult({ matched: true, visitor_name: data.visitor_name, confidence: data.confidence });
        toast.success(`Face matched: ${data.visitor_name}!`);
        closeScanCamera();
      } else {
        setMatchResult({ matched: false });
        toast.error(data?.message || "No matching face found. Please try again or select manually.");
      }
    } catch (err: any) {
      toast.error("Face matching failed. Please select your name manually.");
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
    setMatchResult(null);
  };

  const selectedVisitor = visitors.find(v => v.id === selectedVisitorId);
  const selectedPhotoUrl = selectedVisitor?.photo_url ? signedPhotoUrls.get(selectedVisitor.photo_url) : null;

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
            <p className="text-muted-foreground">
              Your feedback is valuable to us.
            </p>
            <Button variant="outline" onClick={resetForm}>
              Submit Another Review
            </Button>
          </motion.div>
        </main>
      ) : (
        <main className="container max-w-2xl mx-auto px-4 py-8 -mt-4 space-y-6">
          {/* Face Scan & Identity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4"
          >
            <h3 className="font-display font-semibold text-lg">Identify Yourself</h3>
            <p className="text-sm text-muted-foreground">
              Scan your face to automatically match with your registration, or select your name manually.
            </p>

            {/* Face scan camera */}
            {scanCameraOpen ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted">
                  <video
                    ref={(el) => {
                      (scanVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
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
                <div className="flex gap-2">
                  <Button onClick={captureAndMatch} disabled={scanning} className="flex-1 gap-2">
                    <ScanFace className="h-4 w-4" />
                    {scanning ? "Scanning..." : "Scan Face"}
                  </Button>
                  <Button variant="outline" onClick={closeScanCamera} disabled={scanning}>
                    Cancel
                  </Button>
                </div>
                {matchResult && !matchResult.matched && (
                  <p className="text-sm text-destructive">No match found. Try again or select your name below.</p>
                )}
              </div>
            ) : (
              <Button variant="outline" onClick={openScanCamera} className="w-full gap-2">
                <ScanFace className="h-5 w-5" />
                Scan Face to Identify
              </Button>
            )}

            {/* Match result / selected visitor display */}
            {selectedVisitor && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20"
              >
                {selectedPhotoUrl ? (
                  <img src={selectedPhotoUrl} alt={selectedVisitor.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-2xl">
                    {selectedVisitor.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{selectedVisitor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {matchResult?.matched
                      ? `✅ Face matched (${Math.round((matchResult.confidence || 0) * 100)}% confidence)`
                      : selectedPhotoUrl
                        ? "✅ Registration photo on file"
                        : "No face photo on file"}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Manual fallback dropdown */}
            <div>
              <Label>Or Select Your Name Manually *</Label>
              <Select value={selectedVisitorId} onValueChange={(val) => { setSelectedVisitorId(val); setMatchResult(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your registered name" />
                </SelectTrigger>
                <SelectContent>
                  {visitors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

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

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </motion.div>
        </main>
      )}
    </div>
  );
}
