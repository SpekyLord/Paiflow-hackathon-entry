import 'server-only';
import { getServiceClient } from './client';
import { createWalletBindingDb, type WalletBindingDb } from './wallet-binding-core';

let db: WalletBindingDb | null = null;
const get = (): WalletBindingDb => (db ??= createWalletBindingDb(getServiceClient()));

export const issueWalletChallenge: WalletBindingDb['issueWalletChallenge'] = (...args) => get().issueWalletChallenge(...args);
export const getWalletChallenge: WalletBindingDb['getWalletChallenge'] = (...args) => get().getWalletChallenge(...args);
export const consumeChallengeAndBind: WalletBindingDb['consumeChallengeAndBind'] = (...args) => get().consumeChallengeAndBind(...args);
export const unbindWallet: WalletBindingDb['unbindWallet'] = (...args) => get().unbindWallet(...args);
