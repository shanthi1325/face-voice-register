import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoRecorder } from "@/components/VideoRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateSchema, reviewSchema } from "@/lib/validation";

export default function RecordReview() {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [customProject, setCustomProject] = useState(false);
  const [existingProjects, setExistingProjects] = useState<string[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("video_reviews")
        .select("project_title")
        .not("project_title", "is", null);
      if (data) {
        const unique = [...new Set(data.map((r) => r.project_title).filter(Boolean))] as string[];
        setExistingProjects(unique.sort());
      }
    };
    fetchProjects();
  }, []);

  const handleRecordComplete = (video: Blob, thumb: Blob) => {
    setVideoBlob(video);
    setVideoUrl(URL.createObjectURL(video));
    setThumbnailBlob(thumb);
  };

  const handleSubmit = async () => {
    const validation = validateSchema(reviewSchema, {
      projectTitle,
      reviewText,
      rating,
    });
    if (!validation.success) {
      const firstErr = Object.values(validation.errors)[0];
      if (firstErr) toast.error(firstErr);
      return;
    }

    if (!thumbnailBlob || thumbnailBlob.size === 0) {
      toast.error("Please record a video first so we can identify you.");
      return;
    }

    setSubmitting(true);
    try {
      // Convert thumbnail to base64 for face matching
      const base64 = await blobToBase64(thumbnailBlob);

      // Match face against registered visitors
      const { data: matchData, error: matchError } = await supabase.functions.invoke("match-face", {
        body: { capturedImageBase64: base64 },
      });

      if (matchError) throw matchError;

      if (!matchData?.matched || !matchData.visitor_id) {
        toast.error(matchData?.message || "Could not identify you. Please make sure you registered first.");
        setSubmitting(false);
        return;
      }

      toast.success(`Identified as ${matchData.visitor_name} (${Math.round((matchData.confidence || 0) * 100)}% confidence)`);

      // Upload face photo
      let photoAtReviewUrl: string | undefined;
      const photoName = `reviews/${Date.now()}_face.jpg`;
      const { error: photoUpErr } = await supabase.storage.from("expo-media").upload(photoName, thumbnailBlob);
      if (!photoUpErr) {
        photoAtReviewUrl = supabase.storage.from("expo-media").getPublicUrl(photoName).data.publicUrl;
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
        visitor_id: matchData.visitor_id,
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
    setCustomProject(false);
    setVideoBlob(null);
    setVideoUrl(null);
    setThumbnailBlob(null);
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
          {/* Project Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border space-y-3"
          >
            <Label>Project Title *</Label>
            {!customProject && existingProjects.length > 0 ? (
              <>
                <Select
                  value={projectTitle}
                  onValueChange={(val) => {
                    if (val === "__other__") {
                      setCustomProject(true);
                      setProjectTitle("");
                    } else {
                      setProjectTitle(val);
                    }
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingProjects.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                    <SelectItem value="__other__">Other (type manually)</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="space-y-2">
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Enter the project/stall name you're reviewing"
                  className="mt-2"
                />
                {existingProjects.length > 0 && (
                  <button
                    type="button"
                    className="text-sm text-primary underline"
                    onClick={() => { setCustomProject(false); setProjectTitle(""); }}
                  >
                    Select from existing projects
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* Video */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border"
          >
            <h3 className="font-display font-semibold text-lg mb-2">Video Review *</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your face will be automatically matched with your registration to identify you.
            </p>
            <VideoRecorder
              onRecordComplete={handleRecordComplete}
              recordedUrl={videoUrl}
              onClear={() => { setVideoBlob(null); setVideoUrl(null); setThumbnailBlob(null); }}
            />
          </motion.div>

          {/* Rating & Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Identifying & Submitting...
                </span>
              ) : (
                "Submit Review"
              )}
            </Button>
          </motion.div>
        </main>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
