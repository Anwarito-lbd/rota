/**
 * The member sheet behind `…` on a profile, a post or a story: mute their
 * posts or stories, restrict, block, report. Light on purpose: one line per
 * choice, and nothing here is told to the other member.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, View, findNodeHandle } from 'react-native';
import { setMute, setRestrict, useMutes, useRestricts, type MiniMember } from '../data/privacy';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { ActionError, useAction } from '../screens/PrivacyPages';
import { useTheme } from '../theme/useTheme';
import { Sheet, Toggle, Txt } from './kit';

function ToggleRow({ label, a11y, body, on, busy, onPress }: { label: string; a11y: string; body?: string; on: boolean; busy: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingVertical: 10, opacity: busy ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <Txt size={16} weight="semi">
          {label}
        </Txt>
        {body ? (
          <Txt size={13} color={c.ink3} style={{ marginTop: 3 }}>
            {body}
          </Txt>
        ) : null}
      </View>
      <Toggle on={on} label={a11y} onPress={onPress} disabled={busy} />
    </View>
  );
}

/** The choices themselves, for a sheet of their own or inside another one. */
export function MemberMenuBody({
  member,
  onDone,
  onReport,
  focusHeader,
}: {
  member: MiniMember;
  onDone: () => void;
  onReport: () => void;
  /** Shown in place of other content: move the screen reader to the member's name. */
  focusHeader?: boolean;
}) {
  const { t } = useT();
  const { c } = useTheme();
  const social = useSocial();
  const [mutes, , , mutesLoading] = useMutes();
  const [restricts, , , restrictsLoading] = useRestricts();
  const { error, run, isPending } = useAction();
  const mute = mutes.find((m) => m.id === member.id);
  const restricted = restricts.some((r) => r.id === member.id);
  // Both mute switches write one row: one change at a time, from fresh values.
  const muteBusy = mutesLoading || isPending('mute');
  const header = useRef<View>(null);
  useEffect(() => {
    if (!focusHeader) return;
    // After the swap has rendered, so the node exists.
    const timer = setTimeout(() => {
      const node = header.current ? findNodeHandle(header.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
    return () => clearTimeout(timer);
  }, [focusHeader]);
  const line = <View style={{ height: 1, backgroundColor: c.line, marginVertical: 6 }} />;
  const action = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Txt size={16} weight="semi" color={c.plum}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View>
      <View ref={header} accessible accessibilityRole="header" accessibilityLabel={member.username}>
        <Txt size={17} weight="bold" numberOfLines={1}>
          {member.username}
        </Txt>
      </View>
      <Txt size={13} weight="bold" color={c.ink3} style={{ marginTop: 14 }}>
        {t('menu.mute')}
      </Txt>
      <ToggleRow
        label={t('menu.mutePosts')}
        a11y={`${t('menu.mute')} : ${t('menu.mutePosts')}`}
        on={!!mute?.posts}
        busy={muteBusy}
        onPress={() => run(() => setMute(member, !mute?.posts, !!mute?.stories), 'mute')}
      />
      <ToggleRow
        label={t('menu.muteStories')}
        a11y={`${t('menu.mute')} : ${t('menu.muteStories')}`}
        on={!!mute?.stories}
        busy={muteBusy}
        onPress={() => run(() => setMute(member, !!mute?.posts, !mute?.stories), 'mute')}
      />
      {line}
      <ToggleRow
        label={t('menu.restrict')}
        a11y={t('menu.restrict')}
        body={t('menu.restrictBody')}
        on={restricted}
        busy={restrictsLoading || isPending('restrict')}
        onPress={() => run(() => setRestrict(member, !restricted), 'restrict')}
      />
      <ActionError message={error} />
      {line}
      {social.isBlocked(member.id)
        ? null
        : action(t('profile.block'), () => run(() => social.block(member.id).then(onDone), 'block'))}
      {action(t('post.report'), () => {
        onDone();
        onReport();
      })}
    </View>
  );
}

export function MemberMenu({ member, visible, onClose, onReport }: { member: MiniMember | null; visible: boolean; onClose: () => void; onReport: () => void }) {
  return (
    <Sheet visible={visible && !!member} onClose={onClose}>
      {/* Mounted only while open: the lists load when the sheet shows. */}
      {visible && member ? <MemberMenuBody member={member} onDone={onClose} onReport={onReport} /> : null}
    </Sheet>
  );
}
