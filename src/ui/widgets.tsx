import type { CSSProperties, ReactNode } from 'react';
import { SANS, SERIF, backButton, fs, pickerColors } from './styles';

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(6,5,5,0.62)', zIndex: 70 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          background: 'var(--surf)',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid var(--line)',
          padding: '18px 20px 30px',
          maxHeight: '86%',
          overflowY: 'auto',
          animation: 'rotaUp .2s ease',
        }}
      >
        <div
          aria-hidden
          style={{ width: 44, height: 4, borderRadius: 99, background: 'var(--line2)', margin: '0 auto 16px' }}
        />
        {children}
      </div>
    </>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        cursor: 'pointer',
        width: 50,
        height: 30,
        flex: '0 0 50px',
        borderRadius: 99,
        border: 'none',
        padding: 0,
        background: on ? 'var(--clay)' : 'var(--surf2)',
        position: 'relative',
        transition: 'background .15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: 99,
          background: 'var(--sink)',
          transition: 'left .15s ease',
        }}
      />
    </button>
  );
}

export function Chip({
  label,
  on,
  onClick,
  tone = 'clay',
  style,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  tone?: 'clay' | 'plum' | 'ink';
  style?: CSSProperties;
}) {
  const c = pickerColors(on, tone);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        flex: '0 0 auto',
        fontFamily: SANS,
        fontSize: fs(13),
        fontWeight: 600,
        minHeight: 38,
        padding: '0 14px',
        borderRadius: 999,
        border: `1px solid ${c.borderColor}`,
        background: c.background,
        color: c.color,
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function Header({
  title,
  onBack,
  right,
  size = 34,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  size?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {onBack ? (
        <button type="button" aria-label="Retour" onClick={onBack} style={backButton}>
          ‹
        </button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: size, lineHeight: 1.05 }}>{title}</div>
      {right}
    </div>
  );
}

export function Steps({ current, count = 3 }: { current: number; count?: number }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 5 }} aria-label={`Étape ${current + 1} sur ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 99,
            background: i <= current ? 'var(--clay)' : 'var(--surf2)',
          }}
        />
      ))}
    </div>
  );
}

export function ListRow({
  label,
  detail,
  detailColor = 'var(--ink3)',
  onClick,
  last = false,
}: {
  label: string;
  detail?: string;
  detailColor?: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        cursor: interactive ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        padding: '0 15px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, fontSize: fs(15) }}>{label}</div>
      {detail ? (
        <div style={{ flex: '0 0 auto', fontSize: fs(13), fontWeight: 600, color: detailColor }}>{detail}</div>
      ) : null}
      {interactive ? <div style={{ flex: '0 0 auto', fontSize: 16, color: 'var(--ink3)' }}>›</div> : null}
    </div>
  );
}

/** A tappable non-button surface with the keyboard affordances a button has. */
export function Tappable({
  onClick,
  children,
  style,
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: 'pointer', ...style }}
    >
      {children}
    </div>
  );
}

export function Note({ children, tone = 'surf2' }: { children: ReactNode; tone?: 'surf2' | 'clay' }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: tone === 'clay' ? 'var(--claySoft)' : 'var(--surf2)',
        border: tone === 'clay' ? '1px solid var(--line)' : undefined,
        fontSize: fs(13),
        lineHeight: 1.55,
        color: 'var(--ink2)',
      }}
    >
      {children}
    </div>
  );
}
