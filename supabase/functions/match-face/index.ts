import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { capturedImageBase64 } = await req.json();
    if (!capturedImageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get visitors with photos
    const { data: visitors, error: vErr } = await supabase
      .from("visitors")
      .select("id, name, photo_url")
      .not("photo_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (vErr || !visitors?.length) {
      return new Response(
        JSON.stringify({ matched: false, message: "No registered visitors with photos found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URLs for visitor photos
    const photoPaths = visitors
      .map((v) => {
        const match = v.photo_url?.match(/\/storage\/v1\/object\/public\/expo-media\/(.+)$/);
        return match ? { id: v.id, name: v.name, path: match[1] } : null;
      })
      .filter(Boolean) as { id: string; name: string; path: string }[];

    if (photoPaths.length === 0) {
      return new Response(
        JSON.stringify({ matched: false, message: "No valid photo URLs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signed URLs for all photos
    const { data: signedData } = await supabase.storage
      .from("expo-media")
      .createSignedUrls(
        photoPaths.map((p) => p.path),
        300
      );

    if (!signedData?.length) {
      return new Response(
        JSON.stringify({ matched: false, message: "Could not access visitor photos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build image content for AI comparison - send captured image + up to 10 visitor photos
    const visitorImages = signedData.slice(0, 10).map((item, i) => ({
      type: "image_url" as const,
      image_url: { url: item.signedUrl },
      _meta: { id: photoPaths[i].id, name: photoPaths[i].name },
    }));

    const content: any[] = [
      {
        type: "text",
        text: `You are a face matching assistant. I will show you a captured face image first, followed by ${visitorImages.length} registered visitor photos. Compare the captured face with each visitor photo and determine if any of them match the same person.

The registered visitors are (in order):
${visitorImages.map((v, i) => `${i + 1}. Name: "${v._meta.name}", ID: "${v._meta.id}"`).join("\n")}

IMPORTANT: Only report a match if you are confident (>80%) the faces belong to the same person. Consider facial features like eyes, nose, mouth shape, face shape, etc.

Respond in this exact JSON format:
{"matched": true, "visitor_id": "the-id", "visitor_name": "the-name", "confidence": 0.85}
or if no match:
{"matched": false, "message": "No matching face found among registered visitors"}

Respond with ONLY the JSON, no other text.`,
      },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${capturedImageBase64}` },
      },
      ...visitorImages.map((v) => ({
        type: "image_url",
        image_url: { url: v.image_url.url },
      })),
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", errText);
      return new Response(
        JSON.stringify({ matched: false, message: "Face matching service unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const responseText = aiResult.choices?.[0]?.message?.content?.trim() || "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ matched: false, message: "Could not parse face matching result" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("match-face error:", err);
    return new Response(
      JSON.stringify({ matched: false, message: "Internal error during face matching" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
