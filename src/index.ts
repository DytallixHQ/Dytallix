export { DytallixClient } from './client';
export type {
  ClientConfig,
  ChainStatus,
  Account,
  Transaction,
  TransactionQuery,
  TransactionReceipt,
  SendTokensRequest,
  TransactionResponse,
  FaucetResponse
} from './client';

export { PQCWallet, initPQC } from './wallet';
export type {
  PQCAlgorithm,
  KeyPair
} from './wallet';

export { DytallixError, ErrorCode } from './errors';

// Version
export const VERSION = '0.1.0';
