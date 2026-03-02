import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceInputProps {
  onResult: (fields: Record<string, string>) => void;
  visitorType: string;
  isListening: boolean;
  onListeningChange: (v: boolean) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function VoiceInput({ onResult, visitorType, isListening, onListeningChange }: VoiceInputProps) {
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      parseVoiceInput(transcript);
      onListeningChange(false);
    };

    recognition.onerror = () => {
      onListeningChange(false);
      toast.error("Could not understand. Please try again.");
    };

    recognition.onend = () => onListeningChange(false);

    recognition.start();
    onListeningChange(true);
    toast.info("Listening... Please say your details");
  }, [visitorType, onResult, onListeningChange]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    onListeningChange(false);
  }, [onListeningChange]);

  const parseVoiceInput = (transcript: string) => {
    const lower = transcript.toLowerCase();
    const fields: Record<string, string> = {};

    // Try to extract name
    const nameMatch = lower.match(/(?:my name is|i am|name)\s+([a-z\s]+?)(?:\s+(?:from|email|branch|department|college|organization|and)|$)/i);
    if (nameMatch) fields.name = capitalize(nameMatch[1].trim());

    // Email
    const emailMatch = transcript.match(/([a-zA-Z0-9._%+-]+\s*(?:at|@)\s*[a-zA-Z0-9.-]+\s*(?:dot|\.)\s*[a-zA-Z]{2,})/i);
    if (emailMatch) {
      fields.email = emailMatch[1].replace(/\s*at\s*/gi, "@").replace(/\s*dot\s*/gi, ".").replace(/\s/g, "");
    }

    // Department
    const deptMatch = lower.match(/department\s+(?:is\s+)?([a-z\s]+?)(?:\s+(?:and|email|branch|college)|$)/i);
    if (deptMatch) fields.department = capitalize(deptMatch[1].trim());

    // Branch
    const branchMatch = lower.match(/branch\s+(?:is\s+)?([a-z\s]+?)(?:\s+(?:and|email|department|college)|$)/i);
    if (branchMatch) fields.branch = capitalize(branchMatch[1].trim());

    // College
    const collegeMatch = lower.match(/college\s+(?:is\s+)?([a-z\s]+?)(?:\s+(?:and|email|department|branch)|$)/i);
    if (collegeMatch) fields.college = capitalize(collegeMatch[1].trim());

    // Organization
    const orgMatch = lower.match(/(?:organization|company|org)\s+(?:is\s+)?([a-z\s]+?)(?:\s+(?:and|email)|$)/i);
    if (orgMatch) fields.organization = capitalize(orgMatch[1].trim());

    // If no structured extraction, use as name
    if (Object.keys(fields).length === 0) {
      fields.name = capitalize(transcript.trim());
    }

    onResult(fields);
    toast.success("Voice input captured!");
  };

  const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="lg"
      className="gap-2 w-full"
      onClick={isListening ? stopListening : startListening}
    >
      {isListening ? (
        <>
          <div className="relative">
            <MicOff className="h-5 w-5" />
            <div className="absolute inset-0 rounded-full border-2 border-destructive animate-pulse-ring" />
          </div>
          Stop Listening
        </>
      ) : (
        <>
          <Mic className="h-5 w-5" />
          Speak Your Details
        </>
      )}
    </Button>
  );
}
