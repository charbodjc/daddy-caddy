import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useAsync } from '../../src/hooks/useAsync';

describe('useAsync', () => {
  it('should execute async function on mount by default', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockAsyncFn));
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('test data');
    expect(result.current.error).toBeNull();
  });
  
  it('should not execute immediately when immediate is false', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockAsyncFn, [], false));
    
    expect(result.current.loading).toBe(false);
    expect(mockAsyncFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
  
  it('should handle successful async operation', async () => {
    const testData = { id: 1, name: 'Test' };
    const mockAsyncFn = jest.fn().mockResolvedValue(testData);
    
    const { result } = renderHook(() => useAsync(mockAsyncFn));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toEqual(testData);
    expect(result.current.error).toBeNull();
  });
  
  it('should handle async errors', async () => {
    const testError = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(testError);
    
    const { result } = renderHook(() => useAsync(mockAsyncFn));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(testError);
  });
  
  it('should provide execute function', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('test');
    
    const { result } = renderHook(() => useAsync(mockAsyncFn, [], false));
    
    expect(result.current.execute).toBeDefined();
    expect(typeof result.current.execute).toBe('function');
  });
  
  it('should allow manual execution via execute', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('manual data');
    
    const { result } = renderHook(() => useAsync(mockAsyncFn, [], false));
    
    // Should not have executed yet
    expect(mockAsyncFn).not.toHaveBeenCalled();
    
    // Manually execute
    await act(async () => {
      await result.current.execute();
    });
    
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('manual data');
  });
  
  it('should provide refetch function', async () => {
    const mockAsyncFn = jest.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    
    const { result } = renderHook(() => useAsync(mockAsyncFn));
    
    await waitFor(() => {
      expect(result.current.data).toBe('first');
    });
    
    // Refetch
    await act(async () => {
      await result.current.refetch();
    });
    
    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('second');
  });
  
  it('should set loading state during execution', async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    const mockAsyncFn = jest.fn().mockReturnValue(promise);
    
    const { result } = renderHook(() => useAsync(mockAsyncFn));
    
    // Should be loading
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    
    // Resolve the promise
    await act(async () => {
      resolvePromise!('resolved');
      await promise;
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toBe('resolved');
  });
  
  it('should re-execute when dependencies change', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue('test');
    let dependency = 'dep1';
    
    const { rerender } = renderHook(
      ({ dep }) => useAsync(() => mockAsyncFn(dep), [dep]),
      { initialProps: { dep: dependency } }
    );
    
    await waitFor(() => {
      expect(mockAsyncFn).toHaveBeenCalledWith('dep1');
    });
    
    // Change dependency
    dependency = 'dep2';
    rerender({ dep: dependency });
    
    await waitFor(() => {
      expect(mockAsyncFn).toHaveBeenCalledWith('dep2');
    });
    
    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
  });
});

