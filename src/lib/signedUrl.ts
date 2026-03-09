import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a public storage URL to a signed URL (since bucket is private).
 * Falls back to the original URL if signing fails.
 */
export async function getSignedUrl(publicUrl: string | null | undefined): Promise<string | null> {
  if (!publicUrl) return null;

  // Extract the path from the public URL
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/expo-media\/(.+)$/);
  if (!match) return publicUrl; // Not a storage URL, return as-is

  const filePath = match[1];
  const { data, error } = await supabase.storage
    .from("expo-media")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Batch convert multiple URLs to signed URLs
 */
export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const storagePaths: { original: string; path: string }[] = [];

  for (const url of paths) {
    if (!url) continue;
    const match = url.match(/\/storage\/v1\/object\/public\/expo-media\/(.+)$/);
    if (match) {
      storagePaths.push({ original: url, path: match[1] });
    } else {
      result.set(url, url);
    }
  }

  if (storagePaths.length > 0) {
    const { data, error } = await supabase.storage
      .from("expo-media")
      .createSignedUrls(
        storagePaths.map((p) => p.path),
        3600
      );

    if (!error && data) {
      data.forEach((item, i) => {
        if (item.signedUrl) {
          result.set(storagePaths[i].original, item.signedUrl);
        }
      });
    }
  }

  return result;
}
