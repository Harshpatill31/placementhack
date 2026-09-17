const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const policyContext = `
You are the Career Compass privacy assistant. Explain the app's real access rules in plain language.

Known access rules:
- A signed-in person can view all of their own profile information and their own job applications.
- An accepted connection can view profile and portfolio sections: the profile, education, experience, projects, certifications, achievements, languages, and skills. An accepted connection cannot view the person's job application records just because they are connected.
- A company can view the profile and portfolio sections of a person who has applied to that company's job. That company can also view the application record for its own job, including its application status, cover letter, match percentage, interview details, feedback, and submitted resume when available.
- A person can view their own uploaded profile files. A company can view an uploaded profile file only when that person applied to one of the company's jobs.
- Other signed-in users can view active job listings, but not private profile sections or application records unless one of the rules above grants access.
- Signed-out visitors and anonymous users do not receive private profile or application access.
- The reason for these rules is least-privilege access: people control their own data, accepted connections support networking, and applicant companies can review candidates for roles they posted.

Answer only questions about Career Compass privacy and visibility. Do not invent permissions, reveal implementation details, request personal data, or advise anyone to bypass access controls. If a question is outside this scope, say that you can explain profile and application visibility only. Keep answers under 180 words. Use short headings or bullets when helpful. Never claim that an accepted connection can see an application.
`;

const getErrorMessage = (status: number, body: string) => {
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    return parsed.error || parsed.message || body;
  } catch {
    return body;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST requests are supported." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Please sign in to use the privacy assistant." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let question: unknown;
  try {
    const body = await request.json();
    question = body?.question;
  } catch {
    return new Response(JSON.stringify({ error: "Please enter a privacy question." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (typeof question !== "string" || !question.trim()) {
    return new Response(JSON.stringify({ error: "Please enter a privacy question." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const trimmedQuestion = question.trim().slice(0, 800);
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "The privacy assistant is not configured yet." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableApiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        input: [
          { role: "system", content: [{ type: "input_text", text: policyContext }] },
          { role: "user", content: [{ type: "input_text", text: trimmedQuestion }] },
        ],
      }),
      signal: request.signal,
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({ error: getErrorMessage(upstream.status, errorBody) }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!upstream.body) {
      return new Response(JSON.stringify({ error: "The privacy assistant returned no response." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "The privacy assistant could not respond.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});