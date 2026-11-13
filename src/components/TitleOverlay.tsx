import React from 'react';

interface TitleOverlayProps {
  onStart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onStart,
  muted,
  onToggleMute,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-10"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(6,11,16,0.0) 46%, rgba(4,8,12,0.58) 100%)',
      }}
    >
      {/* Top row: Title Crest in upper-left calm negative space + Mute icon button top-right */}
      <div className="flex items-start justify-between gap-4">
        <div
          className="pointer-events-auto max-w-md rounded-lg px-5 py-5 sm:px-7 sm:py-6 border border-[#3d5568]/55"
          style={{
            backgroundColor: 'rgba(9, 16, 23, 0.86)',
            boxShadow: '0 22px 54px rgba(0, 0, 0, 0.72)',
          }}
        >
          {/* Bespoke inline SVG gothic bell-crest title lockup */}
          <svg
            viewBox="0 0 360 92"
            className="w-full max-w-[320px] h-auto mb-3"
            aria-label="Ashhollow: Oath of the Bell"
          >
            {/* Ornamental crest bell icon */}
            <g transform="translate(8, 10)">
              <path
                d="M28 4 L34 10 L28 16 L22 10 Z"
                fill="#d4a44a"
                stroke="#0c141b"
                strokeWidth="1.5"
              />
              <path
                d="M28 15 C18 15 14 25 13 38 L8 49 L48 49 L43 38 C42 25 38 15 28 15 Z"
                fill="#c28b37"
                stroke="#0b1219"
                strokeWidth="2.5"
              />
              <path
                d="M22 22 C19 28 18 35 17 44"
                stroke="#f6d992"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="28" cy="53" r="4.5" fill="#e6b85c" stroke="#0b1219" strokeWidth="1.8" />
              <path d="M6 58 L50 58" stroke="#4f6d82" strokeWidth="2" />
            </g>

            {/* Gothic Title Typography */}
            <text
              x="74"
              y="48"
              fill="#ece6da"
              stroke="#080f15"
              strokeWidth="4"
              paintOrder="stroke fill"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="800"
              fontSize="36"
              letterSpacing="3"
            >
              ASHHOLLOW
            </text>
            <line x1="74" y1="58" x2="342" y2="58" stroke="#c28b37" strokeWidth="1.5" />
            <text
              x="76"
              y="77"
              fill="#d4a44a"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="700"
              fontSize="13.5"
              letterSpacing="4.2"
            >
              OATH OF THE BELL
            </text>
          </svg>

          <p className="text-xs sm:text-sm text-[#b7c6d2] leading-relaxed mb-5 max-w-[34ch]">
            Explore the cursed village, ignite the sanctuary braziers, reclaim the sacred shards, and banish the shadow from Ashhollow.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-6 py-3 rounded border border-[#e3b764] bg-[#a86a24] hover:bg-[#bf7b2c] active:translate-y-0.5 text-[#faf6ee] font-gothic font-bold tracking-wider text-sm sm:text-base uppercase transition-colors cursor-pointer"
              style={{ boxShadow: '0 4px 18px rgba(196, 120, 36, 0.35)' }}
            >
              Enter Village
            </button>
          </div>
        </div>

        <button
          type="button"
          tabIndex={-1}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="pointer-events-auto w-11 h-11 rounded border border-[#3d5568]/65 flex items-center justify-center text-[#dce4ea] hover:border-[#d4a44a] transition-colors cursor-pointer"
          style={{ backgroundColor: 'rgba(11, 19, 27, 0.82)' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" fillOpacity="0.2" />
            {muted ? (
              <path d="M22 9l-6 6M16 9l6 6" stroke="#ff6b6b" strokeLinecap="round" />
            ) : (
              <path d="M15.5 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Bottom single flat borderless control-hint line */}
      <div className="text-center pb-1">
        <p className="text-[11px] sm:text-xs tracking-wider uppercase text-[#9db1c0] hud-stroke">
          WASD / Joystick Move · Drag Look · J / Slash · K / Flare · Space Dash · E Interact · P Pause
        </p>
      </div>
    </div>
  );
};
