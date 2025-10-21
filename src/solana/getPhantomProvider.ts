export interface PhantomPublicKey {
  toString(): string;
}

export interface PhantomConnectOptions {
  onlyIfTrusted?: boolean;
}

export interface PhantomConnectResult {
  publicKey: PhantomPublicKey;
}

export interface PhantomProvider {
  isPhantom?: boolean;
  icon?: string;
  publicKey?: PhantomPublicKey;
  connect(options?: PhantomConnectOptions): Promise<PhantomConnectResult>;
  disconnect(): Promise<void>;
  signMessage(
    message: Uint8Array,
    displayEncoding?: 'utf8' | 'hex'
  ): Promise<{ signature: Uint8Array }>;
  signIn?(options: unknown): Promise<{
    publicKey: PhantomPublicKey;
    signedMessage: Uint8Array;
    signature: Uint8Array;
  }>;
  on(event: 'connect', handler: (publicKey: PhantomPublicKey) => void): void;
  on(event: 'disconnect', handler: () => void): void;
  on(
    event: 'accountChanged',
    handler: (publicKey: PhantomPublicKey | null) => void
  ): void;
  removeListener?(
    event: 'connect' | 'disconnect' | 'accountChanged',
    handler: (...args: unknown[]) => void
  ): void;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  }
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.phantom?.solana && window.phantom.solana.isPhantom) {
    return window.phantom.solana;
  }

  if (window.solana && window.solana.isPhantom) {
    return window.solana;
  }

  return null;
}

