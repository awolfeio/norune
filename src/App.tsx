import { useCallback, useEffect, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';

import { useLatestSlot } from '@app/solana/useLatestSlot';
import {
  getPhantomProvider,
  type PhantomProvider,
  type PhantomPublicKey,
} from '@app/solana/getPhantomProvider';
import { verifySignInProof } from '@app/solana/verifySignInProof';
import {
  savePlayerProfile,
  loadPlayerProfile,
  type PlayerProfile,
} from '@services/profileService';
import {
  useSessionStore,
  selectExperienceMode,
  selectSignInProof,
  selectTutorialCompleted,
  selectWalletBinding,
  type ExperienceMode,
  type SignInProof,
} from '@state/sessionStore';
import { ExperienceModeToggle } from '@ui/components/ExperienceModeToggle';
import { SignInWithSolanaCard } from '@ui/components/SignInWithSolanaCard';
import { TownViewport } from '@ui/components/TownViewport';
import { TutorialModal } from '@ui/components/TutorialModal';
import { UsernameForm } from '@ui/components/UsernameForm';

const PHANTOM_ICON_URL =
  'https://raw.githubusercontent.com/phantom-app/default-assets/master/default-monochrome.svg';

type SignInStatus = 'idle' | 'verifying' | 'success' | 'error';
type ProfileStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function App() {
  const { slot } = useLatestSlot();
  const [phantomProvider, setPhantomProvider] = useState<PhantomProvider | null>(
    null
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<ExperienceMode>('orbit');
  const [isHeroDragging, setHeroDragging] = useState(false);
  const [isTutorialOpen, setTutorialOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<SignInStatus>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    username,
    setUsername,
    tutorialCompleted,
    markTutorialSeen,
    mode,
    setMode,
    wallet,
    setWallet,
    clearWallet,
    signInProof,
    setSignInProof,
    clearSignInProof,
  } = useSessionStore(
    (state) => ({
      username: state.username,
      setUsername: state.setUsername,
      tutorialCompleted: selectTutorialCompleted(state),
      markTutorialSeen: state.markTutorialSeen,
      mode: selectExperienceMode(state),
      setMode: state.setMode,
      wallet: selectWalletBinding(state),
      setWallet: state.setWallet,
      clearWallet: state.clearWallet,
      signInProof: selectSignInProof(state),
      setSignInProof: state.setSignInProof,
      clearSignInProof: state.clearSignInProof,
    }),
    shallow
  );

  const walletAddress = wallet?.address ?? null;
  const isWalletConnected = Boolean(walletAddress);

  useEffect(() => {
    setPendingMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!tutorialCompleted) {
      setTutorialOpen(true);
    }
  }, [tutorialCompleted]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setHeroDragging(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuContainerRef.current) return;
      if (!menuContainerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setHeroDragging(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const provider = getPhantomProvider();
    setPhantomProvider(provider);
    if (!provider) return;

    const setWalletFromPublicKey = (
      publicKey: PhantomPublicKey | string | null
    ) => {
      if (!publicKey) {
        clearWallet();
        clearSignInProof();
        return;
      }
      const address = publicKeyToString(publicKey);
      if (!address) return;
      setWallet({
        address,
        walletName: 'Phantom',
        icon: PHANTOM_ICON_URL,
      });
    };

    const handleAccountChanged = (
      publicKey: PhantomPublicKey | string | null
    ) => {
      setWalletFromPublicKey(publicKey);
    };

    const accountChangedListener = (publicKey: unknown) => {
      handleAccountChanged(publicKey as PhantomPublicKey | string | null);
    };

    const handleDisconnect = () => {
      clearWallet();
      clearSignInProof();
    };

    provider.on('accountChanged', accountChangedListener);
    provider.on('disconnect', handleDisconnect);

    const ensureConnected = async () => {
      try {
        const response = await provider.connect({ onlyIfTrusted: true });
        setWalletFromPublicKey(response?.publicKey ?? provider.publicKey ?? null);
      } catch (error) {
        if (provider.publicKey) {
          setWalletFromPublicKey(provider.publicKey);
        }
      }
    };

    void ensureConnected();

    return () => {
      provider.removeListener?.('accountChanged', accountChangedListener);
      provider.removeListener?.('disconnect', handleDisconnect);
    };
  }, [setWallet, clearWallet, clearSignInProof]);

  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      setProfileStatus('idle');
      setProfileError(null);
      setVerificationStatus('idle');
      setVerificationError(null);
      clearSignInProof();
      return;
    }

    let cancelled = false;
    setProfileStatus('idle');
    setProfileError(null);
    setVerificationStatus('idle');
    setVerificationError(null);

    void loadPlayerProfile(walletAddress).then((storedProfile) => {
      if (cancelled) return;
      if (storedProfile) {
        setProfile(storedProfile);
        setProfileStatus('saved');
        setVerificationStatus('success');
        setVerificationError(null);
        setSignInProof(storedProfile.proof);
        if (
          storedProfile.username &&
          storedProfile.username !== username
        ) {
          setUsername(storedProfile.username);
        }
      } else {
        setProfile(null);
        clearSignInProof();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, setUsername, clearSignInProof, setSignInProof, username]);

  const requireSignInMessage =
    verificationStatus !== 'success' || !signInProof
      ? 'Complete Sign In With Solana before saving.'
      : null;

  const connectPhantom = useCallback(async () => {
    setConnectionError(null);
    const provider = phantomProvider ?? getPhantomProvider();
    if (!provider) {
      setConnectionError('Phantom wallet extension not detected.');
      return;
    }
    try {
      const response = await provider.connect({ onlyIfTrusted: false });
      const address = publicKeyToString(
        response?.publicKey ?? provider.publicKey ?? null
      );
      if (!address) {
        throw new Error('Unable to read Phantom wallet address.');
      }
      setWallet({
        address,
        walletName: 'Phantom',
        icon: PHANTOM_ICON_URL,
      });
      setWalletModalOpen(false);
    } catch (error) {
      console.error('Failed to connect Phantom', error);
      setConnectionError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [phantomProvider, setWallet]);

  const disconnectPhantom = useCallback(async () => {
    const provider = phantomProvider ?? getPhantomProvider();
    try {
      await provider?.disconnect();
    } catch (error) {
      console.warn('Phantom disconnect failed', error);
    } finally {
      clearWallet();
      clearSignInProof();
      setWalletModalOpen(false);
    }
  }, [phantomProvider, clearWallet, clearSignInProof]);

  const handleSignInProof = useCallback(
    async (proof: SignInProof) => {
      setVerificationStatus('verifying');
      setVerificationError(null);
      const result = await verifySignInProof(proof);
      if (result.status === 'error') {
        setVerificationStatus('error');
        setVerificationError(result.reason);
        throw new Error(result.reason);
      }
      setVerificationStatus('success');
      setVerificationError(null);
      await savePlayerProfile({
        walletAddress: proof.walletAddress,
        username,
        proof,
      });
    },
    [username]
  );

  const handleSignInReset = useCallback(() => {
    setSignInProof(null);
    setVerificationStatus('idle');
    setVerificationError(null);
  }, [setSignInProof]);

  const handleUsernameConfirm = useCallback(async () => {
    if (!walletAddress) {
      setProfileStatus('error');
      const message = 'Connect your wallet to save a username.';
      setProfileError(message);
      return;
    }
    if (requireSignInMessage) {
      setProfileStatus('error');
      setProfileError(requireSignInMessage);
      return;
    }

    setProfileStatus('saving');
    setProfileError(null);
    try {
      const saved = await savePlayerProfile({
        walletAddress,
        username,
        proof: signInProof!,
      });
      setProfile(saved);
      setProfileStatus('saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProfileStatus('error');
      setProfileError(message);
    }
  }, [walletAddress, requireSignInMessage, username, signInProof]);

  return (
    <div className="flex min-h-screen flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.5em] text-purple-200">
            Project Norune
          </p>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Craft a Solana-linked floating town.
          </h1>
          <p className="max-w-2xl text-sm text-white/70 md:text-base">
            Connect via Phantom, claim your identity, and prototype your town
            across a 512×512 plot. Everything you build binds immutably to your
            wallet on Solana.
          </p>
        </div>
        <div
          ref={menuContainerRef}
          className="relative flex items-center gap-2 self-end md:self-start"
        >
          <button
            type="button"
            onClick={() =>
              setMenuOpen((open) => {
                if (open) {
                  setHeroDragging(false);
                }
                return !open;
              })
            }
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-controls="norune-nav-menu"
            aria-label="Toggle Norune menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <WalletControl
            isConnected={isWalletConnected}
            address={walletAddress}
            onButtonClick={() => {
              setWalletModalOpen(true);
              setConnectionError(null);
            }}
          />
          {isMenuOpen ? (
            <NavMenuDropdown
              username={username}
              onUsernameChange={setUsername}
              onUsernameConfirm={handleUsernameConfirm}
              profileStatus={profileStatus}
              profileError={profileError}
              walletAddress={walletAddress}
              isWalletConnected={isWalletConnected}
              signInProof={signInProof}
              verificationStatus={verificationStatus}
              verificationError={verificationError}
              onSignInProof={handleSignInProof}
              onResetSignIn={handleSignInReset}
              mode={mode}
              pendingMode={pendingMode}
              onModeChange={(nextMode) => {
                setPendingMode(nextMode);
                setMode(nextMode);
              }}
              onOrbitReset={() => {
                setMode('orbit');
                setPendingMode('orbit');
              }}
              tutorialCompleted={tutorialCompleted}
              profile={profile}
              onHeroDragStart={() => {
                if (!isWalletConnected) return false;
                setHeroDragging(true);
                setMenuOpen(false);
                return true;
              }}
              onHeroDragEnd={() => setHeroDragging(false)}
              closeMenu={() => setMenuOpen(false)}
              requireSignInMessage={requireSignInMessage}
            />
          ) : null}
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div
          className={`relative flex-1 min-h-[70vh] overflow-hidden ${
            isHeroDragging
              ? 'ring-2 ring-purple-400 ring-offset-4 ring-offset-purple-900/40'
              : ''
          }`}
          onDragOver={(event) => {
            if (!isWalletConnected) return;
            event.preventDefault();
          }}
          onDragLeave={() => {
            setHeroDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!isWalletConnected) return;
            setHeroDragging(false);
            setMode('avatar');
            setPendingMode('avatar');
          }}
        >
          <TownViewport mode={mode} latestSlot={slot} />
        </div>
      </main>

      <TutorialModal
        open={isTutorialOpen}
        onClose={() => {
          setTutorialOpen(false);
          markTutorialSeen();
        }}
        onFinish={() => {
          markTutorialSeen();
          setTutorialOpen(false);
        }}
      />

      <WalletModal
        open={isWalletModalOpen}
        onClose={() => {
          setWalletModalOpen(false);
          setConnectionError(null);
        }}
        onConnect={connectPhantom}
        onDisconnect={disconnectPhantom}
        isConnected={isWalletConnected}
        address={walletAddress}
        providerDetected={Boolean(phantomProvider)}
        errorMessage={connectionError}
      />
    </div>
  );
}

function WalletControl({
  isConnected,
  address,
  onButtonClick,
}: {
  isConnected: boolean;
  address: string | null;
  onButtonClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onButtonClick}
      className="self-start rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-white/10"
    >
      {isConnected && address
        ? `Phantom · ${truncate(address)}`
        : 'Connect Wallet'}
    </button>
  );
}

function WalletModal({
  open,
  onClose,
  onConnect,
  onDisconnect,
  isConnected,
  address,
  providerDetected,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
  address: string | null;
  providerDetected: boolean;
  errorMessage: string | null;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/80 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              Connect Wallet
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Choose a wallet to continue
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-2 text-sm text-white/70 hover:bg-white/10"
            aria-label="Close wallet selection"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onConnect}
            className="flex w-full items-center justify-between rounded-xl border border-transparent bg-[#8b7bff] px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_12px_40px_rgba(139,123,255,0.4)] transition hover:bg-[#7563ff]"
          >
            <span className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.156 13.362c1.502 0 2.874-.698 3.787-1.816.953-1.16 1.212-2.686.663-4.07C20.88 4.066 16.775 2 12.789 2 6.24 2 1 6.49 1 12.028 1 15.898 3.31 18 6.322 18c2.028 0 3.39-1.002 4.627-2.327 1.024-1.095 2.026-2.158 3.454-2.158.915 0 1.486.572 1.486 1.21 0 .822-.76 1.37-1.705 1.37-.716 0-1.3-.319-1.79-.77-.176-.16-.405-.225-.63-.165-.224.06-.4.23-.47.45-.07.218-.015.46.145.628.703.733 1.644 1.204 2.745 1.204 1.933 0 3.427-1.303 3.427-3.013 0-1.47-1.162-2.54-2.802-2.54-1.645 0-2.64 1.05-3.75 2.235-1.047 1.118-2.075 2.144-3.689 2.144-1.999 0-3.322-1.456-3.322-3.648 0-4.328 4.395-7.926 9.766-7.926 3.3 0 6.726 1.766 7.732 4.368.39 1.012.204 2.105-.498 2.978-.658.8-1.66 1.26-2.723 1.26-1.34 0-2.25-.676-3.053-1.257-.71-.511-1.377-.96-2.152-.96-1.285 0-2.23 1.036-2.23 2.385 0 2.158 1.72 3.655 3.915 3.655Zm-4.36-3.208c.52 0 .972.377.972.894 0 .515-.452.893-.972.893-.533 0-.972-.37-.972-.893 0-.517.439-.894.972-.894Z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-semibold">Phantom</span>
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-white/90">
              {isConnected ? 'Reconnect' : 'Connect'}
            </span>
          </button>

          {!providerDetected ? (
            <p className="rounded-lg border border-dashed border-orange-400/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
              Install the Phantom browser extension and refresh this page to
              connect.
            </p>
          ) : null}

          {isConnected && address ? (
            <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70">
              <p className="font-semibold text-white">Connected as</p>
              <p className="font-mono text-sm">{address}</p>
              <button
                type="button"
                onClick={onDisconnect}
                className="mt-3 inline-flex items-center justify-center rounded border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function truncate(value: string, visible = 4) {
  if (!value) return '';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

type NavMenuDropdownProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  onUsernameConfirm: () => Promise<void>;
  profileStatus: ProfileStatus;
  profileError: string | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  signInProof: SignInProof | null;
  verificationStatus: SignInStatus;
  verificationError: string | null;
  onSignInProof: (proof: SignInProof) => Promise<void>;
  onResetSignIn: () => void;
  mode: ExperienceMode;
  pendingMode: ExperienceMode;
  onModeChange: (mode: ExperienceMode) => void;
  onOrbitReset: () => void;
  tutorialCompleted: boolean;
  profile: PlayerProfile | null;
  onHeroDragStart: () => boolean;
  onHeroDragEnd: () => void;
  closeMenu: () => void;
  requireSignInMessage: string | null;
};

function NavMenuDropdown({
  username,
  onUsernameChange,
  onUsernameConfirm,
  profileStatus,
  profileError,
  walletAddress,
  isWalletConnected,
  signInProof,
  verificationStatus,
  verificationError,
  onSignInProof,
  onResetSignIn,
  mode,
  pendingMode,
  onModeChange,
  onOrbitReset,
  tutorialCompleted,
  profile,
  onHeroDragStart,
  onHeroDragEnd,
  closeMenu,
  requireSignInMessage,
}: NavMenuDropdownProps) {
  return (
    <div
      id="norune-nav-menu"
      role="menu"
      className="absolute right-0 top-12 z-40 w-[min(360px,calc(100vw-2rem))] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/90 p-5 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="flex flex-col gap-5">
        <ExperienceModeToggle
          mode={pendingMode}
          disabled={!isWalletConnected}
          onChange={(nextMode) => {
            onModeChange(nextMode);
          }}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
            Avatar Token
          </p>
          <p className="mt-2">
            Drag this hero onto your plot to possess them, Street View style.
            Once dropped, use WASD + Shift to roam.
          </p>
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              if (!onHeroDragStart()) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.effectAllowed = 'copy';
              event.dataTransfer.setData('text/plain', 'avatar');
            }}
            onDragEnd={onHeroDragEnd}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-400 active:translate-y-[1px]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-xs font-bold">
              AV
            </span>
            Drag hero onto land
          </button>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
            onClick={() => {
              onOrbitReset();
              closeMenu();
            }}
          >
            Reset to orbit view
          </button>
        </div>

        <SignInWithSolanaCard
          walletAddress={walletAddress}
          username={username}
          onSigned={onSignInProof}
          onReset={onResetSignIn}
          proof={signInProof}
          verificationStatus={verificationStatus}
          verificationError={verificationError}
        />

        <UsernameForm
          username={username}
          onUsernameChange={onUsernameChange}
          onConfirm={onUsernameConfirm}
          disabled={
            !isWalletConnected ||
            verificationStatus !== 'success' ||
            !signInProof
          }
          status={profileStatus}
          errorMessage={profileError}
        />
        {requireSignInMessage ? (
          <p className="rounded-lg border border-dashed border-purple-300/40 bg-purple-500/10 px-3 py-2 text-xs text-purple-100/80">
            {requireSignInMessage}
          </p>
        ) : null}

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          <h2 className="text-sm font-semibold text-white">Session Overview</h2>
          <p>
            <span className="font-semibold text-white">Wallet:</span>{' '}
            {walletAddress ? (
              <span className="font-mono text-white/80">
                Phantom - {truncate(walletAddress)}
              </span>
            ) : (
              'Not connected'
            )}
          </p>
          <p>
            <span className="font-semibold text-white">Username:</span>{' '}
            {username || 'Not set'}
          </p>
          <p>
            <span className="font-semibold text-white">Mode:</span>{' '}
            {mode === 'orbit' ? 'Orbit planning' : 'Avatar possession'}
          </p>
          <p>
            <span className="font-semibold text-white">Tutorial:</span>{' '}
            {tutorialCompleted ? 'Completed' : 'Pending'}
          </p>
          <p>
            <span className="font-semibold text-white">Sign-in:</span>{' '}
            {verificationStatus === 'success' && signInProof
              ? `Signature captured at ${new Date(
                  signInProof.signedAt
                ).toLocaleTimeString()}`
              : verificationStatus === 'error'
              ? verificationError ?? 'Verification failed'
              : 'Pending wallet signature'}
          </p>
          <p>
            <span className="font-semibold text-white">Profile:</span>{' '}
            {profileStatus === 'saved' && profile
              ? `Bound at ${new Date(
                  profile.updatedAt
                ).toLocaleTimeString()}`
              : profileStatus === 'error'
              ? profileError ?? 'Profile error'
              : profileStatus === 'saving'
              ? 'Saving...'
              : 'Not saved'}
          </p>
        </div>
      </div>
    </div>
  );
}

function publicKeyToString(publicKey: PhantomPublicKey | string | null) {
  if (!publicKey) return null;
  if (typeof publicKey === 'string') return publicKey;
  if (typeof publicKey.toString === 'function') {
    return publicKey.toString();
  }
  return null;
}




