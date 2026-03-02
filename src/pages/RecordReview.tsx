import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CameraCapture } from "@/components/CameraCapture";
import { VideoRecorder } from "@/components/VideoRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RecordReview() {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRecordComplete = (video: Blob, thumb: Blob) => {
    setVideoBlob(video);
    setVideoUrl(URL.createObjectURL(video));
    setThumbBlob(thumb);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please give a rating");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedVideoUrl: string | undefined;
      let uploadedThumbUrl: string | undefined;

      if (videoBlob) {
        const videoName = `reviews/${Date.now()}_review.webm`;
        const { error: uploadErr } = await supabase.storage.from("expo-media").upload(videoName, videoBlob);
        if (!uploadErr) {
          uploadedVideoUrl = supabase.storage.from("expo-media").getPublicUrl(videoName).data.publicUrl;
        }
      }

      if (thumbBlob) {
        const thumbName = `reviews/${Date.now()}_thumb.jpg`;
        await supabase.storage.from("expo-media").upload(thumbName, thumbBlob);
        uploadedThumbUrl = supabase.storage.from("expo-media").getPublicUrl(thumbName).data.publicUrl;
      }

      const { error } = await supabase.from("video_reviews").insert({
        review_text: reviewText || null,
        rating,
        video_url: uploadedVideoUrl || null,
        photo_at_review: uploadedThumbUrl || null,
      });

      if (error) throw error;
      toast.success("Thank you for your review!");
      setRating(0);
      setReviewText("");
      setVideoBlob(null);
      setVideoUrl(null);
      setThumbBlob(null);
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

      <main className="container max-w-3xl mx-auto px-4 py-8 -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8"
        >
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h3 className="font-display font-semibold text-lg mb-4">Video Review</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Record yourself sharing your expo experience. Your face will be captured automatically when you stop recording.
            </p>
            <VideoRecorder
              onRecordComplete={handleRecordComplete}
              recordedUrl={videoUrl}
              onClear={() => { setVideoBlob(null); setVideoUrl(null); setThumbBlob(null); }}
            />
            {thumbBlob && thumbBlob.size > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Face captured at review:</p>
                <img
                  src={URL.createObjectURL(thumbBlob)}
                  alt="Face at review"
                  className="w-24 h-24 rounded-lg object-cover border border-border"
                />
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-6">
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
          </div>
        </motion.div>
      </main>
    </div>
  );
}
