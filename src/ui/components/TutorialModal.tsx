import { useEffect, useMemo, useState } from 'react';

type Step = {
  id: string;
  title: string;
  description: string;
};

const tutorialSteps: Step[] = [
  {
    id: 'connect',
    title: 'Connect with Phantom',
    description:
      'Link your Phantom wallet to inherit or create your Norune town. You can still browse in spectator mode without a signature.'
  },
  {
    id: 'identity',
    title: 'Bind your name',
    description:
      'Pick a unique username that binds to your wallet signature. Your progress, builds, and social visits follow this identity.'
  },
  {
    id: 'aerial',
    title: 'Survey your plot',
    description:
      'Spin the aerial camera, zoom across the 512×512 grid, and plan where to plant forests, carve rivers, or raise guild halls.'
  },
  {
    id: 'avatar',
    title: 'Enter avatar mode',
    description:
      'Drag your hero token onto the grid—just like wielding Toan or Max. Use WASD to explore your town from street level.'
  }
];

type TutorialModalProps = {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
};

export function TutorialModal({
  open,
  onClose,
  onFinish
}: TutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => tutorialSteps[stepIndex], [stepIndex]);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const isLastStep = stepIndex === tutorialSteps.length - 1;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8"
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-purple-950/90 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300">
              Norune Primer
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 p-2 text-white/70 hover:bg-white/10"
            onClick={onClose}
            aria-label="Skip tutorial"
          >
            ×
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          {step.description}
        </p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {tutorialSteps.map((item, index) => (
              <span
                key={item.id}
                aria-hidden
                className={`h-2 w-10 rounded-full ${
                  index <= stepIndex
                    ? 'bg-purple-400'
                    : 'bg-white/15'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-400"
              onClick={() => {
                if (isLastStep) {
                  onFinish();
                } else {
                  setStepIndex((index) =>
                    Math.min(index + 1, tutorialSteps.length - 1)
                  );
                }
              }}
            >
              {isLastStep ? 'Start building' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
