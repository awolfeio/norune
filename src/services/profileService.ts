import type { SignInProof } from '@state/sessionStore';

type SaveProfileInput = {
  walletAddress: string;
  username: string;
  proof: SignInProof;
};

const STORAGE_KEY_PREFIX = 'norune-profile-';

export type PlayerProfile = {
  walletAddress: string;
  username: string;
  proof: SignInProof;
  updatedAt: string;
};

export async function savePlayerProfile({
  walletAddress,
  username,
  proof
}: SaveProfileInput): Promise<PlayerProfile> {
  await simulateNetworkDelay();
  const profile: PlayerProfile = {
    walletAddress,
    username,
    proof,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(
    STORAGE_KEY_PREFIX + walletAddress,
    JSON.stringify(profile)
  );
  return profile;
}

export async function loadPlayerProfile(
  walletAddress: string
): Promise<PlayerProfile | null> {
  await simulateNetworkDelay(150);
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + walletAddress);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PlayerProfile;
  } catch (error) {
    console.warn('Failed to parse stored profile', error);
    return null;
  }
}

function simulateNetworkDelay(duration = 300) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}
