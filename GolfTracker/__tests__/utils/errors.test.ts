import {
  AppError,
  ErrorCode,
  createDatabaseError,
  createNetworkError,
  createAIError,
  createValidationError,
} from '../../src/utils/errors';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        'Test message',
        ErrorCode.DATABASE_ERROR,
        'User message',
        true,
        new Error('Original')
      );
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.userMessage).toBe('User message');
      expect(error.retryable).toBe(true);
      expect(error.originalError).toBeDefined();
    });
    
    it('should default retryable to false', () => {
      const error = new AppError(
        'Test',
        ErrorCode.VALIDATION_ERROR,
        'Invalid'
      );
      
      expect(error.retryable).toBe(false);
    });
    
    it('should be instance of Error', () => {
      const error = new AppError(
        'Test',
        ErrorCode.DATABASE_ERROR,
        'User message'
      );
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });
  
  describe('Error Helper Functions', () => {
    it('should create database error', () => {
      const error = createDatabaseError('DB failed', 'Cannot save');
      
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.message).toBe('DB failed');
      expect(error.userMessage).toBe('Cannot save');
      expect(error.retryable).toBe(true);
    });
    
    it('should create network error', () => {
      const error = createNetworkError('Network failed', 'No connection');
      
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
    });
    
    it('should create AI error', () => {
      const error = createAIError('AI failed', 'Analysis unavailable');
      
      expect(error.code).toBe(ErrorCode.AI_ERROR);
      expect(error.retryable).toBe(true);
    });
    
    it('should create validation error', () => {
      const error = createValidationError('Invalid data', 'Check input');
      
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.retryable).toBe(false); // Validation errors not retryable
    });
  });
  
  describe('Error Codes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCode.AI_ERROR).toBe('AI_ERROR');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.MEDIA_ERROR).toBe('MEDIA_ERROR');
      expect(ErrorCode.PERMISSION_ERROR).toBe('PERMISSION_ERROR');
      expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });
});

