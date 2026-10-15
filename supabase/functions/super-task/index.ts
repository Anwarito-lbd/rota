// Rota — confirms a waitlist address (the link in the send-welcome e-mail).
//
// GET ?token=<uuid> → redirect to the website with #confirmed or #confirm-error.
// Deployed under the slug `super-task` (named "confirm-mail" in the dashboard):
// the links already sent point here, so the slug stays.

Deno.serve(async (req) => {
  const site = (Deno.env.get("SITE_URL") ?? "https://www.therotaapp.com/").replace(/\/$/, "");
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return Response.redirect(site + "/#confirm-error", 302);
  const url = Deno.env.get("SUPABASE_URL") + "/rest/v1/waitlist?token=eq." + token;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ confirmed: true, confirmed_at: new Date().toISOString() }),
  });
  const rows = r.ok ? await r.json() : [];
  return Response.redirect(site + (rows.length ? "/#confirmed" : "/#confirm-error"), 302);
});
