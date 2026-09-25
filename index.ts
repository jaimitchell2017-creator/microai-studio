import { withSupabase } from "npm:@supabase/server@^1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM = `You are MicroAI Studio Assistant, a friendly technical guide for a browser app that connects Teachable Machine image classifiers to micro:bit over Bluetooth UART.
Be concise but useful. Help with AI experiments, Teachable Machine, micro:bit, MakeCode JavaScript, MicroPython, Web Bluetooth, and this project's data model.
Never claim that you can directly access the user's camera, micro:bit, Supabase account, files, or device unless the user has supplied the relevant information in the message.
When suggesting code, prefer small, copyable examples.`;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
      const body = await req.json();
      const message = String(body?.message || "").trim();
      const project = body?.project || {};
      if (!message) {
        return new Response(JSON.stringify({ error: "Message is required." }), { status: 400, headers: corsHeaders });
      }

      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }), { status: 500, headers: corsHeaders });
      }

      const context = JSON.stringify({
        modelUrl: project.modelUrl || "",
        mappings: project.mappings || [],
        projectName: project.projectName || "",
      });

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-6-astra",
          reasoning: { effort: "low" },
          instructions: SYSTEM,
          input: `Project context: ${context}\n\nUser request: ${message}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: data?.error?.message || "OpenAI request failed." }), { status: response.status, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ text: data.output_text || extractOutputText(data) }), { status: 200, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error?.message || "Unexpected server error." }), { status: 500, headers: corsHeaders });
    }
  }),
};

function extractOutputText(data: any) {
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n") || "No text response returned.";
}
