import { useRef, type CSSProperties } from 'react';
import { useStore } from '../state/store';

type Shape = 'rect' | 'rounded' | 'circle';

interface Props {
  /** Stable key: also the storage key for anything the user uploads here. */
  id: string;
  shape?: Shape;
  radius?: number;
  placeholder?: string;
  /**
   * 'media' keeps the tile dark in both themes. Use it for full-bleed slots
   * whose overlaid text is always light ink (feed cards, onboarding hero).
   */
  tone?: 'auto' | 'media';
  /** Show this slot's media when the primary one is still empty. */
  fallbackId?: string;
  /** Allow the user to pick a file for this slot. */
  editable?: boolean;
  /** Accept videos as well as photos (feed clips, listing videos). */
  video?: boolean;
  style?: CSSProperties;
}

/**
 * Placeholder tints are built from the theme's own surface token so the tiles
 * read as empty frames in both light and dark, with a per-slot hue shift.
 */
const TINTS = [
  'linear-gradient(145deg, color-mix(in srgb, var(--clay) 12%, var(--surf2)) 0%, var(--surf2) 100%)',
  'linear-gradient(145deg, color-mix(in srgb, var(--plum) 12%, var(--surf2)) 0%, var(--surf2) 100%)',
  'linear-gradient(145deg, color-mix(in srgb, var(--ink) 7%, var(--surf2)) 0%, var(--surf2) 100%)',
  'linear-gradient(145deg, color-mix(in srgb, var(--clay) 6%, var(--surf2)) 0%, var(--surf2) 100%)',
];

const MEDIA_TINTS = [
  'linear-gradient(145deg, #3a2f2b 0%, #241d1b 100%)',
  'linear-gradient(145deg, #33292f 0%, #201a1e 100%)',
  'linear-gradient(145deg, #2e3230 0%, #1d201f 100%)',
  'linear-gradient(145deg, #3b332a 0%, #241f1a 100%)',
];

function tintFor(id: string, tone: 'auto' | 'media') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const set = tone === 'media' ? MEDIA_TINTS : TINTS;
  return set[h % set.length];
}

/**
 * A photo/video slot. Empty slots show a themed placeholder; editable ones open
 * the device picker and keep whatever the user chose for the rest of the session.
 */
export function ImageSlot({
  id,
  shape = 'rounded',
  radius = 12,
  placeholder,
  tone = 'auto',
  fallbackId,
  editable = false,
  video = false,
  style,
}: Props) {
  const { state, setMedia } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const item = state.media[id] ?? (fallbackId ? state.media[fallbackId] : undefined);

  const borderRadius = shape === 'circle' ? '50%' : shape === 'rect' ? 0 : radius;
  const chrome = tone === 'media' ? 'rgba(246,241,233,0.28)' : 'var(--line2)';
  const caption = tone === 'media' ? 'rgba(246,241,233,0.55)' : 'var(--ink3)';

  const pick = (file: File | undefined) => {
    if (!file) return;
    setMedia(id, {
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
    });
  };

  return (
    <div
      onClick={editable ? () => input.current?.click() : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius,
        overflow: 'hidden',
        background: item ? 'var(--surf2)' : tintFor(id, tone),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: editable ? 'pointer' : undefined,
        ...style,
      }}
    >
      {item ? (
        item.kind === 'video' ? (
          <video
            src={item.url}
            muted
            loop
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <img
            src={item.url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )
      ) : (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              border: `1.5px dashed ${chrome}`,
              borderRadius,
              pointerEvents: 'none',
            }}
          />
          {placeholder ? (
            <div style={{ padding: '0 10px', textAlign: 'center', fontSize: 11, lineHeight: 1.3, color: caption }}>
              {placeholder}
              {editable ? <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--clay)' }}>Ajouter</div> : null}
            </div>
          ) : null}
        </>
      )}

      {editable ? (
        <>
          {item ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMedia(id, null);
              }}
              aria-label="Retirer le média"
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(12,10,11,0.75)',
                color: '#F6F1E9',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          ) : null}
          <input
            ref={input}
            type="file"
            accept={video ? 'image/*,video/*' : 'image/*'}
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </>
      ) : null}
    </div>
  );
}
