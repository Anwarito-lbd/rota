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
