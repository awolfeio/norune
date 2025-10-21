import type { ExperienceMode } from '@state/sessionStore';

type ExperienceModeToggleProps = {
  mode: ExperienceMode;
  onChange: (mode: ExperienceMode) => void;
  disabled?: boolean;
};

export function ExperienceModeToggle({
  mode,
  onChange,
  disabled
}: ExperienceModeToggleProps) {
  const isOrbit = mode === 'orbit';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
      <div className="flex flex-1 flex-col">
        <span className="text-xs uppercase tracking-[0.4em] text-purple-200">
          View Mode
        </span>
        <span className="text-base font-semibold text-white">
          {isOrbit ? 'Aerial Orbit' : 'Avatar Possession'}
        </span>
        <p className="mt-1 text-xs text-white/60">
          {isOrbit
            ? 'Rotate, zoom, and plan your town layout from above.'
            : 'Control your hero with WASD, Shift to sprint, Space to interact.'}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || isOrbit}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            isOrbit
              ? 'bg-purple-500 text-white shadow'
              : 'bg-black/40 text-white/60 hover:bg-black/60'
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => onChange('orbit')}
        >
          Orbit
        </button>
        <button
          type="button"
          disabled={disabled || !isOrbit}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            !isOrbit
              ? 'bg-purple-500 text-white shadow'
              : 'bg-black/40 text-white/60 hover:bg-black/60'
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => onChange('avatar')}
        >
          Avatar
        </button>
      </div>
    </div>
  );
}
