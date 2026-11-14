import React from 'react';
import { SkinId } from '../game/skins';

interface SpiderMaskIconProps {
  skinId: SkinId;
  size?: number;
  className?: string;
}

export const SpiderMaskIcon: React.FC<SpiderMaskIconProps> = ({
  skinId,
  size = 48,
  className = '',
}) => {
  // Mask silhouette path (tapered comic/MCU Spider-Man head)
  const maskPath = 'M50 10 C72 10 82 26 82 48 C82 70 67 90 50 92 C33 90 18 70 18 48 C18 26 28 10 50 10 Z';

  if (skinId === '2002') {
    // 2002 Homemade Ski Mask: crimson knit with dashed seam & goggle eye slits
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path d={maskPath} fill="#D91E2A" stroke="#7F1D1D" strokeWidth="2.5" />
        {/* Knit mask horizontal & crown dashed seams */}
        <path
          d="M22 44 Q50 40 78 44"
          stroke="#7F1D1D"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        <path
          d="M24 58 Q50 55 76 58"
          stroke="#7F1D1D"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        <path
          d="M50 12 L50 38"
          stroke="#7F1D1D"
          strokeWidth="1.8"
          strokeDasharray="3 3"
        />
        {/* Cutout eye slits */}
        <ellipse cx="36" cy="51" rx="9" ry="4.8" fill="#F3D1BD" stroke="#991B1B" strokeWidth="2" />
        <ellipse cx="64" cy="51" rx="9" ry="4.8" fill="#F3D1BD" stroke="#991B1B" strokeWidth="2" />
      </svg>
    );
  }

  const palette =
    skinId === '2004'
      ? {
          base: '#B91C1C',
          rim: '#E2E8F0',
          web: '#CBD5E1',
          eyeFill: '#F8FAFC',
          eyeStroke: '#94A3B8',
          eyeGlow: false,
        }
      : skinId === '2007'
        ? {
            base: '#14171E',
            rim: '#334155',
            web: '#475569',
            eyeFill: '#F8FAFC',
            eyeStroke: '#64748B',
            eyeGlow: false,
          }
        : skinId === '2016'
          ? {
              base: '#DC2626',
              rim: '#18181B',
              web: '#18181B',
              eyeFill: '#FFFFFF',
              eyeStroke: '#09090B',
              eyeGlow: false,
            }
          : {
              // 2018-2019 Iron Spider
              base: '#991B1B',
              rim: '#FACC15',
              web: '#F59E0B',
              eyeFill: '#38BDF8',
              eyeStroke: '#FACC15',
              eyeGlow: true,
            };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`mask-clip-${skinId}`}>
          <path d={maskPath} />
        </clipPath>
      </defs>

      {/* Mask Base */}
      <path d={maskPath} fill={palette.base} />

      {/* Radial + Concentric Webbing / Armor Seams clipped inside mask */}
      <g clipPath={`url(#mask-clip-${skinId})`} stroke={palette.web} strokeWidth={skinId === '2018-2019' ? 2.4 : 1.8}>
        {/* Radial lines from nose bridge (50, 52) */}
        <line x1="50" y1="52" x2="50" y2="8" />
        <line x1="50" y1="52" x2="26" y2="12" />
        <line x1="50" y1="52" x2="74" y2="12" />
        <line x1="50" y1="52" x2="14" y2="34" />
        <line x1="50" y1="52" x2="86" y2="34" />
        <line x1="50" y1="52" x2="16" y2="66" />
        <line x1="50" y1="52" x2="84" y2="66" />
        <line x1="50" y1="52" x2="32" y2="92" />
        <line x1="50" y1="52" x2="68" y2="92" />
        <line x1="50" y1="52" x2="50" y2="94" />

        {/* Concentric curved web rings */}
        <ellipse cx="50" cy="52" rx="14" ry="15" />
        <ellipse cx="50" cy="52" rx="25" ry="27" />
        <ellipse cx="50" cy="52" rx="37" ry="40" />
      </g>

      {/* Outer Mask Rim */}
      <path d={maskPath} stroke={palette.rim} strokeWidth={skinId === '2018-2019' ? 3.5 : 2.2} />

      {/* Left & Right Spider Lenses */}
      <path
        d="M24 41 C31 41 42 46 45 55 C38 60 28 59 25 51 C23 46 23 43 24 41 Z"
        fill={palette.eyeFill}
        stroke={palette.eyeStroke}
        strokeWidth={skinId === '2016' ? 3.2 : 2.4}
        strokeLinejoin="round"
      />
      <path
        d="M76 41 C69 41 58 46 55 55 C62 60 72 59 75 51 C77 46 77 43 76 41 Z"
        fill={palette.eyeFill}
        stroke={palette.eyeStroke}
        strokeWidth={skinId === '2016' ? 3.2 : 2.4}
        strokeLinejoin="round"
      />

      {palette.eyeGlow && (
        <>
          <path d="M27 44 C32 44 39 48 42 54 C37 56 30 55 27 50 Z" fill="#BAE6FD" opacity="0.7" />
          <path d="M73 44 C68 44 61 48 58 54 C63 56 70 55 73 50 Z" fill="#BAE6FD" opacity="0.7" />
        </>
      )}
    </svg>
  );
};
