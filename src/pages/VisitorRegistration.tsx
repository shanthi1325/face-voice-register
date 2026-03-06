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
import { validateVisitorForm } from "@/lib/validation";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when user types
    if (fieldErrors[key]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const handleVoiceResult = (fields: Record<string, string>) => {
    setForm(prev => ({ ...prev, ...fields }));
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoUrl(URL.createObjectURL(blob));
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error("Please select a visitor type");
      return;
    }

    // Validate form
    const { success, data, errors } = validateVisitorForm(form);
    if (!success) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError || "Please fix the errors in the form");
      return;
    }

    setSubmitting(true);
    try {
      // Check for duplicate registration by email
      if (data.email) {
        const { data: existing } = await supabase
          .from("visitors")
          .select("id, name, photo_url")
          .eq("email", data.email)
          .limit(1);
        if (existing && existing.length > 0) {
          toast.error(`This email (${data.email}) is already registered by "${existing[0].name}". Each person can only register once.`);
          setSubmitting(false);
          return;
        }
      }

      // Check for duplicate face (if photo captured and name matches existing)
      if (photoBlob && data.name) {
        const { data: existingByName } = await supabase
          .from("visitors")
          .select("id, name, photo_url")
          .eq("name", data.name.trim())
          .not("photo_url", "is", null)
          .limit(1);
        if (existingByName && existingByName.length > 0) {
          toast.error(`A visitor named "${data.name}" with a face photo is already registered. If this is you, you don't need to register again.`);
          setSubmitting(false);
          return;
        }
      }

      let uploadedPhotoUrl: string | undefined;

      if (photoBlob) {
        const fileName = `faces/${Date.now()}_${(data.name || "visitor").replace(/\s/g, "_")}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("expo-media").upload(fileName, photoBlob);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("expo-media").getPublicUrl(fileName);
          uploadedPhotoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("visitors").insert({
        visitor_type: selectedType,
        name: data.name!,
        email: data.email || null,
        department: data.department || null,
        branch: data.branch || null,
        college: data.college || null,
        organization: data.organization || null,
        photo_url: uploadedPhotoUrl || null,
        face_captured_at: photoBlob ? new Date().toISOString() : null,
      });

      if (error) throw error;

      // Send confirmation email if email provided
      if (data.email) {
        try {
          const { data: emailResult } = await supabase.functions.invoke("send-registration-email", {
            body: { name: data.name, email: data.email, visitor_type: selectedType },
          });
          if (emailResult?.emailSent) {
            toast.success("Registration successful! A confirmation email has been sent to " + data.email);
          } else {
            toast.success("Registration successful! Welcome to the expo. (Email could not be sent at this time)");
          }
        } catch {
          toast.success("Registration successful! Welcome to the expo.");
        }
      } else {
        toast.success("Registration successful! Welcome to the expo.");
      }

      setSelectedType(null);
      setForm({});
      setFieldErrors({});
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
                    <Input id="name" value={form.name || ""} onChange={e => updateField("name", e.target.value)} placeholder="Your full name" className={fieldErrors.name ? "border-destructive" : ""} />
                    {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email || ""} onChange={e => updateField("email", e.target.value)} placeholder="your@email.com" className={fieldErrors.email ? "border-destructive" : ""} />
                    {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                  </div>

                  {selectedType === "faculty" && (
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={form.department || ""} onChange={e => updateField("department", e.target.value)} placeholder="e.g. Computer Science" className={fieldErrors.department ? "border-destructive" : ""} />
                      {fieldErrors.department && <p className="text-xs text-destructive mt-1">{fieldErrors.department}</p>}
                    </div>
                  )}

                  {selectedType === "student" && (
                    <>
                      <div>
                        <Label htmlFor="branch">Branch</Label>
                        <Input id="branch" value={form.branch || ""} onChange={e => updateField("branch", e.target.value)} placeholder="e.g. CSE, ECE" className={fieldErrors.branch ? "border-destructive" : ""} />
                        {fieldErrors.branch && <p className="text-xs text-destructive mt-1">{fieldErrors.branch}</p>}
                      </div>
                      <div>
                        <Label htmlFor="college">College</Label>
                        <Input id="college" value={form.college || ""} onChange={e => updateField("college", e.target.value)} placeholder="Your college name" className={fieldErrors.college ? "border-destructive" : ""} />
                        {fieldErrors.college && <p className="text-xs text-destructive mt-1">{fieldErrors.college}</p>}
                      </div>
                    </>
                  )}

                  {selectedType === "guest" && (
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input id="organization" value={form.organization || ""} onChange={e => updateField("organization", e.target.value)} placeholder="Your organization" className={fieldErrors.organization ? "border-destructive" : ""} />
                      {fieldErrors.organization && <p className="text-xs text-destructive mt-1">{fieldErrors.organization}</p>}
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
