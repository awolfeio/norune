type UsernameFormProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  status?: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string | null;
};

export function UsernameForm({
  username,
  onUsernameChange,
  onConfirm,
  disabled,
  status = 'idle',
  errorMessage
}: UsernameFormProps) {
  const canSubmit =
    username.trim().length >= 3 && !disabled && status !== 'saving';
  const isSaved = status === 'saved';
  const isSaving = status === 'saving';

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur"
      onSubmit={async (event) => {
        event.preventDefault();
        if (canSubmit) {
          try {
            await onConfirm();
          } catch (error) {
            console.error('Failed to save username', error);
          }
        }
      }}
    >
      <h2 className="text-lg font-semibold text-white">
        Claim your Norune name
      </h2>
      <p className="text-sm text-white/70">
        This username binds to your connected wallet. It appears on leaderboards
        and when visiting other towns.
      </p>
      <label className="flex flex-col gap-2 text-sm text-white/80">
        Username
        <input
          autoComplete="off"
          autoFocus
          className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 font-medium text-white placeholder:text-white/30 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          maxLength={18}
          minLength={3}
          name="username"
          placeholder="e.g. lunar-architect"
          value={username}
          onChange={(event) => onUsernameChange(event.currentTarget.value)}
          disabled={isSaving || disabled}
        />
      </label>
      <p className="text-xs text-white/50">
        Usernames are unique and can only be reassigned by reconnecting with the
        same wallet signature.
      </p>
      {isSaved ? (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Username bound to your wallet
        </p>
      ) : null}
      {status === 'error' && errorMessage ? (
        <p className="text-xs text-red-300">{errorMessage}</p>
      ) : null}
      <button
        className="inline-flex items-center justify-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-900 disabled:text-white/40"
        disabled={!canSubmit}
        type="submit"
      >
        {isSaving ? 'Saving…' : isSaved ? 'Username saved' : 'Save username'}
      </button>
    </form>
  );
}
