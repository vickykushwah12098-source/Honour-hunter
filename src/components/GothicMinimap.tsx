import React, { useId, useMemo } from 'react';
import {
  FOG_GRID_CELL_SIZE,
  getFogCellCenter,
  getMinimapSightRadius,
  isMarkerVisibleOnMinimap,
  MINIMAP_VIEW_RADIUS,
  VILLAGE_ROAD_SEGMENTS,
} from '../game/rules';
import { HudSnapshot, MinimapMarker } from '../game/types';

interface GothicMinimapProps {
  hud: HudSnapshot;
}

const VIEW_R = MINIMAP_VIEW_RADIUS; // 44m radius around player

export const GothicMinimap: React.FC<GothicMinimapProps> = ({ hud }) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `minimap-clip-${uid}`;
  const fogMaskId = `minimap-fog-${uid}`;
  const sightGradId = `minimap-sight-grad-${uid}`;
  const exploredGradId = `minimap-explored-grad-${uid}`;
  const bezelGradId = `minimap-bezel-grad-${uid}`;

  const px = hud.playerPos.x;
  const pz = hud.playerPos.z;
  const sightRadius = getMinimapSightRadius(hud.environment.visibilityRange);

  const exploredSet = useMemo(() => new Set(hud.exploredCells), [hud.exploredCells]);

  // Filter markers using Fog-of-War & Sight rules
  const visibleMarkers = useMemo(
    () =>
      hud.markers.filter((m) =>
        isMarkerVisibleOnMinimap(m, px, pz, sightRadius, exploredSet),
      ),
    [hud.markers, px, pz, sightRadius, exploredSet],
  );

  // Explored fog cells relative to player within view radius
  const exploredDisks = useMemo(() => {
    const list: Array<{ key: number; rx: number; rz: number }> = [];
    for (const idx of hud.exploredCells) {
      const c = getFogCellCenter(idx);
      const rx = c.x - px;
      const rz = c.z - pz;
      if (Math.hypot(rx, rz) <= VIEW_R + FOG_GRID_CELL_SIZE * 1.4) {
        list.push({ key: idx, rx, rz });
      }
    }
    return list;
  }, [hud.exploredCells, px, pz]);

  // Objective position relative to player
  let objRelX = 0;
  let objRelZ = 0;
  let objDist = 0;
  let objOutOfRange = false;
  let objEdgeAngle = 0;
  if (hud.objectivePos) {
    objRelX = hud.objectivePos.x - px;
    objRelZ = hud.objectivePos.z - pz;
    objDist = Math.hypot(objRelX, objRelZ);
    objOutOfRange = objDist > VIEW_R - 4;
    objEdgeAngle = Math.atan2(objRelZ, objRelX);
  }

  // Player heading in SVG coords: engine yaw=PI faces North (-Z => 0 deg up), yaw=0 faces South (+Z => 180 deg)
  const headingDeg = (-hud.playerPos.yaw * 180) / Math.PI + 180;

  const renderMarkerGlyph = (m: MinimapMarker) => {
    const rx = m.x - px;
    const rz = m.z - pz;
    const inLiveSight = Math.hypot(rx, rz) <= sightRadius;
    const opacity = inLiveSight ? 1 : 0.72;

    if (m.kind === 'landmark') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <rect
            x="-3.6"
            y="-4.6"
            width="7.2"
            height="9.2"
            rx="1"
            fill="#283c4c"
            stroke="#7d9ab0"
            strokeWidth="0.9"
          />
          <path d="M0 -2.4v4.8M-1.8 -0.6h3.6" stroke="#b9cad6" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    }

    if (m.kind === 'shelter') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <polygon
            points="0,-4.4 4.2,-0.6 3.2,-0.6 3.2,4.0 -3.2,4.0 -3.2,-0.6 -4.2,-0.6"
            fill="#5e3d24"
            stroke="#e0b265"
            strokeWidth="0.9"
          />
          <rect x="-1.0" y="0.8" width="2.0" height="3.2" fill="#ffd98e" />
        </g>
      );
    }

    if (m.kind === 'station') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <rect
            x="-3.1"
            y="-3.1"
            width="6.2"
            height="6.2"
            rx="1"
            fill="#8a561e"
            stroke="#f0c167"
            strokeWidth="1"
          />
          <path d="M-1.5 0.4h3M-0.8 -1.2h1.6" stroke="#fff0cc" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    }

    if (m.kind === 'brazier') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <polygon
            points="0,-4.4 3.4,0 0,4.4 -3.4,0"
            fill="#ff8d29"
            stroke="#2a1204"
            strokeWidth="1"
          />
          <circle cx="0" cy="0" r="1.3" fill="#fff1c2" />
        </g>
      );
    }

    if (m.kind === 'shard') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <polygon
            points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5"
            fill="#ffd66e"
            stroke="#362406"
            strokeWidth="0.8"
          />
        </g>
      );
    }

    if (m.kind === 'bell') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <circle cx="0" cy="0" r="4.6" fill="#5e4112" stroke="#ffd873" strokeWidth="1.2" />
          <path d="M-2 1.2h4L1.3 -1.6h-2.6z" fill="#ffd873" />
        </g>
      );
    }

    if (m.kind === 'elder') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <circle cx="0" cy="0" r="3.8" fill="#2c7a57" stroke="#85f0bc" strokeWidth="1.1" />
          <circle cx="0" cy="0" r="1.4" fill="#e6fff2" />
        </g>
      );
    }

    if (m.kind === 'lore') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`} opacity={opacity}>
          <rect
            x="-2.2"
            y="-2.6"
            width="4.4"
            height="5.2"
            rx="0.7"
            fill="#1f5475"
            stroke="#7ce0ff"
            strokeWidth="0.9"
          />
        </g>
      );
    }

    if (m.kind === 'resource') {
      const fill =
        m.label === 'herb' ? '#4be3b0' : m.label === 'ore' ? '#7dc5ff' : '#d69f56';
      return (
        <polygon
          key={m.id}
          points={`${rx},${rz - 2} ${rx + 2},${rz} ${rx},${rz + 2} ${rx - 2},${rz}`}
          fill={fill}
          stroke="#0a1218"
          strokeWidth="0.6"
          opacity={opacity}
        />
      );
    }

    if (m.kind === 'enemy') {
      return (
        <g key={m.id} transform={`translate(${rx}, ${rz})`}>
          <polygon
            points="0,-3.2 2.8,0 0,3.2 -2.8,0"
            fill="#e64840"
            stroke="#260808"
            strokeWidth="0.8"
          />
        </g>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div
        className="relative rounded-full p-[3px]"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, #6d5836 0%, #3a2d1b 55%, #171d24 100%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.72), inset 0 0 8px rgba(0, 0, 0, 0.85)',
        }}
      >
        <svg
          viewBox={`${-VIEW_R - 4} ${-VIEW_R - 4} ${(VIEW_R + 4) * 2} ${(VIEW_R + 4) * 2}`}
          className="w-[78px] h-[78px] sm:w-[114px] sm:h-[114px] rounded-full block"
          aria-label="Village minimap"
        >
          <defs>
            <clipPath id={clipId}>
              <circle cx="0" cy="0" r={VIEW_R} />
            </clipPath>

            {/* Radial gradients for smooth gothic fog-of-war falloff */}
            <radialGradient id={sightGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="68%" stopColor="#141414" />
              <stop offset="100%" stopColor="#ffffff" />
            </radialGradient>

            <radialGradient id={exploredGradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#585858" />
              <stop offset="65%" stopColor="#727272" />
              <stop offset="100%" stopColor="#ffffff" />
            </radialGradient>

            <linearGradient id={bezelGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c79e54" />
              <stop offset="50%" stopColor="#6b5431" />
              <stop offset="100%" stopColor="#b08843" />
            </linearGradient>

            {/* White = full dark cursed mist; Black = crystal clear; Gray = dimly explored */}
            <mask id={fogMaskId}>
              <rect
                x={-VIEW_R - 6}
                y={-VIEW_R - 6}
                width={(VIEW_R + 6) * 2}
                height={(VIEW_R + 6) * 2}
                fill="#ffffff"
              />
              {exploredDisks.map((d) => (
                <circle
                  key={d.key}
                  cx={d.rx}
                  cy={d.rz}
                  r={FOG_GRID_CELL_SIZE * 1.15}
                  fill={`url(#${exploredGradId})`}
                />
              ))}
              <circle cx="0" cy="0" r={sightRadius} fill={`url(#${sightGradId})`} />
            </mask>
          </defs>

          {/* Clipped Cartographic Interior */}
          <g clipPath={`url(#${clipId})`}>
            {/* Aged gothic slate base */}
            <circle cx="0" cy="0" r={VIEW_R} fill="#0c151e" />

            {/* Subtle cartographic rings & crosshairs */}
            <circle cx="0" cy="0" r={VIEW_R * 0.65} fill="none" stroke="#182734" strokeWidth="0.7" strokeDasharray="2 3" />
            <circle cx="0" cy="0" r={sightRadius} fill="none" stroke="#30485c" strokeWidth="0.8" opacity="0.65" />
            <line x1={-VIEW_R} y1="0" x2={VIEW_R} y2="0" stroke="#15222d" strokeWidth="0.6" />
            <line x1="0" y1={-VIEW_R} x2="0" y2={VIEW_R} stroke="#15222d" strokeWidth="0.6" />

            {/* Cobblestone village trails relative to player */}
            {VILLAGE_ROAD_SEGMENTS.map(([ax, az, bx, bz], idx) => (
              <line
                key={idx}
                x1={ax - px}
                y1={az - pz}
                x2={bx - px}
                y2={bz - pz}
                stroke="#2c3d4c"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.78"
              />
            ))}

            {/* Valley boundary arc */}
            <circle
              cx={-px}
              cy={-pz}
              r={72}
              fill="none"
              stroke="#3b2628"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              opacity="0.7"
            />

            {/* Discovered & In-Sight Interactive Objectives */}
            {visibleMarkers.map(renderMarkerGlyph)}

            {/* Active Objective Reticle when inside view */}
            {hud.objectivePos && !objOutOfRange && (
              <g transform={`translate(${objRelX}, ${objRelZ})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="6.8"
                  fill="none"
                  stroke="#ffd46b"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />
              </g>
            )}

            {/* Fog of War Shroud Overlay */}
            <circle
              cx="0"
              cy="0"
              r={VIEW_R + 2}
              fill="#04080d"
              fillOpacity="0.93"
              mask={`url(#${fogMaskId})`}
            />

            {/* Subtle warm lantern light aura around player */}
            <circle
              cx="0"
              cy="0"
              r={Math.max(8, sightRadius * 0.42)}
              fill="#e8a445"
              fillOpacity="0.08"
            />

            {/* Forward sight cone & Player compass arrowhead */}
            <g transform={`rotate(${headingDeg})`}>
              <polygon
                points="0,0 -10,-22 10,-22"
                fill="#c2dcf2"
                fillOpacity="0.11"
              />
              <polygon
                points="0,-6.2 4.3,4.8 0,2.2 -4.3,4.8"
                fill="#f8fafc"
                stroke="#0a1219"
                strokeWidth="1.2"
              />
            </g>
          </g>

          {/* Ornate Tarnished Brass Gothic Bezel */}
          <circle
            cx="0"
            cy="0"
            r={VIEW_R}
            fill="none"
            stroke={`url(#${bezelGradId})`}
            strokeWidth="2.1"
          />
          <circle
            cx="0"
            cy="0"
            r={VIEW_R - 2.4}
            fill="none"
            stroke="#111a22"
            strokeWidth="0.9"
          />

          {/* Cardinal Compass Ticks & North Pip */}
          <polygon points={`0,${-VIEW_R - 2.5} 2.6,${-VIEW_R + 2.5} -2.6,${-VIEW_R + 2.5}`} fill="#e5b963" />
          <circle cx={VIEW_R} cy="0" r="1.4" fill="#9e824c" />
          <circle cx={-VIEW_R} cy="0" r="1.4" fill="#9e824c" />
          <circle cx="0" cy={VIEW_R} r="1.4" fill="#9e824c" />

          {/* Out-of-range Active Quest Directional Chevron pinned to bezel */}
          {hud.objectivePos && objOutOfRange && (
            <g
              transform={`translate(${Math.cos(objEdgeAngle) * (VIEW_R - 3)}, ${
                Math.sin(objEdgeAngle) * (VIEW_R - 3)
              }) rotate(${(objEdgeAngle * 180) / Math.PI + 90})`}
            >
              <polygon
                points="0,-4.5 3.6,3.2 0,1.4 -3.6,3.2"
                fill="#ffd86e"
                stroke="#1c1204"
                strokeWidth="0.9"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Compact Fog-of-War / Sight Readout Tag */}
      <span
        className="px-2 py-0.5 rounded border border-[#3a5163]/65 text-[9px] font-semibold tracking-wider text-[#b6cad9] tabular-nums"
        style={{ backgroundColor: 'rgba(10, 17, 24, 0.85)' }}
      >
        Sight {sightRadius}m
      </span>
    </div>
  );
};
