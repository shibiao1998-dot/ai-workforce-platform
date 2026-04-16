interface AiAvatarProps {
  employeeId: string;
  team: string;
  avatar: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  fill?: boolean;
  className?: string;
}

const SIZE_MAP = { sm: 40, md: 56, lg: 80, xl: 120 } as const;

const PALETTES: Record<string, { bg: string; accent: string; light: string }> = {
  management: { bg: "#7c3aed", accent: "#a78bfa", light: "#ede9fe" },
  design:     { bg: "#2563eb", accent: "#60a5fa", light: "#dbeafe" },
  production: { bg: "#16a34a", accent: "#4ade80", light: "#dcfce7" },
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function RobotSvg({ employeeId, team, size }: { employeeId: string; team: string; size: number }) {
  const palette = PALETTES[team] ?? PALETTES.production;
  const px = size;
  const h = hash(employeeId);
  const cx = px / 2;
  const headCY = px * 0.52;
  const headR = px * 0.34;
  const eyeY = headCY - headR * 0.1;
  const eyeSpacing = headR * 0.35;
  const mouthY = headCY + headR * 0.35;
  const lx = cx - eyeSpacing;
  const rx = cx + eyeSpacing;

  const antennaVariant = h % 3;
  const antennaBase = headCY - headR;
  const Antenna = () => {
    if (antennaVariant === 0) {
      return (
        <>
          <line x1={cx} y1={antennaBase} x2={cx} y2={antennaBase - px * 0.12} stroke={palette.bg} strokeWidth={2} />
          <circle cx={cx} cy={antennaBase - px * 0.14} r={px * 0.04} fill={palette.accent} />
        </>
      );
    }
    if (antennaVariant === 1) {
      return (
        <>
          <line x1={lx} y1={antennaBase} x2={lx - px * 0.04} y2={antennaBase - px * 0.1} stroke={palette.bg} strokeWidth={2} />
          <circle cx={lx - px * 0.05} cy={antennaBase - px * 0.12} r={px * 0.03} fill={palette.accent} />
          <line x1={rx} y1={antennaBase} x2={rx + px * 0.04} y2={antennaBase - px * 0.1} stroke={palette.bg} strokeWidth={2} />
          <circle cx={rx + px * 0.05} cy={antennaBase - px * 0.12} r={px * 0.03} fill={palette.accent} />
        </>
      );
    }
    return (
      <path
        d={`M ${lx} ${antennaBase} Q ${cx} ${antennaBase - px * 0.18} ${rx} ${antennaBase}`}
        fill="none"
        stroke={palette.accent}
        strokeWidth={2}
      />
    );
  };

  const headVariant = (h >> 2) % 3;
  const Head = () => {
    if (headVariant === 0) return <circle cx={cx} cy={headCY} r={headR} fill={palette.bg} />;
    if (headVariant === 1) return <rect x={cx - headR} y={headCY - headR} width={headR * 2} height={headR * 2} rx={headR * 0.3} fill={palette.bg} />;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 90);
      return `${cx + headR * Math.cos(angle)},${headCY + headR * Math.sin(angle)}`;
    }).join(" ");
    return <polygon points={pts} fill={palette.bg} />;
  };

  const eyeVariant = (h >> 4) % 4;
  const er = headR * 0.18;
  const Eyes = () => {
    if (eyeVariant === 0) {
      return (
        <>
          <circle cx={lx} cy={eyeY} r={er} fill="white" />
          <circle cx={lx} cy={eyeY} r={er * 0.5} fill="#1e293b" />
          <circle cx={rx} cy={eyeY} r={er} fill="white" />
          <circle cx={rx} cy={eyeY} r={er * 0.5} fill="#1e293b" />
        </>
      );
    }
    if (eyeVariant === 1) {
      return (
        <>
          <rect x={lx - er} y={eyeY - er} width={er * 2} height={er * 2} fill="white" />
          <rect x={rx - er} y={eyeY - er} width={er * 2} height={er * 2} fill="white" />
        </>
      );
    }
    if (eyeVariant === 2) {
      return (
        <>
          <circle cx={lx} cy={eyeY} r={er * 0.4} fill="white" />
          <circle cx={rx} cy={eyeY} r={er * 0.4} fill="white" />
        </>
      );
    }
    const visorW = eyeSpacing * 2 + er * 2;
    return (
      <>
        <rect x={cx - visorW / 2} y={eyeY - er} width={visorW} height={er * 2} rx={er * 0.6} fill={palette.light} />
        <circle cx={lx} cy={eyeY} r={er * 0.4} fill="#1e293b" />
        <circle cx={rx} cy={eyeY} r={er * 0.4} fill="#1e293b" />
      </>
    );
  };

  const mouthVariant = (h >> 6) % 3;
  const mw = headR * 0.5;
  const Mouth = () => {
    if (mouthVariant === 0) {
      return (
        <path d={`M ${cx - mw} ${mouthY} Q ${cx} ${mouthY + mw * 0.6} ${cx + mw} ${mouthY}`} fill="none" stroke={palette.light} strokeWidth={2} strokeLinecap="round" />
      );
    }
    if (mouthVariant === 1) {
      return <line x1={cx - mw} y1={mouthY} x2={cx + mw} y2={mouthY} stroke={palette.light} strokeWidth={2} strokeLinecap="round" />;
    }
    const step = mw / 2;
    return (
      <polyline
        points={`${cx - mw},${mouthY} ${cx - step},${mouthY - mw * 0.3} ${cx},${mouthY} ${cx + step},${mouthY - mw * 0.3} ${cx + mw},${mouthY}`}
        fill="none" stroke={palette.light} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    );
  };

  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-label={`${team} robot`}>
      <Antenna />
      <Head />
      <Eyes />
      <Mouth />
    </svg>
  );
}

export function AiAvatar({ employeeId, team, avatar, name, size = "md", fill, className }: AiAvatarProps) {
  const px = SIZE_MAP[size];
  const palette = PALETTES[team] ?? PALETTES.production;

  // Fill mode — image fills container, or SVG centered in container
  if (fill) {
    if (avatar) {
      return (
        <img
          src={avatar}
          alt={name}
          className={className}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
      );
    }
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: palette.light,
        }}
      >
        <RobotSvg employeeId={employeeId} team={team} size={120} />
      </div>
    );
  }

  // Fixed-size mode (existing behavior)
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        width={px}
        height={px}
        className={className}
        style={{
          width: px,
          height: px,
          borderRadius: Math.round(px * 0.2),
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
      style={{ borderRadius: Math.round(px * 0.2), background: palette.light, display: "block" }}
      aria-label={name}
    >
      <RobotSvg employeeId={employeeId} team={team} size={px} />
    </svg>
  );
}
