import { useEffect, useState } from 'react';
import { createSolanaRpc, devnet } from '@solana/kit';

const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';

let rpcClient: ReturnType<typeof createSolanaRpc> | null = null;

function getRpc() {
  if (!rpcClient) {
    const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL ?? DEFAULT_RPC_URL;
    rpcClient = createSolanaRpc(devnet(rpcUrl));
  }
  return rpcClient;
}

export function useLatestSlot(pollIntervalMs = 10_000) {
  const [slot, setSlot] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let disposed = false;
    const rpc = getRpc();

    const fetchSlot = async () => {
      try {
        const nextSlot = await rpc.getSlot().send();
        if (!disposed) {
          setSlot(nextSlot);
          setError(null);
        }
      } catch (err) {
        if (!disposed) {
          console.error('Failed to fetch Solana slot', err);
          setError(err as Error);
        }
      }
    };

    fetchSlot();
    const interval = window.setInterval(fetchSlot, pollIntervalMs);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return { slot, error };
}
