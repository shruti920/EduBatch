import { useEffect, useState } from "react";
import { errorMessage } from "../utils/format";

/**
 * Runs `fetcher` whenever `key` changes (or reload() is called).
 * Previous data stays visible while a refetch is in flight, so tables don't flash.
 */
export const useApi = (fetcher, key = "") => {
  const [nonce, setNonce] = useState(0);
  const requestKey = `${key}|${nonce}`;
  const [state, setState] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => active && setState({ key: requestKey, data, error: "" }))
      .catch((err) => active && setState((prev) => ({ ...prev, key: requestKey, error: errorMessage(err) })));
    return () => {
      active = false;
    };
    // `fetcher` is recreated every render; `requestKey` is what decides a refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== requestKey,
    reload: () => setNonce((n) => n + 1),
  };
};

export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};
