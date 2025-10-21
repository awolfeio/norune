import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import fs from 'node:fs';

function resolveHttpsConfig(env: Record<string, string>) {
  if (env.VITE_DEV_HTTPS !== 'true') {
    return false;
  }

  const certPath = env.VITE_DEV_CERT_PATH ?? 'certs/localhost.crt';
  const keyPath = env.VITE_DEV_KEY_PATH ?? 'certs/localhost.key';

  try {
    return {
      cert: fs.readFileSync(path.resolve(process.cwd(), certPath)),
      key: fs.readFileSync(path.resolve(process.cwd(), keyPath))
    };
  } catch (error) {
    console.warn(
      '[vite] Failed to load HTTPS certificates. Falling back to HTTP.',
      error
    );
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      https: resolveHttpsConfig(env),
      host: true,
      port: Number(env.VITE_DEV_PORT ?? 5173),
      cors: {
        origin: [
          'https://localhost',
          'http://localhost',
          'https://api.devnet.solana.com'
        ]
      }
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT ?? 4173)
    },
    resolve: {
      alias: {
        '@three': path.resolve(__dirname, 'src/three'),
        '@app/solana': path.resolve(__dirname, 'src/solana'),
        '@state': path.resolve(__dirname, 'src/state'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@types': path.resolve(__dirname, 'src/types')
      }
    },
    optimizeDeps: {
      include: ['@solana/kit', '@solana/web3.js', 'three']
    }
  };
});
