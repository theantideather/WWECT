/**
 * This is a custom import resolver for Vite to handle ethers.js imports
 * which can sometimes cause issues in ESM environments
 */
import { resolve } from 'path';

export default function etherResolver() {
  return {
    name: 'ethers-resolver',
    resolveId(id) {
      // Special handling for ethers imports
      if (id === 'ethers' || id.startsWith('ethers/')) {
        return { id: id, external: true };
      }
      return null;
    }
  };
} 