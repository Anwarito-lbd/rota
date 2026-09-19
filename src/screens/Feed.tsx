import { pieces } from '../data/catalog';
import { useStore } from '../state/store';
import type { FeedTab } from '../state/types';
import { ImageSlot } from '../ui/ImageSlot';
import { BookmarkIcon, DotsIcon, HeartIcon, PersonPlusIcon, StarIcon } from '../ui/icons';
import { OVER_INK, SANS, SERIF, fs } from '../ui/styles';
import { Tappable } from '../ui/widgets';

const TABS: [FeedTab, string][] = [
  ['near', 'Près de moi'],
  ['foryou', 'Pour vous'],
  ['follow', 'Suivis'],
];

function RailAction({
  onClick,
  label,
  caption,
  children,
}: {
  onClick: () => void;
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <Tappable
      onClick={onClick}
      label={label}
      style={{
        minWidth: 44,
        minHeight: 44,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      {children}
      {caption ? <div style={{ fontSize: fs(12), fontWeight: 600, color: OVER_INK }}>{caption}</div> : null}
    </Tappable>
  );
}

export function Feed() {
  const { state, set, config, toggleFlag, m } = useStore();

  const source =
    state.feedTab === 'follow'
      ? pieces.filter((p) => state.follow && p.id === 'f3')
      : state.feedTab === 'near'
        ? pieces.filter((p) => p.city.startsWith('Paris'))
        : pieces;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          background: 'var(--sink)',
        }}
      >
        {source.map((item) => {
          const liked = !!state.liked[item.id];
          const wished = !!state.wish[item.id];
          return (
            <div key={item.id} style={{ position: 'relative', height: '100%', scrollSnapAlign: 'start', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <ImageSlot
                  id={`feed-${item.id}`}
                  shape="rect"
                  tone="media"
                  /* The clip uploaded in the listing flow plays on its own card. */
                  fallbackId={item.id === 'f1' ? 'list-video' : undefined}
                  placeholder="Vidéo du look"
                />
              </div>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(12,10,11,0.62) 0%, rgba(12,10,11,0) 26%, rgba(12,10,11,0) 44%, rgba(12,10,11,0.92) 92%)',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 210,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Tappable
                  onClick={() => set({ screen: 'profile', activeId: item.id })}
                  label={`Profil de ${item.name}`}
                  style={{ width: 52, height: 52, borderRadius: 999, padding: 2, boxSizing: 'border-box', background: '#E8865F' }}
                >
                  <div style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', border: '2px solid #0C0A0B', boxSizing: 'border-box' }}>
                    <ImageSlot id={`av-${item.id}`} shape="circle" tone="media" />
                  </div>
                </Tappable>

                <RailAction onClick={() => toggleFlag('liked', item.id)} label="J'aime" caption={item.likes}>
                  <HeartIcon fill={liked ? '#E8865F' : 'none'} color={liked ? '#E8865F' : OVER_INK} />
                </RailAction>

                <RailAction
                  onClick={() => set({ screen: 'detail', activeId: item.id })}
                  label="Voir les avis"
                  caption={item.rating}
                >
                  <StarIcon />
                </RailAction>

                <RailAction onClick={() => toggleFlag('wish', item.id)} label="Enregistrer" caption="Save">
                  <BookmarkIcon fill={wished ? OVER_INK : 'none'} />
                </RailAction>

                <RailAction onClick={() => set({ report: true, reportSent: false, activeId: item.id })} label="Signaler">
                  <DotsIcon />
                </RailAction>
              </div>

              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 16px 24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  <div
                    style={{
                      fontSize: fs(11),
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '5px 9px',
                      borderRadius: 7,
                      background: '#E8865F',
                      color: '#1B1009',
                    }}
                  >
                    {item.occasion}
                  </div>
                  <div
                    style={{
                      fontSize: fs(11),
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '5px 9px',
                      borderRadius: 7,
                      border: '1px solid rgba(246,241,233,0.55)',
                      color: OVER_INK,
                    }}
                  >
                    {item.badge}
                  </div>
                </div>
                <Tappable
                  onClick={() => set({ screen: 'profile', activeId: item.id })}
                  style={{ marginTop: 12, fontSize: fs(15), fontWeight: 600, color: OVER_INK }}
                >
                  @{item.handle} <span style={{ color: 'rgba(246,241,233,0.68)', fontWeight: 400 }}>· {item.wornCount}</span>
                </Tappable>
                <div style={{ marginTop: 5, fontFamily: SERIF, fontSize: 33, lineHeight: 1.05, color: OVER_INK }}>
                  {item.title}
                </div>
                <div style={{ marginTop: 5, fontSize: fs(14), color: 'rgba(246,241,233,0.75)' }}>
                  {item.brand} · taille {item.size} · {item.city}
                </div>
                <button
                  type="button"
                  onClick={() => set({ screen: 'detail', activeId: item.id })}
                  style={{
                    cursor: 'pointer',
                    marginTop: 14,
                    width: '100%',
                    fontFamily: SANS,
                    fontSize: fs(16),
                    fontWeight: 700,
                    minHeight: 52,
                    border: 'none',
                    borderRadius: 14,
                    background: '#E8865F',
                    color: '#1B1009',
                  }}
                >
                  Louer · {m(item.price)} / jour
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {source.length === 0 ? <EmptyFeed /> : null}

      <div style={{ position: 'absolute', top: 48, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
        {TABS.map(([key, label]) => {
          const on = state.feedTab === key;
          return (
            <Tappable
              key={key}
              onClick={() => set({ feedTab: key })}
              style={{
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                fontSize: fs(15),
                fontWeight: on ? 700 : 600,
                color: on ? OVER_INK : 'rgba(246,241,233,0.62)',
                boxShadow: `inset 0 -2px 0 0 ${on ? '#E8865F' : 'transparent'}`,
                textShadow: '0 1px 6px rgba(12,10,11,0.6)',
              }}
            >
              {label}
            </Tappable>
          );
        })}
      </div>

      {config.demoEmptyStates ? (
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 16,
            right: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(12,10,11,0.9)',
            border: '1px solid rgba(246,241,233,0.2)',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 99, background: '#D79BB4', flex: '0 0 8px' }} />
          <div style={{ flex: 1, fontSize: fs(13), lineHeight: 1.4, color: OVER_INK }}>
            No connection. Showing your last loaded looks.
          </div>
          <button
            type="button"
            onClick={() => set({ feedTab: 'foryou' })}
            style={{
              cursor: 'pointer',
              minHeight: 36,
              padding: '0 12px',
              fontFamily: SANS,
              fontSize: fs(13),
              fontWeight: 700,
              borderRadius: 10,
              border: 'none',
              background: '#F6F1E9',
              color: '#14100E',
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
    </>
  );
}

function EmptyFeed() {
  const { state, set, go } = useStore();
  const follow = state.feedTab === 'follow';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0C0A0B',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 30px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          border: '1px solid rgba(246,241,233,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PersonPlusIcon />
      </div>
      <div style={{ marginTop: 20, fontFamily: SERIF, fontSize: 30, lineHeight: 1.08, color: OVER_INK }}>
        {follow ? 'Rien à charger ici' : 'Aucune pièce près de vous'}
      </div>
      <div style={{ marginTop: 10, fontSize: fs(14), lineHeight: 1.55, color: '#B9B0A6', maxWidth: '30ch' }}>
        {follow
          ? 'Vous ne suivez encore personne. Suivez des dressings et leurs nouvelles pièces apparaîtront dans cet onglet.'
          : 'Aucune pièce disponible dans votre rayon pour le moment. Élargissez la zone ou explorez la livraison.'}
      </div>
      <button
        type="button"
        onClick={() => go('discover')}
        style={{
          cursor: 'pointer',
          marginTop: 22,
          minHeight: 50,
          padding: '0 22px',
          fontFamily: SANS,
          fontSize: fs(15),
          fontWeight: 700,
          border: 'none',
          borderRadius: 14,
          background: '#E8865F',
          color: '#1B1009',
        }}
      >
        {follow ? 'Découvrir des dressings' : 'Explorer la livraison'}
      </button>
      <button
        type="button"
        onClick={() => set({ feedTab: 'foryou' })}
        style={{
          cursor: 'pointer',
          marginTop: 10,
          minHeight: 44,
          padding: '0 18px',
          fontFamily: SANS,
          fontSize: fs(14),
          fontWeight: 600,
          border: '1px solid rgba(246,241,233,0.3)',
          borderRadius: 12,
          background: 'none',
          color: OVER_INK,
        }}
      >
        Revenir à « Pour vous »
      </button>
    </div>
  );
}
