// Rota — checks a boutique's SIRET against the public French company
// register (recherche-entreprises.api.gouv.fr, free, no key) (migration 028).
//
// POST (signed in, after register_business) → { verified, legalName }
//
// Verified when the SIRET is an establishment of a company that is active
// (état administratif « A ») and the establishment itself is open. The
// profile then shows "Boutique vérifiée". Nothing the phone sends decides it.

import { admin, json, userFrom } from '../_shared/clients.ts';

interface Establishment {
  siret?: string;
  etat_administratif?: string;
  adresse?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { data: details } = await admin.from('business_details').select('siret, status').eq('user_id', user.id).maybeSingle();
  if (!details) return json({ error: 'not_registered' }, 404);
  if (details.status === 'verified') return json({ verified: true });

  let company: { nom_complet?: string; etat_administratif?: string; siege?: Establishment; matching_etablissements?: Establishment[] } | null = null;
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${details.siret}&per_page=1`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    // The register is down or rate-limiting: stay pending, the app can retry.
    if (!res.ok) return json({ verified: false, pending: true });
    company = (await res.json())?.results?.[0] ?? null;
  } catch {
    return json({ verified: false, pending: true });
  }

  const places = [...(company?.matching_etablissements ?? []), ...(company?.siege ? [company.siege] : [])];
  const place = places.find((e) => e.siret === details.siret);
  const ok = !!company && company.etat_administratif === 'A' && !!place && place.etat_administratif === 'A';
  const legalName = company?.nom_complet ?? null;

  const { error } = await admin.rpc('set_business_verification', {
    p_user: user.id,
    p_ok: ok,
    p_legal_name: legalName,
    p_address: place?.adresse ?? null,
  });
  if (error) return json({ error: 'failed' }, 500);
  return json({ verified: ok, legalName: ok ? legalName : null });
});
