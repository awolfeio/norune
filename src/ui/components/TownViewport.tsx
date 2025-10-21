import { TownScene } from '@three/TownScene';

import type { ExperienceMode } from '@state/sessionStore';

type TownViewportProps = {
  mode: ExperienceMode;
  latestSlot?: number | null;
};

export function TownViewport({ mode, latestSlot }: TownViewportProps) {
  return (
    <section className="relative flex min-h-[420px] flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/40 p-4 shadow-xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200">
            Aerial Survey
          </p>
          <h2 className="text-xl font-semibold text-white">
            512 × 512 Norune Plot
          </h2>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white/70">
          <span className="font-semibold text-white">Latest slot:</span>{' '}
          {latestSlot ? latestSlot.toLocaleString() : 'Connecting…'}
        </div>
      </header>
      <div className="relative flex-1 overflow-hidden rounded-2xl">
        <TownScene mode={mode} />
        <aside className="pointer-events-none absolute left-4 top-4 space-y-2 text-xs text-white/70">
          <span className="block rounded border border-white/15 bg-black/40 px-3 py-1 font-semibold text-white">
            Grid ready
          </span>
          <span className="block rounded border border-white/15 bg-black/40 px-3 py-1">
            Cell size: 16 × 16
          </span>
          <span className="block rounded border border-white/15 bg-black/40 px-3 py-1">
            Heightmap: Calm Highlands (WIP)
          </span>
        </aside>
      </div>
    </section>
  );
}
