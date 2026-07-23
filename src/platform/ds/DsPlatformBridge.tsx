import { useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { dsTaskPanelEnabled } from './config';
import { initDsPlatform, openTaskPanel } from './runtime';

export function DsPlatformBridge() {
  useEffect(() => {
    void initDsPlatform();
  }, []);

  return (
    <>
      <div id="ds-task-root" />
      {dsTaskPanelEnabled && (
        <button
          type="button"
          onClick={openTaskPanel}
          className="fixed right-3 z-50 flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur [top:max(0.75rem,env(safe-area-inset-top))]"
          aria-label="打开大神任务面板"
        >
          <ClipboardList className="h-4 w-4" />
          任务
        </button>
      )}
    </>
  );
}
