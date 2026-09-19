import { FEES, SIZES, itemReviews, ratingBars } from '../data/catalog';
import { OFFER_TIERS, useBooking } from '../state/selectors';
import { useStore } from '../state/store';
import { ImageSlot } from '../ui/ImageSlot';
import { BookmarkIcon, DotsIcon } from '../ui/icons';
import { OVER_SCRIM, SANS, SERIF, amount, fs, pickerColors, primaryButton, screen } from '../ui/styles';
import { Sheet, Tappable } from '../ui/widgets';

export function Detail() {
  const { state, set, go, config, m, toggleFlag } = useStore();
  const { active, nights, nego } = useBooking();
  const wished = !!state.wish[active.id];

  const trust = [
    {
      title: `Dommages couverts jusqu'à ${m(FEES.coverCap)}`,
      body: 'Inclus dans chaque location. À signaler dans les 24 h après le retour.',
    },
    active.cleaning.byLender
      ? {
          title: `Nettoyage par la prêteuse · ${m(active.cleaning.fee)}`,
          body: 'Elle ne souhaite pas que la pièce soit lavée : le nettoyage est fait par ses soins et facturé une fois.',
        }
      : {
          title: 'Nettoyage à votre charge',
          body: 'Aucun frais de nettoyage : vous rendez la pièce propre, en suivant les règles de la prêteuse.',
        },
    {
      title:
        active.authenticity === 'receipt'
          ? 'Authenticité vérifiée · facture'
          : active.authenticity === 'tag'
            ? 'Authenticité vérifiée · étiquette'
            : 'Authenticité non vérifiée',
      body:
        active.authenticity === null
          ? "La prêteuse n'a pas encore fourni de preuve d'achat. Demandez-la avant de réserver."
          : 'Notre équipe a contrôlé la preuve fournie par la prêteuse : facture, étiquette et numéro de série.',
    },
    {
      title: config.instantBook ? 'Réservation immédiate' : 'Demande de réservation',
      body: config.instantBook
        ? 'Les locataires vérifiés confirment tout de suite.'
        : 'La prêteuse répond en 12 h en moyenne.',
    },
    {
      title: 'Livraison ou main propre',
      body: 'Les deux sont proposées. Vous choisissez au moment des dates, la prêteuse confirme — il faut un accord des deux côtés.',
    },
    {
      title: 'Avis réciproques après la location',
      body: "Vous notez la prêteuse, elle vous note. Publiés après 14 jours, comme sur une location de logement.",
    },
  ];

  return (
    <>
      <div style={{ ...screen, padding: 0 }}>
        <div style={{ position: 'relative', height: 430, background: 'var(--surf2)' }}>
          <ImageSlot id={`detail-${active.id}`} shape="rect" placeholder={active.title} />
          <div style={{ position: 'absolute', top: 54, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <button
              type="button"
              aria-label="Retour au feed"
              onClick={() => go('feed')}
              style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: 'none', background: OVER_SCRIM, color: '#F6F1E9', fontSize: 18 }}
            >
              ‹
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                aria-pressed={wished}
                aria-label="Enregistrer la pièce"
                onClick={() => toggleFlag('wish', active.id)}
                style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: 'none', background: OVER_SCRIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <BookmarkIcon size={17} fill={wished ? 'var(--clay)' : 'none'} color={wished ? 'var(--clay)' : '#F6F1E9'} />
              </button>
              <button
                type="button"
                aria-label="Signaler"
                onClick={() => set({ report: true, reportSent: false })}
                style={{ cursor: 'pointer', width: 44, height: 44, borderRadius: 999, border: 'none', background: OVER_SCRIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <DotsIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 18px 150px' }}>
          <div style={{ fontSize: fs(11), fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--clay)' }}>
            {active.occasion} · {active.badge}
          </div>
          <h1 style={{ margin: '8px 0 0', fontFamily: SERIF, fontSize: 36, lineHeight: 1.04, fontWeight: 400 }}>{active.title}</h1>
          <div style={{ marginTop: 6, fontSize: fs(15), color: 'var(--ink2)' }}>
            {active.brand} · valeur neuve {m(active.retail)}
          </div>

          <div
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 12px',
              borderRadius: 999,
              background: nego.nego ? 'var(--claySoft)' : 'transparent',
              border: `1px solid ${nego.nego ? 'var(--clay)' : 'var(--line2)'}`,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: 99, background: nego.nego ? 'var(--clay)' : 'var(--ink3)' }} />
            <div style={{ fontSize: fs(13), fontWeight: 700, color: nego.nego ? 'var(--clay)' : 'var(--ink2)' }}>
              {nego.nego ? `Propositions acceptées · min ${m(nego.min)} / jour` : 'Prix fixe · pas de négociation'}
            </div>
          </div>

          <Tappable
            onClick={() => go('profile')}
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              background: 'var(--surf)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ width: 48, height: 48, flex: '0 0 48px', borderRadius: 999, padding: 2, boxSizing: 'border-box', background: 'var(--clay)' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden' }}>
                <ImageSlot id={`lender-${active.id}`} shape="circle" />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fs(15), fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {active.name}
                {active.certified || state.certifies[active.handle] ? (
                  <span
                    title="Compte certifié"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: 'var(--clay)',
                      color: 'var(--onclay)',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✓
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: fs(13), color: 'var(--ink2)' }}>
                {active.rating} ★ · 68 locations · identité vérifiée
              </div>
            </div>
            <div style={{ fontSize: 19, color: 'var(--ink3)' }}>›</div>
          </Tappable>

          <Tappable
            onClick={() => go('profile')}
            style={{ marginTop: 10, padding: 12, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: fs(14), fontWeight: 700 }}>Compléter depuis ce dressing</div>
              <div style={{ fontSize: fs(12), fontWeight: 700, color: 'var(--clay)', flex: '0 0 auto' }}>−15%</div>
            </div>
            <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ height: 72, borderRadius: 9, overflow: 'hidden' }}>
                  <ImageSlot id={`bundle-${n}`} shape="rounded" radius={9} />
                </div>
              ))}
              <div
                style={{
                  height: 72,
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surf2)',
                  fontSize: fs(13),
                  fontWeight: 700,
                  color: 'var(--ink3)',
                }}
              >
                +37
              </div>
            </div>
            <div style={{ marginTop: 9, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>
              Deux pièces ou plus sur les mêmes dates : une seule livraison.
            </div>
          </Tappable>

          <div style={{ marginTop: 24, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Taille et tombé
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            {SIZES.map((label) => {
              const c = pickerColors(state.size === label);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={state.size === label}
                  onClick={() => set({ size: label })}
                  style={{
                    cursor: 'pointer',
                    flex: 1,
                    minHeight: 48,
                    fontFamily: SANS,
                    fontSize: fs(15),
                    fontWeight: 600,
                    borderRadius: 12,
                    border: `1px solid ${c.borderColor}`,
                    background: c.background,
                    color: c.color,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: fs(13), color: 'var(--ink2)' }}>
              <span>Taille petit</span>
              <span>Taille juste</span>
              <span>Taille grand</span>
            </div>
            <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: 'var(--surf2)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '41%', top: -7, width: 18, height: 18, borderRadius: 99, background: 'var(--clay)', transform: 'translateX(-50%)' }} />
            </div>
            <div style={{ marginTop: 12, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)' }}>
              {active.name.split(' ')[0]} mesure 1,70 m et porte du {active.size}. Poitrine 86 cm · taille 68 cm ·
              longueur 142 cm. Stretch minimal.
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Portée par des locataires
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ height: 120, borderRadius: 12, overflow: 'hidden' }}>
                <ImageSlot id={`fit-${n}`} shape="rounded" radius={12} placeholder="Photo portée" />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: 'grid', gap: 8 }}>
            {trust.map((t) => (
              <div
                key={t.title}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '13px 14px',
                  borderRadius: 12,
                  background: 'var(--surf)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ width: 8, height: 8, flex: '0 0 8px', marginTop: 6, borderRadius: 99, background: 'var(--clay)' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: fs(14), fontWeight: 700 }}>{t.title}</div>
                  <div style={{ marginTop: 3, fontSize: fs(13), lineHeight: 1.45, color: 'var(--ink2)' }}>{t.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Règles de la prêteuse
          </div>
          <div style={{ marginTop: 10, padding: 15, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gap: 9 }}>
              {active.rules.map((rule) => (
                <div key={rule} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, flex: '0 0 6px', marginTop: 7, borderRadius: 99, background: 'var(--plum)' }} />
                  <div style={{ fontSize: fs(14), lineHeight: 1.45, color: 'var(--ink)' }}>{rule}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
              Vous les acceptez au moment de la réservation. Une règle non respectée peut donner lieu à un signalement et
              à une retenue sur la caution.
            </div>
          </div>

          <Tappable
            onClick={() => go('fees')}
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 14,
              borderRadius: 14,
              background: 'var(--claySoft)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink)' }}>
              {active.cleaning.byLender ? `Nettoyage ${m(active.cleaning.fee)}` : 'Nettoyage à votre charge'} · protection{' '}
              {m(FEES.coverCap)} · livraison {m(FEES.shipping)} · caution {m(FEES.deposit)}. Tout est affiché avant
              paiement.
            </div>
            <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700, color: 'var(--clay)' }}>Détails ›</div>
          </Tappable>

          <div style={{ marginTop: 24, fontSize: fs(12), letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink3)' }}>
            Avis après location
          </div>
          <div style={{ marginTop: 10, padding: 16, borderRadius: 16, background: 'var(--surf)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ ...amount(36), color: 'var(--clay)' }}>4,9</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: fs(14), fontWeight: 700 }}>★★★★★</div>
                <div style={{ marginTop: 3, fontSize: fs(13), color: 'var(--ink2)' }}>24 avis de locataires vérifiés</div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
              {ratingBars.map((c) => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: '0 0 42%', fontSize: fs(13), color: 'var(--ink2)' }}>{c.label}</div>
                  <div style={{ flex: 1, minWidth: 0, height: 5, borderRadius: 99, background: 'var(--surf2)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: c.w, borderRadius: 99, background: 'var(--clay)' }} />
                  </div>
                  <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 700 }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {itemReviews.map((r) => (
              <div key={r.slot} style={{ padding: 14, borderRadius: 14, background: 'var(--surf)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, flex: '0 0 34px', borderRadius: 999, overflow: 'hidden' }}>
                    <ImageSlot id={`irv-${r.slot}`} shape="circle" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: fs(14), fontWeight: 700 }}>{r.name}</div>
                    <div style={{ marginTop: 2, fontSize: fs(12), color: 'var(--ink3)' }}>{r.meta}</div>
                  </div>
                  <div style={{ flex: '0 0 auto', fontSize: fs(13), color: 'var(--clay)' }}>{r.stars}</div>
                </div>
                <div style={{ marginTop: 9, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)' }}>{r.body}</div>
                <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {r.tags.map((t) => (
                    <div key={t} style={{ fontSize: fs(11), fontWeight: 600, padding: '6px 10px', borderRadius: 999, background: 'var(--surf2)', color: 'var(--ink2)' }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go('reviews')}
            style={{
              cursor: 'pointer',
              marginTop: 10,
              width: '100%',
              minHeight: 48,
              fontFamily: SANS,
              fontSize: fs(14),
              fontWeight: 700,
              border: '1px solid var(--line2)',
              borderRadius: 14,
              background: 'none',
              color: 'var(--ink)',
            }}
          >
            Voir les 24 avis
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 18px 26px',
          background: 'linear-gradient(180deg, rgba(18,16,17,0) 0%, var(--bg) 42%)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: '0 0 auto' }}>
          <div style={amount(24)}>{m(active.price)}</div>
          <div style={{ fontSize: fs(12), color: 'var(--ink3)' }}>par jour</div>
        </div>
        {nego.nego ? (
          <button
            type="button"
            onClick={() => set({ offer: true })}
            style={{
              cursor: 'pointer',
              flex: '0 0 auto',
              minHeight: 54,
              padding: '0 16px',
              fontFamily: SANS,
              fontSize: fs(15),
              fontWeight: 700,
              border: '1px solid var(--clay)',
              borderRadius: 16,
              background: 'var(--claySoft)',
              color: 'var(--clay)',
            }}
          >
            Proposer
          </button>
        ) : null}
        <button type="button" onClick={() => go('booking')} style={{ ...primaryButton, flex: 1, minWidth: 0 }}>
          {config.instantBook ? 'Voir les dates' : 'Demander ces dates'}
        </button>
      </div>

      {state.offer ? <OfferSheet nights={nights} /> : null}
    </>
  );
}

function OfferSheet({ nights }: { nights: number }) {
  const { state, set, m } = useStore();
  const { active, nego } = useBooking();
  const perDay = Math.round(active.price * OFFER_TIERS[state.offerIdx]);
  const offerTotal = perDay * nights;

  return (
    <Sheet onClose={() => set({ offer: false })}>
      <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1 }}>Faire une proposition</div>
      <div style={{ marginTop: 8, fontSize: fs(14), lineHeight: 1.5, color: 'var(--ink2)', maxWidth: '34ch' }}>
        {active.name} a 12 h pour accepter. Elle demande {m(active.price)} / jour pour {nights} jours.
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        {OFFER_TIERS.map((pct, i) => {
          const c = pickerColors(state.offerIdx === i);
          return (
            <button
              key={pct}
              type="button"
              aria-pressed={state.offerIdx === i}
              onClick={() => set({ offerIdx: i })}
              style={{
                cursor: 'pointer',
                flex: 1,
                minWidth: 0,
                padding: '12px 6px',
                fontFamily: SANS,
                borderRadius: 14,
                border: `1px solid ${c.borderColor}`,
                background: c.background,
                color: c.color,
              }}
            >
              <div style={{ fontSize: fs(17), fontWeight: 700 }}>{m(Math.round(active.price * pct))}</div>
              <div style={{ marginTop: 3, fontSize: fs(11) }}>{Math.round((1 - pct) * 100)}% / jour</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--surf2)', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: fs(13), color: 'var(--ink2)' }}>
          <span>Minimum accepté par {active.name}</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{m(nego.min)} / jour</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: fs(13), color: 'var(--ink2)' }}>
          <span>Pièces similaires à Paris</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
            {m(Math.round(active.price * 0.75))}–{m(Math.round(active.price * 1.15))} / jour
          </span>
        </div>
        <div style={{ fontSize: fs(13), lineHeight: 1.5, color: 'var(--ink3)' }}>
          Les propositions sur 3 jours ou plus sont acceptées dans environ 70% des cas. Nettoyage et protection restent
          inclus.
        </div>
      </div>

      <button
        type="button"
        onClick={() => set({ offer: false, screen: 'messages', thread: 't1', offerStatus: 'pending' })}
        style={{ ...primaryButton, marginTop: 18, background: 'var(--plum)', color: 'var(--onplum)' }}
      >
        Envoyer · {m(offerTotal)}
      </button>
    </Sheet>
  );
}
