import { useEffect } from "react";

export function useMountFetch(fetchFn, deps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(fetchFn, 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
