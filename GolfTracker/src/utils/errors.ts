import { Alert } from 'react-native';

export enum ErrorCode {
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AI_ERROR = 'AI_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MEDIA_ERROR = 'MEDIA_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage: string,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export const handleError = (error: unknown, context: string): void => {
  console.error(`Error in ${context}:`, error);
  
  if (error instanceof AppError) {
    // Log to monitoring service (e.g., Sentry)
    logToMonitoring(error, context);
    
    if (error.retryable) {
      Alert.alert(
        'Error',
        error.userMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => {
              // Retry callback would be passed from calling context
              console.log('Retry requested for:', context);
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', error.userMessage);
    }
  } else if (error instanceof Error) {
    // Generic error handling
    logToMonitoring(error, context);
    Alert.alert(
      'Error',
      'Something went wrong. Please try again.'
    );
  } else {
    // Unknown error type
    const errorMessage = String(error);
    console.error('Unknown error type:', errorMessage);
    Alert.alert('Error', 'An unexpected error occurred.');
  }
};

// Placeholder for monitoring service integration
const logToMonitoring = (error: Error, context: string): void => {
  // In production, integrate with Sentry, Firebase Crashlytics, etc.
  if (__DEV__) {
    console.log('[MONITORING]', {
      context,
      message: error.message,
      stack: error.stack,
    });
  }
  
  // TODO: Integrate with actual monitoring service
  // Sentry.captureException(error, { tags: { context } });
};

// Helper functions to create specific error types
export const createDatabaseError = (
  message: string,
  userMessage: string = 'Failed to access database',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.DATABASE_ERROR, userMessage, true, originalError);
};

export const createNetworkError = (
  message: string,
  userMessage: string = 'Network request failed',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.NETWORK_ERROR, userMessage, true, originalError);
};

export const createAIError = (
  message: string,
  userMessage: string = 'AI analysis failed',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.AI_ERROR, userMessage, true, originalError);
};

export const createValidationError = (
  message: string,
  userMessage: string = 'Invalid input data',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.VALIDATION_ERROR, userMessage, false, originalError);
};

export const createMediaError = (
  message: string,
  userMessage: string = 'Media operation failed',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.MEDIA_ERROR, userMessage, true, originalError);
};

export const createPermissionError = (
  message: string,
  userMessage: string = 'Permission denied',
  originalError?: unknown
): AppError => {
  return new AppError(message, ErrorCode.PERMISSION_ERROR, userMessage, false, originalError);
};

