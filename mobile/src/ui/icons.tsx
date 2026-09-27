import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
}

export const AppleIcon = ({ size = 16, color = '#2A1033' }: IconProps) => (
  <Svg width={size} height={size * 1.2} viewBox="0 0 15 18">
    <Path
      fill={color}
      d="M12.3 9.6c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.5-2.9-1.6-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 2C.9 9.4 1.9 13 3.2 15c.6 1 1.4 2.1 2.4 2 .9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.7-1 2.4-2 .5-.8.7-1.2 1-2-2.4-.9-2.5-3.3-2.5-3.4zM9.9 3.4c.5-.6.9-1.5.8-2.4-.8 0-1.8.5-2.3 1.2-.5.6-.9 1.5-.8 2.3.9.1 1.8-.5 2.3-1.1z"
    />
  </Svg>
);

export const HeartIcon = ({ size = 28, fill = 'none', color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 20.5s-7.5-4.7-7.5-9.8a4.3 4.3 0 0 1 7.5-2.8 4.3 4.3 0 0 1 7.5 2.8c0 5.1-7.5 9.8-7.5 9.8z"
      fill={fill}
      stroke={color}
      strokeWidth={1.6}
    />
  </Svg>
);

export const BookmarkIcon = ({ size = 26, fill = 'none', color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 3.5h12v17l-6-4.3-6 4.3z" fill={fill} stroke={color} strokeWidth={1.6} />
  </Svg>
);

export const StarIcon = ({ size = 25, fill = '#F7F2F8', color = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"
      fill={fill}
      stroke={color}
      strokeWidth={1.6}
    />
  </Svg>
);

export const DotsIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

export const SearchIcon = ({ size = 16, color = '#978CA0' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M16.5 16.5 21 21" stroke={color} strokeWidth={2} />
  </Svg>
);

export const FilterIcon = ({ size = 18, color = '#2A1033' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 6h18M6 12h12M10 18h4" stroke={color} strokeWidth={2} fill="none" />
  </Svg>
);

export const BellIcon = ({ size = 18, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M10.5 19a2 2 0 0 0 3 0" stroke={color} strokeWidth={1.8} fill="none" />
  </Svg>
);

export const BagIcon = ({ size = 30, color = '#978CA0' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8h16l-1.2 12H5.2z" stroke={color} strokeWidth={1.6} fill="none" />
    <Path d="M9 8V6a3 3 0 0 1 6 0v2" stroke={color} strokeWidth={1.6} fill="none" />
  </Svg>
);

export const PersonPlusIcon = ({ size = 32, color = 'rgba(247,242,248,0.5)' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="9" cy="8" r="3.4" stroke={color} strokeWidth={1.6} fill="none" />
    <Path d="M3 20c0-3.3 2.7-5.2 6-5.2s6 1.9 6 5.2" stroke={color} strokeWidth={1.6} fill="none" />
    <Path d="M17.5 8.5h4M19.5 6.5v4" stroke={color} strokeWidth={1.6} fill="none" />
  </Svg>
);

export const ChevronDown = ({ size = 12, color = '#E2A9F1' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.4} fill="none" />
  </Svg>
);

export const TabFeedIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M10 8.5l6 3.5-6 3.5z" fill={color} />
  </Svg>
);

export const TabDiscoverIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="7.5" height="11" rx="2.2" stroke={color} strokeWidth={1.8} fill="none" />
    <Rect x="13.5" y="3" width="7.5" height="7" rx="2.2" stroke={color} strokeWidth={1.8} fill="none" />
    <Rect x="3" y="17" width="7.5" height="4" rx="1.8" stroke={color} strokeWidth={1.8} fill="none" />
    <Rect x="13.5" y="13" width="7.5" height="8" rx="2.2" stroke={color} strokeWidth={1.8} fill="none" />
  </Svg>
);

export const TabAddIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24">
    <Rect x="2.5" y="4.5" width="19" height="15" rx="4" stroke={color} strokeWidth={1.9} fill="none" />
    <Path d="M12 9v6M9 12h6" stroke={color} strokeWidth={1.9} />
  </Svg>
);

export const TabMessagesIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 20l1.4-4.1A7.5 7.5 0 1 1 21 11.5z"
      stroke={color}
      strokeWidth={1.8}
      fill="none"
    />
  </Svg>
);

export const TabClosetIcon = ({ color }: { color: string }) => (
  <Svg width={23} height={23} viewBox="0 0 24 24">
    <Path d="M12 7.5 4 12v8h16v-8z" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M12 7.5V5.8a2 2 0 1 1 2-2" stroke={color} strokeWidth={1.8} fill="none" />
  </Svg>
);

// ── Social layer ──

export const CommentIcon = ({ size = 28, color = '#F7F2F8', fill = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20.5 11.6a8 8 0 0 1-11.7 7.1L4 20l1.3-4.3A8 8 0 1 1 20.5 11.6z"
      fill={fill}
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShareIcon = ({ size = 26, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3.5v11M7.5 8 12 3.5 16.5 8" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" />
  </Svg>
);

export const SparkleIcon = ({ size = 26, color = '#F7F2F8', fill = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 3.2 13.9 9l5.9 1.9-5.9 1.9L12 18.6l-1.9-5.8-5.9-1.9L10.1 9z"
      fill={fill}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <Path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill={color} />
  </Svg>
);

export const PinIcon = ({ size = 18, color = '#F7F2F8', fill = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" fill={fill} stroke={color} strokeWidth={1.7} />
    <Circle cx="12" cy="9.8" r="2.3" stroke={color} strokeWidth={1.7} fill="none" />
  </Svg>
);

export const MapIcon = ({ size = 18, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
    <Path d="M9 4.5v13M15 6.5v13" stroke={color} strokeWidth={1.7} />
  </Svg>
);

export const PlusIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CloseIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const CameraIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="3.4" stroke={color} strokeWidth={1.7} fill="none" />
  </Svg>
);

export const ImagesIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3.5" y="5" width="14" height="14" rx="2.5" stroke={color} strokeWidth={1.7} fill="none" />
    <Path d="M20.5 8v10a2.5 2.5 0 0 1-2.5 2.5H8" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" />
    <Path d="m5 16 3.5-3.5 3 3 2-2 3.5 3.5" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const ShieldCheckIcon = ({ size = 16, color = '#E2A9F1', fill = 'none' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3 5 5.8v5.4c0 4.3 2.9 8 7 9.8 4.1-1.8 7-5.5 7-9.8V5.8z" fill={fill} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="m8.8 12.2 2.2 2.2 4.3-4.6" stroke={fill === 'none' ? color : '#2A1033'} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const TagIcon = ({ size = 16, color = '#2A1033' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3.5 12.3V4.8a1.3 1.3 0 0 1 1.3-1.3h7.5l8.2 8.2a1.3 1.3 0 0 1 0 1.8l-7.5 7.5a1.3 1.3 0 0 1-1.8 0z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Circle cx="8.3" cy="8.3" r="1.6" fill={color} />
  </Svg>
);

export const SendIcon = ({ size = 20, color = '#2A1033' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 12 20 4l-4.5 16-3.8-6.2z" fill={color} />
  </Svg>
);

export const GridIcon = ({ size = 18, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="4" width="6.5" height="9" rx="1.8" stroke={color} strokeWidth={1.7} fill="none" />
    <Rect x="13.5" y="4" width="6.5" height="6" rx="1.8" stroke={color} strokeWidth={1.7} fill="none" />
    <Rect x="4" y="16" width="6.5" height="4" rx="1.5" stroke={color} strokeWidth={1.7} fill="none" />
    <Rect x="13.5" y="13" width="6.5" height="7" rx="1.8" stroke={color} strokeWidth={1.7} fill="none" />
  </Svg>
);

export const LocateIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 4 4 10.5l6.5 2.6L13 20z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const ChevronLeft = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M15 5 8 12l7 7" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevronRight = ({ size = 16, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m9 5 7 7-7 7" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon = ({ size = 18, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ArrowUpRightIcon = ({ size = 16, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7 17 17 7M9 7h8v8" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const PencilIcon = ({ size = 18, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const MinusIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/** Top-level category marks (Women, Men, Kids) — line drawings, no emoji. */
export const DressIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M9 3v3.5L7.5 10 5 21h14l-2.5-11L15 6.5V3M9 3c1 1 5 1 6 0M7.5 10h9"
      stroke={color}
      strokeWidth={1.7}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShirtIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M8.5 3 3 6l2 4.5 2.5-1V21h9V9.5l2.5 1L21 6l-5.5-3c-.5 1.6-1.9 2.6-3.5 2.6S9 4.6 8.5 3Z"
      stroke={color}
      strokeWidth={1.7}
      fill="none"
      strokeLinejoin="round"
    />
  </Svg>
);

export const KidsIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="6.5" r="3" stroke={color} strokeWidth={1.7} fill="none" />
    <Path d="M6.5 21v-5.5a5.5 5.5 0 0 1 11 0V21M9.5 21v-3.5M14.5 21v-3.5" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" />
  </Svg>
);

export const CalendarIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="5.5" width="16" height="14.5" rx="3" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const GearIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} fill="none" />
    <Path
      d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export const FlipIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    <Path d="M20 4v4.7h-4.7M4 20v-4.7h4.7" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MenuIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 7h16M4 12h16M4 17h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const WalletIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3.5" y="6" width="17" height="13" rx="3" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M16 12.5h4.5M6 6l9-2.5 1 2.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const HelpIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.2" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

export const BookIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5ZM5 16a3.5 3.5 0 0 1 3.5-3.5H19" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const ReceiptIcon = ({ size = 20, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5v-17ZM9 8h6M9 12h6M9 16h3" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
);

export const ShoeIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 17.5V12l3-1 2 2.5c2.5.3 4.2-.4 5.5-2l6 3.3a2 2 0 0 1 1 1.7v2H3ZM3 17.5h18" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const WatchIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={1.7} fill="none" />
    <Path d="M9 7.5 9.7 3h4.6l.7 4.5M9 16.5l.7 4.5h4.6l.7-4.5M12 10v2.2l1.3 1" stroke={color} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const RingIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="14.5" r="6" stroke={color} strokeWidth={1.7} fill="none" />
    <Path d="m9.5 6 2.5-3 2.5 3-2.5 2.5L9.5 6Z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const HandbagIcon = ({ size = 22, color = '#F7F2F8' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 9h14l-1.2 11H6.2L5 9ZM9 9V7a3 3 0 0 1 6 0v2" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);
