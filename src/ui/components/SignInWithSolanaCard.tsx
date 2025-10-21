import { useCallback, useMemo, useState } from 'react';

import { getPhantomProvider } from '@app/solana/getPhantomProvider';

import type { SignInProof } from '@state/sessionStore';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

type Props = {
  walletAddress: string | null;
  username: string;
  onSigned: (proof: SignInProof) => Promise<void>;
  onReset: () => void;
  proof: SignInProof | null;
  verificationStatus: VerificationStatus;
  verificationError?: string | null;
};

export function SignInWithSolanaCard({
  walletAddress,
  username,
  onSigned,
  onReset,
  proof,
  verificationStatus,
  verificationError,
}: Props) {
  const provider = useMemo(() => getPhantomProvider(), []);
  const [isSigning, setIsSigning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const supportsSignIn = Boolean(
    provider && (typeof provider.signIn === 'function' || provider.signMessage)
  );

  const handleSignIn = useCallback(async () => {
    setIsSigning(true);
    setLocalError(null);

    try {
      const phantom = getPhantomProvider();
      if (!phantom) {
        throw new Error('Phantom wallet extension is not detected.');
      }
      if (!walletAddress) {
        throw new Error('Connect your Phantom wallet before signing in.');
      }

      const requestId = crypto.randomUUID();
      const domain = window.location.host;
      const statement =
        username.trim().length > 0
          ? `I am ${username} and I am ready to steward my Norune town.`
          : 'I am ready to steward my Norune town.';
      const issuedAt = new Date().toISOString();

      const message = [
        'norune.app would like to authenticate you.',
        `Domain: ${domain}`,
        `Wallet: ${walletAddress}`,
        `Issued At: ${issuedAt}`,
        `Nonce: ${requestId}`,
        '',
        statement,
      ].join('\n');

      let signatureBase64: string;
      let signedMessage = message;

      if (typeof phantom.signIn === 'function') {
        // Phantom's experimental signIn feature
        const result = await phantom.signIn({
          domain,
          statement,
          nonce: requestId,
        } as unknown);

        const signedMessageBuffer = normalizeToUint8Array(
          result.signedMessage
        );

        if (signedMessageBuffer) {
          signedMessage = new TextDecoder().decode(signedMessageBuffer);
        }

        const signatureBytes = normalizeToUint8Array(result.signature);
        if (!signatureBytes) {
          throw new Error('Unexpected signature type returned by Phantom.');
        }
        signatureBase64 = uint8ArrayToBase64(signatureBytes);
      } else if (phantom.signMessage) {
        // Legacy signMessage support
        const encodedMessage = new TextEncoder().encode(message);
        const { signature } = await phantom.signMessage(
          encodedMessage,
          'utf8'
        );
        signatureBase64 = uint8ArrayToBase64(signature);
      } else {
        throw new Error('Phantom wallet does not support message signing.');
      }

      await onSigned({
        requestId,
        signatureBase64,
        signedMessage,
        signedAt: issuedAt,
        walletAddress,
      });
    } catch (error) {
      console.error('Sign In With Solana failed', error);
      setLocalError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSigning(false);
    }
  }, [walletAddress, username, onSigned]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 shadow-lg backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-purple-200">
          Sign In With Solana
        </p>
        <h2 className="text-lg font-semibold text-white">Authorize session</h2>
      </div>

      {!provider ? (
        <p className="rounded-lg border border-dashed border-orange-400/50 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-200">
          Install the Phantom browser extension to sign in with your wallet.
        </p>
      ) : null}

      <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/60">
        <p>
          <span className="font-semibold text-white">Wallet:</span>{' '}
          {walletAddress ? (
            <span className="font-mono text-white/70">
              {`Phantom - ${truncate(walletAddress)}`}
            </span>
          ) : (
            'Not connected'
          )}
        </p>
        <p>
          <span className="font-semibold text-white">Username:</span>{' '}
          {username || 'Not set'}
        </p>
      </div>

      {supportsSignIn ? (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={
            isSigning ||
            verificationStatus === 'verifying' ||
            !walletAddress ||
            !provider
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-900 disabled:text-white/40"
        >
          {isSigning || verificationStatus === 'verifying'
            ? 'Awaiting signature.'
            : 'Sign in with wallet'}
        </button>
      ) : null}

      {verificationStatus === 'success' && proof ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <p className="font-semibold uppercase tracking-[0.2em]">
            Signature captured
          </p>
          <p className="mt-1 font-mono text-[11px]">
            {truncate(proof.signatureBase64, 10)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-100/80">
            Signed at {new Date(proof.signedAt).toLocaleTimeString()} with{' '}
            {truncate(proof.walletAddress)}
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 rounded border border-emerald-300/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-100 hover:border-emerald-200 hover:text-white"
            onClick={handleSignIn}
          >
            Re-sign
          </button>
          <button
            type="button"
            className="ml-2 inline-flex items-center gap-1 rounded border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60 hover:text-white"
            onClick={() => {
              onReset();
              setLocalError(null);
            }}
          >
            Clear signature
          </button>
        </div>
      ) : null}

      {(localError || verificationError) && (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {verificationError ?? localError}
        </p>
      )}
    </div>
  );
}

function truncate(value: string, visible = 4) {
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}.${value.slice(-visible)}`;
}

function normalizeToUint8Array(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(
      view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
    );
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (typeof value === 'string') {
    return new TextEncoder().encode(value);
  }
  return null;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
