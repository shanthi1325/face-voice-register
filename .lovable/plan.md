

## Understanding

- **Video Review page**: Remove the separate "Face Capture" section. The person's face is already visible live in the video camera feed during recording — no need for a separate photo capture. The video itself serves as face identification.
- **Registration page**: Face capture remains required (manual click to open camera + capture).

## Plan

### Changes to `src/pages/RecordReview.tsx`
1. Remove the `CameraCapture` import and the entire "Face Capture" card section (lines 111-124).
2. Remove `photoBlob`, `photoUrl`, `handlePhotoCapture` state and the photo upload logic from `handleSubmit`.
3. Keep the `VideoRecorder` — the live camera preview already shows the person's face while they record. The video URL stored in the database is sufficient for face identification.
4. Simplify layout from 2-column grid to a single-column flow: Video on top, then rating + text + submit below.

### Changes to `src/components/VideoRecorder.tsx`
- Keep as-is. The live camera feed already shows the person's face during recording. No automatic screenshot needed — just store the video.

### No changes to Registration
- `VisitorRegistration.tsx` keeps the manual `CameraCapture` component as required.

