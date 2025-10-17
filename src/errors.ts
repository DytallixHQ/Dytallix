export enum ErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  NONCE_MISMATCH = 'NONCE_MISMATCH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  FAUCET_ERROR = 'FAUCET_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class DytallixError extends Error {
  public code: ErrorCode;
  public details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'DytallixError';
    this.code = code;
    this.details = details;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DytallixError.prototype);
  }

  static fromResponse(error: any): DytallixError {
    const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status;
    
    // Parse error code from message or status
    if (message.toLowerCase().includes('insufficient') || message.includes('INSUFFICIENT_FUNDS')) {
      return new DytallixError(
        ErrorCode.INSUFFICIENT_FUNDS,
        'Insufficient funds to complete transaction',
        error.response?.data
      );
    }

    if (message.toLowerCase().includes('signature') || message.includes('INVALID_SIGNATURE')) {
      return new DytallixError(
        ErrorCode.INVALID_SIGNATURE,
        'Transaction signature is invalid',
        error.response?.data
      );
    }

    if (message.toLowerCase().includes('nonce') || message.includes('sequence mismatch')) {
      return new DytallixError(
        ErrorCode.NONCE_MISMATCH,
        'Transaction nonce is out of sync, retry with correct nonce',
        error.response?.data
      );
    }

    if (message.toLowerCase().includes('address') || message.toLowerCase().includes('invalid recipient')) {
      return new DytallixError(
        ErrorCode.INVALID_ADDRESS,
        'Invalid wallet address format',
        error.response?.data
      );
    }

    if (message.toLowerCase().includes('faucet') || statusCode === 429) {
      return new DytallixError(
        ErrorCode.FAUCET_ERROR,
        'Faucet request failed or rate limited',
        error.response?.data
      );
    }

    if (message.toLowerCase().includes('timeout') || error.code === 'ECONNABORTED') {
      return new DytallixError(
        ErrorCode.TIMEOUT_ERROR,
        'Request timed out, please try again',
        { originalError: error.message }
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return new DytallixError(
        ErrorCode.NETWORK_ERROR,
        'Cannot connect to Dytallix node - check network connection',
        { originalError: error.message, code: error.code }
      );
    }

    if (statusCode >= 400 && statusCode < 500) {
      return new DytallixError(
        ErrorCode.TRANSACTION_FAILED,
        `Transaction failed: ${message}`,
        error.response?.data
      );
    }

    if (statusCode >= 500) {
      return new DytallixError(
        ErrorCode.NETWORK_ERROR,
        'Dytallix node is experiencing issues, please try again later',
        error.response?.data
      );
    }

    return new DytallixError(
      ErrorCode.UNKNOWN_ERROR,
      message,
      error.response?.data || { originalError: error.message }
    );
  }
}
