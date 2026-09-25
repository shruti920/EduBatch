import { useEffect, useState } from "react";
import { errorMessage } from "../utils/format";


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
