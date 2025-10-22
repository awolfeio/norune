import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExperienceMode = 'orbit' | 'avatar';

export type SignInProof = {
  requestId: string;
  signatureBase64: string;
  signedMessage: string;
  signedAt: string;
  walletAddress: string;
};

type WalletBinding =
  | {
      address: string;
      walletName: string;
      icon?: string;
    }
  | null;

type SessionState = {
  username: string;
  setUsername: (value: string) => void;
  tutorialCompleted: boolean;
  markTutorialSeen: () => void;
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  wallet: WalletBinding;
  setWallet: (wallet: WalletBinding) => void;
  clearWallet: () => void;
  signInProof: SignInProof | null;
  setSignInProof: (proof: SignInProof | null) => void;
  clearSignInProof: () => void;
};

export const useSessionStore = create(
  persist<SessionState>(
    (set) => ({
      username: '',
      setUsername: (value) =>
        set(() => ({
          username: value
        })),
      tutorialCompleted: false,
      markTutorialSeen: () =>
        set(() => ({
          tutorialCompleted: true
        })),
      mode: 'orbit',
      setMode: (mode) => set(() => ({ mode })),
      wallet: null,
      setWallet: (wallet) =>
        set(() => ({
          wallet
        })),
      clearWallet: () =>
        set(() => ({
          wallet: null,
          signInProof: null
        })),
      signInProof: null,
      setSignInProof: (proof) =>
        set(() => ({
          signInProof: proof
        })),
      clearSignInProof: () =>
        set(() => ({
          signInProof: null
        }))
    }),
    {
      name: 'norune-session'
    }
  )
);

export const selectWalletBinding = (state: SessionState) => state.wallet;
export const selectExperienceMode = (state: SessionState) => state.mode;
export const selectTutorialCompleted = (state: SessionState) =>
  state.tutorialCompleted;
export const selectSignInProof = (state: SessionState) => state.signInProof;
