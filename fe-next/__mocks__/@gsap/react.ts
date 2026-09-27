import { useEffect } from 'react';

export const useGSAP = (callback: () => void, _deps?: unknown) => {
  useEffect(() => {
    callback();
  }, []);
};

export default { useGSAP };
