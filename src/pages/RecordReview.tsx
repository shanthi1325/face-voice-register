import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle } from "lucide-react";
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
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string>("");

  useEffect(() => {
    supabase.from("visitors").select("id, name").order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setVisitors(data);
      });
  }, []);

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
          {/* Select Visitor */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-6 shadow-card border border-border"
          >
            <Label>Select Your Name *</Label>
            <Select value={selectedVisitorId} onValueChange={setSelectedVisitorId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose your name" />
              </SelectTrigger>
              <SelectContent>
                {visitors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </motion.div>
        </main>
      )}
    </div>
  );
}
