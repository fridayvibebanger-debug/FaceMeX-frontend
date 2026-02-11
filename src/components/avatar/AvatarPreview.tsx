import React from 'react';

type Customization = {
  skinTone?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  outfit?: string;
};

export interface AvatarPreviewProps {
  customization?: Customization;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'excited';
  size?: number; // px
  className?: string;
}

function shade(hex: string, factor: number) {
  try {
    const v = hex.replace('#', '');
    const r = Math.max(0, Math.min(255, Math.round(parseInt(v.substring(0, 2), 16) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(parseInt(v.substring(2, 4), 16) * factor)));
    const b = Math.max(0, Math.min(255, Math.round(parseInt(v.substring(4, 6), 16) * factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch { return hex; }
}

function renderHair(style: string | undefined, hair: string, s: number, r: number) {
  const t = style?.toLowerCase() || 'short';
  const dark = shade(hair, 0.7);
  const light = shade(hair, 1.2);
  const gradId = `hairGrad`; // simple id; minor risk of collision is acceptable here
  switch (t) {
    case 'long':
      return (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>
          </defs>
          {/* base volume */}
          <path d={`M 2 ${s*0.32} Q ${r} ${s*0.02}, ${s-2} ${s*0.32} L ${s-2} ${s-2} L 2 ${s-2} Z`} fill={`url(#${gradId})`} opacity={0.98} />
          {/* subtle strands */}
          <path d={`M ${s*0.18} ${s*0.34} C ${s*0.22} ${s*0.6}, ${s*0.2} ${s*0.8}, ${s*0.18} ${s*0.98}`} stroke={light} strokeOpacity={0.25} strokeWidth={1.2} fill="none" />
          <path d={`M ${s*0.82} ${s*0.34} C ${s*0.78} ${s*0.6}, ${s*0.8} ${s*0.82}, ${s*0.82} ${s*0.98}`} stroke={light} strokeOpacity={0.22} strokeWidth={1.2} fill="none" />
        </>
      );
    case 'bun':
      return (
        <>
          <defs>
            <radialGradient id={gradId} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
          </defs>
          <circle cx={r} cy={s*0.18} r={s*0.12} fill={`url(#${gradId})`} />
          <path d={`M 2 ${s*0.38} Q ${r} ${s*0.12}, ${s-2} ${s*0.38} L ${s-2} ${s*0.62} L 2 ${s*0.62} Z`} fill={hair} opacity={0.96} />
          <path d={`M ${r-s*0.16} ${s*0.4} Q ${r} ${s*0.28}, ${r+s*0.16} ${s*0.4}`} stroke={light} strokeOpacity={0.3} strokeWidth={1.2} fill="none" />
        </>
      );
    case 'afro':
      return (
        <>
          <defs>
            <radialGradient id={gradId} cx="50%" cy="35%" r="70%">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
          </defs>
          <circle cx={r} cy={s*0.25} r={s*0.2} fill={`url(#${gradId})`} />
          <circle cx={r-s*0.18} cy={s*0.28} r={s*0.14} fill={dark} />
          <circle cx={r+s*0.18} cy={s*0.28} r={s*0.14} fill={dark} />
          {/* sheen */}
          <ellipse cx={r-s*0.06} cy={s*0.2} rx={s*0.06} ry={s*0.02} fill={light} opacity={0.25} />
        </>
      );
    default:
      return (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={dark} />
            </linearGradient>
          </defs>
          <path d={`M 2 ${r} Q ${r} ${r*0.1}, ${s-2} ${r} L ${s-2} ${s-2} L 2 ${s-2} Z`} fill={`url(#${gradId})`} opacity={0.95} />
          {/* fringe highlights */}
          <path d={`M ${s*0.25} ${r*0.72} Q ${r} ${r*0.5}, ${s*0.75} ${r*0.72}`} stroke={light} strokeOpacity={0.25} strokeWidth={1.2} fill="none" />
        </>
      );
  }
}

function outfitColor(outfit?: string) {
  switch ((outfit || 'casual').toLowerCase()) {
    case 'formal': return '#222';
    case 'sporty': return '#198754';
    case 'creative': return '#7c3aed';
    default: return '#0ea5e9'; // casual
  }
}

// Very lightweight visual avatar using simple layered SVG
export default function AvatarPreview({ customization, emotion = 'neutral', size = 48, className }: AvatarPreviewProps) {
  const skin = customization?.skinTone || '#f5d5c5';
  const hair = customization?.hairColor || '#4a3728';
  const eye = customization?.eyeColor || '#4a90e2';
  const style = customization?.hairStyle || 'short';
  const outfit = customization?.outfit || 'casual';
  const s = size;
  const r = s / 2;
  const eyeOffsetX = s * 0.18;
  const eyeY = s * 0.42;

  // mouth simple path by emotion
  let mouthPath = '';
  switch (emotion) {
    case 'happy': mouthPath = `M ${s*0.35} ${s*0.65} Q ${s*0.5} ${s*0.78}, ${s*0.65} ${s*0.65}`; break;
    case 'sad': mouthPath = `M ${s*0.35} ${s*0.7} Q ${s*0.5} ${s*0.58}, ${s*0.65} ${s*0.7}`; break;
    case 'angry': mouthPath = `M ${s*0.35} ${s*0.65} L ${s*0.65} ${s*0.65}`; break;
    case 'surprised': mouthPath = ''; break; // draw circle below
    case 'excited': mouthPath = `M ${s*0.33} ${s*0.62} Q ${s*0.5} ${s*0.85}, ${s*0.67} ${s*0.62}`; break;
    default: mouthPath = `M ${s*0.4} ${s*0.65} L ${s*0.6} ${s*0.65}`; break;
  }

  const outfitFill = outfitColor(outfit);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
      {/* outfit shape behind head */}
      <path d={`M 0 ${s} Q ${r} ${s*0.72}, ${s} ${s} L ${s} ${s} Z`} fill={outfitFill} opacity={0.18} />
      {/* face circle */}
      <circle cx={r} cy={r} r={r-2} fill={skin} stroke="#00000010" />
      {/* hair (varies by style) */}
      {renderHair(style, hair, s, r)}
      {/* eyes */}
      <circle cx={r-eyeOffsetX} cy={eyeY} r={s*0.05} fill={eye} />
      <circle cx={r+eyeOffsetX} cy={eyeY} r={s*0.05} fill={eye} />
      {/* mouth */}
      {mouthPath && <path d={mouthPath} stroke="#333" strokeWidth={2} fill="none" strokeLinecap="round" />}
      {emotion === 'surprised' && (
        <circle cx={r} cy={s*0.67} r={s*0.045} fill="#333" />
      )}
      {/* neckline indicates outfit */}
      <path d={`M ${s*0.18} ${s*0.88} Q ${r} ${s*0.78}, ${s*0.82} ${s*0.88}`} fill={outfitFill} opacity={0.7} />
    </svg>
  );
}
