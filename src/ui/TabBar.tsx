import { useStore } from '../state/store';
import type { Screen } from '../state/types';
import { TabAddIcon, TabClosetIcon, TabDiscoverIcon, TabFeedIcon, TabMessagesIcon } from './icons';
import { fs } from './styles';
import { Tappable } from './widgets';

type TabKey = 'feed' | 'discover' | 'list' | 'messages' | 'closet';

const TABS: { key: TabKey; label: string; Icon: (p: { color: string }) => JSX.Element }[] = [
  { key: 'feed', label: 'Feed', Icon: TabFeedIcon },
  { key: 'discover', label: 'Explorer', Icon: TabDiscoverIcon },
  { key: 'list', label: 'Louez', Icon: TabAddIcon },
  { key: 'messages', label: 'Messages', Icon: TabMessagesIcon },
  { key: 'closet', label: 'Dressing', Icon: TabClosetIcon },
];

/** Screens that keep a given tab lit while you are deeper in its stack. */
const TAB_GROUPS: Record<string, Screen[]> = {
  discover: ['discover', 'search', 'boards', 'board'],
  closet: [
    'closet',
    'profile',
    'settings',
    'payouts',
    'blocked',
    'fees',
    'rentals',
    'claim',
    'reviews',
    'safety',
    'wallet',
    'payments',
    'identity',
    'certification',
    'security',
    'referral',
    'promote',
    'preferences',
    'bundles',
    'vacation',
    'help',
  ],
  messages: ['messages'],
};

export function TabBar() {
  const { state, go, config } = useStore();

  return (
    <nav
      style={{
        flex: '0 0 auto',
        background: 'var(--sink)',
        borderTop: '1px solid var(--line)',
        padding: '8px 6px 30px',
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      {TABS.map(({ key, label, Icon }) => {
        const active = state.screen === key || (TAB_GROUPS[key] ?? []).includes(state.screen);
        const color = active ? 'var(--clay)' : 'var(--ink3)';
        return (
          <Tappable
            key={key}
            onClick={() => go(key)}
            label={label}
            style={{
              flex: 1,
              minHeight: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '4px 0',
            }}
          >
            <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon color={color} />
              {key === 'messages' ? (
                <span style={{ position: 'absolute', top: -1, right: -2, width: 8, height: 8, borderRadius: 99, background: 'var(--plum)' }} />
              ) : null}
            </div>
            {config.showTabLabels ? (
              <div style={{ fontSize: fs(10), fontWeight: 600, color }}>{label}</div>
            ) : null}
          </Tappable>
        );
      })}
    </nav>
  );
}
