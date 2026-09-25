// Known child-abuse material is detected by matching image hashes against
// databases kept by NCMEC and similar bodies. No language model can stand in
// for that, and those databases are only reachable through vetted vendors
// (Thorn Safer, Microsoft PhotoDNA, Cloudflare's CSAM scanning tool), each
// of which grants API access after an application.
//
// This is where that vendor plugs in. Until CSAM_HASH_PROVIDER is set the
// check reports "not_configured" and the analyzer records it on every case.
// With policy moderation_require_hash_check = true, nothing is analysed or
// published until a provider answers.

export type HashResult =
  | { status: 'not_configured' }
  | { status: 'clear' }
  | { status: 'match'; detail: unknown }
  | { status: 'error'; message: string };

export async function hashCheck(_imageUrls: string[]): Promise<HashResult> {
  const provider = Deno.env.get('CSAM_HASH_PROVIDER');
  if (!provider) return { status: 'not_configured' };
  // The vendor's adapter goes here once access is granted: send each URL (or
  // its bytes), return 'match' with the vendor's reference on any hit.
  return { status: 'error', message: `no adapter written yet for provider "${provider}"` };
}
