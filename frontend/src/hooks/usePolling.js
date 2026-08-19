import { useEffect, useRef } from 'react';

/**
 * usePolling — calls `callback` immediately and then every `interval` ms.
 * Cleans up on unmount. Does NOT cause re-render loops.
 *
 * @param {Function} callback  Async-safe function to call
 * @param {number}   interval  Milliseconds between polls (default 30 000)
 * @param {boolean}  enabled   Set to false to pause polling
 */
export function usePolling(callback, interval = 30000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    // Fire immediately
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
