import { useEffect } from 'react';
import { initDsPlatform } from './runtime';

export function DsPlatformBridge() {
  useEffect(() => {
    void initDsPlatform();
  }, []);

  return <div id="ds-task-root" />;
}
