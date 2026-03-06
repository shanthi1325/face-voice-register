import { useState } from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VideoRecorder } from "@/components/VideoRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RecordReview() {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRecordComplete = (video: Blob, _thumb: Blob) => {
    setVideoBlob(video);
    setVideoUrl(URL.createObjectURL(video));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please give a rating");
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
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
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
            <p className="text-muted-foreground">
              Your feedback is valuable to us. We appreciate you taking the time to share your experience at the expo.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setReviewText("");
                setVideoBlob(null);
                setVideoUrl(null);
              }}
            >
              Submit Another Review
            </Button>
          </motion.div>
        </main>
      ) : (
      <main className="container max-w-2xl mx-auto px-4 py-8 -mt-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 shadow-card border border-border"
        >
          <h3 className="font-display font-semibold text-lg mb-4">Video Review</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your face will be visible live during recording
          </p>
          <VideoRecorder
            onRecordComplete={handleRecordComplete}
            recordedUrl={videoUrl}
            onClear={() => { setVideoBlob(null); setVideoUrl(null); }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-6 shadow-card border border-border space-y-6"
        >
          <div>
            <h3 className="font-display font-semibold text-lg mb-3">Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? "fill-accent text-accent"
                        : "text-border"
                    }`}
                  />
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
