import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, GraduationCap, Briefcase, Users, Camera, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CameraCapture } from "@/components/CameraCapture";
import { VoiceInput } from "@/components/VoiceInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const visitorTypes = [
  { value: "faculty", label: "Faculty", icon: Briefcase, desc: "Name, Email, Department" },
  { value: "student", label: "Student", icon: GraduationCap, desc: "Name, Branch, Email, College" },
  { value: "guest", label: "Guest", icon: Users, desc: "Name, Email, Organization" },
  { value: "other", label: "Other", icon: User, desc: "Name, Email" },
] as const;

type VisitorType = typeof visitorTypes[number]["value"];

export default function VisitorRegistration() {
  const [selectedType, setSelectedType] = useState<VisitorType | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleVoiceResult = (fields: Record<string, string>) => {
    setForm(prev => ({ ...prev, ...fields }));
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoUrl(URL.createObjectURL(blob));
  };

  const handleSubmit = async () => {
    if (!selectedType || !form.name) {
      toast.error("Please provide at least your name");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedPhotoUrl: string | undefined;

      if (photoBlob) {
        const fileName = `faces/${Date.now()}_${form.name?.replace(/\s/g, "_")}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("expo-media").upload(fileName, photoBlob);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("expo-media").getPublicUrl(fileName);
          uploadedPhotoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("visitors").insert({
        visitor_type: selectedType,
        name: form.name,
        email: form.email || null,
        department: form.department || null,
        branch: form.branch || null,
        college: form.college || null,
        organization: form.organization || null,
        photo_url: uploadedPhotoUrl || null,
        face_captured_at: photoBlob ? new Date().toISOString() : null,
      });

      if (error) throw error;
      toast.success("Registration successful! Welcome to the expo.");
      setSelectedType(null);
      setForm({});
      setPhotoBlob(null);
      setPhotoUrl(null);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">
            Visitor Registration
          </h1>
          <p className="text-primary-foreground/80 mt-2">
            Register using voice or fill in the form below
          </p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 -mt-4">
        {/* Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {visitorTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => { setSelectedType(type.value); setForm({}); setPhotoBlob(null); setPhotoUrl(null); }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === type.value
                  ? "border-primary bg-primary/5 shadow-card"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <type.icon className={`h-6 w-6 mb-2 ${selectedType === type.value ? "text-primary" : "text-muted-foreground"}`} />
              <div className="font-display font-semibold text-sm">{type.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{type.desc}</div>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedType && (
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="grid md:grid-cols-2 gap-8"
            >
              {/* Form */}
              <div className="space-y-5 bg-card rounded-xl p-6 shadow-card border border-border">
                <VoiceInput
                  visitorType={selectedType}
                  onResult={handleVoiceResult}
                  isListening={isListening}
                  onListeningChange={setIsListening}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or fill manually</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={form.name || ""} onChange={e => updateField("name", e.target.value)} placeholder="Your full name" />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email || ""} onChange={e => updateField("email", e.target.value)} placeholder="your@email.com" />
                  </div>

                  {selectedType === "faculty" && (
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={form.department || ""} onChange={e => updateField("department", e.target.value)} placeholder="e.g. Computer Science" />
                    </div>
                  )}

                  {selectedType === "student" && (
                    <>
                      <div>
                        <Label htmlFor="branch">Branch</Label>
                        <Input id="branch" value={form.branch || ""} onChange={e => updateField("branch", e.target.value)} placeholder="e.g. CSE, ECE" />
                      </div>
                      <div>
                        <Label htmlFor="college">College</Label>
                        <Input id="college" value={form.college || ""} onChange={e => updateField("college", e.target.value)} placeholder="Your college name" />
                      </div>
                    </>
                  )}

                  {selectedType === "guest" && (
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input id="organization" value={form.organization || ""} onChange={e => updateField("organization", e.target.value)} placeholder="Your organization" />
                    </div>
                  )}
                </div>

                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Registering..." : "Register & Enter Expo"}
                </Button>
              </div>

              {/* Camera */}
              <div className="bg-card rounded-xl p-6 shadow-card border border-border">
                <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Face Capture
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Capture your face for identification in the expo hall
                </p>
                <CameraCapture
                  onCapture={handlePhotoCapture}
                  capturedImage={photoUrl}
                  onClear={() => { setPhotoBlob(null); setPhotoUrl(null); }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
