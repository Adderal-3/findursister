declare global {
  type DsResult = {
    code?: number;
    result?: Record<string, unknown>;
  };

  type DsLoginInstance = {
    hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>;
    show(): void;
  };

  type DsNavigationInstance = {
    ready(): Promise<unknown>;
    setTheme?(theme: 'white' | 'black'): void;
  };

  type DsNavigationConstructor = new (options: {
    title: string;
    hideTitle: boolean;
    statusBarStyle: 'white' | 'black';
    closeClick: () => void;
    menuClick: () => void;
    changeVisable: () => void;
  }) => DsNavigationInstance;

  interface Window {
    DA_SQUARE_ID?: string;
    DA_GROUP_ID?: string;
    DA_PROJECT_ID?: string;
    ns?: (command: string, payload?: unknown) => void;
    ds?: {
      isGodlike: boolean;
      ready(): Promise<void>;
      callHandler(name: string, payload?: Record<string, unknown>): Promise<DsResult>;
    };
    DsUlink?: new (env: 'production') => {
      initTraceInstall(): void;
      open(options: {
        params: { action: string; squareId: string; url: string };
        traceData: { event: { eventAction: string; eventValue: string } };
      }): void;
    };
    dsUlink?: InstanceType<NonNullable<Window['DsUlink']>>;
    onDsUlinkReady?: (callback: (error: unknown) => void) => void;
    MobileShare?: new (options: { imgUrl: string; title: string; desc: string }) => object;
    onMobileShareReady?: (callback: (error: unknown) => void) => void;
    Ulogin?: { default: new (options: {
      env: 'production';
      loginSuccess: () => void;
      loginFail: () => void;
    }) => DsLoginInstance };
    dsLogin?: DsLoginInstance;
    wx?: {
      miniProgram: {
        navigateTo(options: { url: string }): void;
        postMessage(options: { data: Record<string, unknown> }): void;
      };
    };
    DsNavigationMiniProgramBar?: DsNavigationConstructor | { default: DsNavigationConstructor };
    DsActSdk?: {
      configure(options: {
        production: { actId?: string; appKey: string; frontId?: string };
      }): void;
      TaskModule: {
        evoke(options: { container: string; title?: string; showRole?: boolean }): void;
      };
      Role: {
        evoke(options: {
          container: string;
          placeholder?: string;
          onClick?: () => void;
        }): { unmount(): void };
      };
      dsActStore: { set(key: unknown, value: boolean): void };
      taskListPopupState: unknown;
    };
    MiniGameDataSdk?: {
      RequestManager: {
        setGameId(options: { devMiniGameId: string; proMiniGameId: string }): void;
        obfuscatedBatchWriteData(options: {
          items: Array<{ recordKey: string; value: number | string | boolean }>;
        }): Promise<{
          items: Array<{ recordKey: string; success: boolean; errorMsg?: string }>;
        }>;
        getBillboardRank(options: {
          devBillboardId: string;
          proBillboardId: string;
          page?: number;
          pageSize?: number;
        }): Promise<{
          total: number;
          records: Array<{
            rank: number;
            uid: string;
            nick: string;
            icon: string;
            num: number;
            ts: number;
          }>;
        }>;
        getUserRank(options: {
          devBillboardId: string;
          proBillboardId: string;
        }): Promise<{
          rank: number;
          total: number;
          uid: string;
          nick: string;
          icon: string;
          num: number;
        }>;
      };
    };
  }
}

export {};
