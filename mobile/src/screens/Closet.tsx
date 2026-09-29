import { useState } from 'react';
import { useSocial } from '../data/social';
import { ProfileView } from '../ui/ProfileView';
import { SideMenu } from '../ui/SideMenu';

/**
 * Dressing = your profile, Instagram-style (ui/ProfileView): counts,
 * highlights, and your fits and pieces. Everything else lives in the ☰
 * side menu and in Réglages.
 */
export function Closet() {
  const social = useSocial();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <ProfileView memberId={social.meId} onMenu={() => setMenu(true)} />
      <SideMenu visible={menu} onClose={() => setMenu(false)} />
    </>
  );
}
