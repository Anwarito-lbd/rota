// Rota — the website's waitlist e-mail (therotaapp.com).
//
// POST { id } from the waitlist trigger (migration 037).
//
// It only takes a row id: the address, language and confirmation token are
// read from the table. It writes once per sign-up, within the hour after it,
// and never to a confirmed address, so calling it from outside can't send
// Rota e-mails to anyone or flood an inbox.
//
// Secrets: RESEND_API_KEY, FROM_EMAIL, LOGO_URL (SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase).

const COPY = {
  fr: {
    subject: "Confirmez votre inscription à Rota",
    pre: "Un clic pour confirmer votre adresse et rejoindre la liste d'attente Rota.",
    h1: "Confirmez votre e-mail.",
    p: "Merci de rejoindre Rota. Confirmez que cette adresse est bien la vôtre : on vous écrira dès l'ouverture à Paris, avant tout le monde.",
    nextTitle: "En attendant",
    next: [["Louez", "des tenues dans les dressings près de chez vous."], ["Prêtez", "vos pièces qui dorment, à vos règles."], ["Main à main", "dans Paris, ou livraison partout en France."]],
    cta: "Confirmer mon e-mail", ignore: "Vous n'êtes pas à l'origine de cette inscription ? Ignorez cet e-mail.",
    foot: "Vous recevez cet e-mail car vous vous êtes inscrit·e sur la liste d'attente Rota.",
    unsub: "Se désinscrire"
  },
  en: {
    subject: "Confirm your Rota sign-up",
    pre: "One click to confirm your address and join the Rota waitlist.",
    h1: "Confirm your email.",
    p: "Thanks for joining Rota. Confirm this address is yours and we'll write to you the moment we open in Paris, before anyone else.",
    nextTitle: "Meanwhile",
    next: [["Rent", "outfits from wardrobes near you."], ["Lend", "the pieces you never wear, on your terms."], ["Hand to hand", "in Paris, or delivery anywhere in France."]],
    cta: "Confirm my email", ignore: "Didn't sign up? Just ignore this email.",
    foot: "You're receiving this email because you joined the Rota waitlist.",
    unsub: "Unsubscribe"
  },
  es: {
    subject: "Confirma tu inscripción en Rota",
    pre: "Un clic para confirmar tu dirección y unirte a la lista de espera de Rota.",
    h1: "Confirma tu e-mail.",
    p: "Gracias por unirte a Rota. Confirma que esta dirección es tuya y te escribiremos en cuanto abramos en París, antes que nadie.",
    nextTitle: "Mientras tanto",
    next: [["Alquila", "ropa de armarios cerca de ti."], ["Presta", "las prendas que no usas, con tus reglas."], ["En mano", "en París, o envío a toda Francia."]],
    cta: "Confirmar mi e-mail", ignore: "¿No te has apuntado? Ignora este e-mail.",
    foot: "Recibes este e-mail porque te apuntaste a la lista de espera de Rota.",
    unsub: "Darse de baja"
  }
};
type Lang = keyof typeof COPY;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function renderEmail(lang: Lang, opts: { logoUrl: string; confirmUrl: string; unsubUrl: string }) {
  const c = COPY[lang];
  const F = "Helvetica, Arial, sans-serif";
  const S = "Georgia, 'Times New Roman', serif";
  const rows = c.next.map(([b, t], i) => `
            <tr>
              <td width="36" valign="top" style="padding:${i ? 14 : 0}px 0 0 0;font-family:${S};font-style:italic;font-size:18px;line-height:24px;mso-line-height-rule:exactly;color:#A060B0;">0${i + 1}</td>
              <td valign="top" style="padding:${i ? 14 : 0}px 0 0 0;font-family:${F};font-size:16px;line-height:24px;mso-line-height-rule:exactly;color:#4A3A52;"><strong style="color:#2A1033;">${b}</strong> ${t}</td>
            </tr>`).join("");
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${c.subject}</title>
<style>
  @media (max-width: 620px) { .px { padding-left: 24px !important; padding-right: 24px !important; } .h1 { font-size: 34px !important; line-height: 38px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EFE6F2;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#EFE6F2;">${c.pre}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EFE6F2" style="background-color:#EFE6F2;">
  <tr>
    <td align="center" style="padding:40px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td align="center" style="padding:0 0 24px 0;">
            <img src="${esc(opts.logoUrl)}" width="72" height="72" alt="Rota" style="display:block;width:72px;height:72px;border:0;border-radius:36px;">
          </td>
        </tr>
        <tr>
          <td bgcolor="#FBF8FC" style="background-color:#FBF8FC;border-radius:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="px" style="padding:48px 48px 8px 48px;font-family:${F};font-size:12px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7A6A86;">Rota · Paris</td>
              </tr>
              <tr>
                <td class="px h1" style="padding:8px 48px 0 48px;font-family:${F};font-size:40px;line-height:44px;mso-line-height-rule:exactly;font-weight:bold;letter-spacing:-1px;color:#2A1033;">${c.h1}</td>
              </tr>
              <tr>
                <td class="px" style="padding:20px 48px 0 48px;font-family:${F};font-size:17px;line-height:26px;mso-line-height-rule:exactly;color:#4A3A52;">${c.p}</td>
              </tr>
              <tr>
                <td class="px" style="padding:32px 48px 0 48px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#E2A8F1" style="background-color:#E2A8F1;border-radius:999px;mso-padding-alt:16px 32px;">
                        <a href="${esc(opts.confirmUrl)}" style="display:block;padding:16px 32px;font-family:${F};font-size:16px;line-height:20px;font-weight:bold;color:#2A1033;text-decoration:none;border-radius:999px;">${c.cta}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="px" style="padding:16px 48px 0 48px;font-family:${F};font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#7A6A86;">${c.ignore}</td>
              </tr>
              <tr>
                <td class="px" style="padding:36px 48px 0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:#E6DAEA;">&nbsp;</td></tr></table>
                </td>
              </tr>
              <tr>
                <td class="px" style="padding:32px 48px 12px 48px;font-family:${F};font-size:12px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7A6A86;">${c.nextTitle}</td>
              </tr>
              <tr>
                <td class="px" style="padding:4px 48px 0 48px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
                  </table>
                </td>
              </tr>
              <tr>
                <td class="px" style="padding:40px 48px 48px 48px;font-family:${S};font-style:italic;font-size:26px;line-height:30px;mso-line-height-rule:exactly;color:#A060B0;">Wear it once. Pass it on.</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:28px 24px 0 24px;font-family:${F};font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:#7A6A86;">
            ${c.foot}<br>
            Rota · Paris, France<br>
            <a href="${esc(opts.unsubUrl)}" style="color:#7A6A86;text-decoration:underline;">${c.unsub}</a>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
  });

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("method", { status: 405 });
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id ?? body?.record?.id);
    if (!Number.isSafeInteger(id) || id <= 0) return new Response("no id", { status: 400 });

    // Claim the row: one e-mail per sign-up, only in the hour after it.
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const claimed = await rest(
      `waitlist?id=eq.${id}&welcome_sent_at=is.null&confirmed=is.false&created_at=gt.${encodeURIComponent(since)}&select=email,lang,token`,
      { method: "PATCH", body: JSON.stringify({ welcome_sent_at: new Date().toISOString() }) },
    );
    const rows = claimed.ok ? ((await claimed.json()) as { email: string; lang: string | null; token: string }[]) : [];
    const row = rows[0];
    if (!row) return new Response("nothing to send", { status: 200 });

    const lang: Lang = row.lang === "en" || row.lang === "es" ? row.lang : "fr";
    const from = Deno.env.get("FROM_EMAIL") ?? "Rota <onboarding@resend.dev>";
    const confirmUrl = `${SUPABASE_URL}/functions/v1/super-task?token=${encodeURIComponent(row.token)}`;
    const html = renderEmail(lang, {
      logoUrl: Deno.env.get("LOGO_URL") ?? "",
      confirmUrl,
      unsubUrl: "mailto:" + (from.match(/<(.+)>/)?.[1] ?? from) + "?subject=Unsubscribe",
    });
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + Deno.env.get("RESEND_API_KEY"),
        "Content-Type": "application/json",
        "Idempotency-Key": `waitlist-${id}`,
      },
      body: JSON.stringify({ from, to: row.email, subject: COPY[lang].subject, html }),
    });
    if (!r.ok) {
      // Let a later retry from the trigger try again.
      await rest(`waitlist?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ welcome_sent_at: null }) });
    }
    return new Response(await r.text(), { status: r.status });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
