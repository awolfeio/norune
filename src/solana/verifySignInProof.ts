import { decode as decodeBase64 } from 'js-base64';
import * as nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

import type { SignInProof } from '@state/sessionStore';

type VerificationResult =
  | { status: 'ok' }
  | { status: 'error'; reason: string };

/**
 * Lightweight client-side verifier for Sign In With Solana payloads.
 * This is a stand-in for a future backend verification step.
 */
export async function verifySignInProof(
  proof: SignInProof
): Promise<VerificationResult> {
  try {
    const signature = decodeBase64(proof.signatureBase64);
    const signatureBytes = new Uint8Array(
      [...signature].map((char) => char.charCodeAt(0))
    );
    const messageBytes = new TextEncoder().encode(proof.signedMessage);
    const publicKey = new PublicKey(proof.walletAddress);

    const verified = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!verified) {
      return {
        status: 'error',
        reason: 'Signature verification failed'
      };
    }

    if (!proof.signedMessage.includes(proof.walletAddress)) {
      return {
        status: 'error',
        reason: 'Signed message does not reference the wallet address'
      };
    }

    return { status: 'ok' };
  } catch (error) {
    console.warn('Failed to verify SIWS payload', error);
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
