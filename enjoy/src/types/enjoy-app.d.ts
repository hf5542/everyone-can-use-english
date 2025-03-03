type EnjoyAppType = {
  app: {
    reset: () => Promise<void>;
    resetSettings: () => Promise<void>;
    relaunch: () => Promise<void>;
    reload: () => Promise<void>;
    isPackaged: () => Promise<boolean>;
    apiUrl: () => Promise<string>;
    quit: () => Promise<void>;
    openDevTools: () => Promise<void>;
    createIssue: (title: string, body: string) => Promise<void>;
    version: string;
  };
  system: {
    preferences: {
      mediaAccess: (mediaType: "microphone") => Promise<boolean>;
    };
    proxy: {
      get: () => Promise<ProxyConfigType>;
      set: (config: ProxyConfigType) => Promise<void>;
    };
  };
  providers: {
    audible: {
      bestsellers: (params?: {
        page?: number;
        category?: number;
        pageSize?: number;
      }) => Promise<{
        books: AudibleBookType[];
        page: number;
        nextPage: number | undefined;
      }>;
    };
    ted: {
      talks: () => Promise<TedTalkType[]>;
      ideas: () => Promise<TedIdeaType[]>;
      downloadTalk: (url: string) => Promise<{ audio: string; video: string }>;
    };
  };
  view: {
    load: (
      url: string,
      bounds?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      },
      options?: {
        navigatable?: boolean;
      }
    ) => Promise<void>;
    show: (bounds: any) => Promise<void>;
    hide: () => Promise<void>;
    remove: () => Promise<void>;
    scrape: (url: string) => Promise<void>;
    onViewState: (
      callback: (
        event,
        state: { state: string; error?: string; url?: string; html?: string }
      ) => void
    ) => void;
    removeViewStateListeners: () => void;
  };
  onNotification: (
    callback: (event, notification: NotificationType) => void
  ) => void;
  shell: {
    openExternal: (url: string) => Promise<void>;
    openPath: (path: string) => Promise<void>;
  };
  dialog: {
    showOpenDialog: (
      options: Electron.OpenDialogOptions
    ) => Promise<string[] | undefined>;
    showSaveDialog: (
      options: Electron.SaveDialogOptions
    ) => Promise<Electron.SaveDialogReturnValue>;
    showMessageBox: (
      options: Electron.MessageBoxOptions
    ) => Promise<Electron.MessageBoxReturnValue>;
    showErrorBox: (title: string, content: string) => Promise<void>;
  };
  settings: {
    getLibrary: () => Promise<string>;
    setLibrary: (library: string) => Promise<void>;
    getUser: () => Promise<UserType>;
    setUser: (user: UserType) => Promise<void>;
    getUserDataPath: () => Promise<string>;
    getDefaultEngine: () => Promise<string>;
    setDefaultEngine: (engine: "enjoyai" | "openai") => Promise<void>;
    getLlm: (provider: SupportedLlmProviderType) => Promise<LlmProviderType>;
    setLlm: (
      provider: SupportedLlmProviderType,
      LlmProviderType
    ) => Promise<void>;
    getLanguage: () => Promise<string>;
    switchLanguage: (language: string) => Promise<void>;
  };
  fs: {
    ensureDir: (path: string) => Promise<boolean>;
  };
  path: {
    join: (...paths: string[]) => Promise<string>;
  };
  db: {
    init: () => Promise<DbState>;
    onTransaction: (
      callback: (event, state: TransactionStateType) => void
    ) => Promise<void>;
    removeListeners: () => Promise<void>;
  };
  audios: {
    findAll: (params: any) => Promise<AudioType[]>;
    findOne: (params: any) => Promise<AudioType>;
    create: (uri: string, params?: any) => Promise<AudioType>;
    update: (id: string, params: any) => Promise<AudioType | undefined>;
    destroy: (id: string) => Promise<undefined>;
    upload: (id: string) => Promise<void>;
  };
  videos: {
    findAll: (params: any) => Promise<VideoType[]>;
    findOne: (params: any) => Promise<VideoType>;
    create: (uri: string, params?: any) => Promise<VideoType>;
    update: (id: string, params: any) => Promise<VideoType | undefined>;
    destroy: (id: string) => Promise<undefined>;
    upload: (id: string) => Promise<void>;
  };
  recordings: {
    findAll: (where: any) => Promise<RecordingType[]>;
    findOne: (where: any) => Promise<RecordingType>;
    syncAll: () => Promise<void>;
    create: (params: any) => Promise<RecordingType>;
    update: (id: string, params: any) => Promise<RecordingType | undefined>;
    destroy: (id: string) => Promise<void>;
    upload: (id: string) => Promise<void>;
    assess: (id: string) => Promise<void>;
    stats: (params: { from: string; to: string }) => Promise<{
      count: number;
      duration: number;
    }>;
    groupByDate: (params: { from: string; to: string }) => Promise<
      {
        date: string;
        count: number;
        level?: number;
      }[]
    >;
    groupByTarget: (params: { from: string; to: string }) => Promise<
      {
        date: string;
        targetId: string;
        targetType: string;
        count: number;
        duration: number;
        target: AudioType | VideoType;
      }[]
    >;
    groupBySegment: (
      targetId: string,
      targetType
    ) => Promise<SegementRecordingStatsType>;
  };
  conversations: {
    findAll: (params: any) => Promise<ConversationType[]>;
    findOne: (params: any) => Promise<ConversationType>;
    create: (params: any) => Promise<ConversationType>;
    update: (id: string, params: any) => Promise<ConversationType>;
    destroy: (id: string) => Promise<void>;
    ask: (
      id: string,
      params: {
        messageId?: string;
        content?: string;
        file?: string;
        blob?: {
          type: string;
          arrayBuffer: ArrayBuffer;
        };
      }
    ) => Promise<MessageType[]>;
  };
  messages: {
    findAll: (params: any) => Promise<MessageType[]>;
    findOne: (where: any) => Promise<MessageType>;
    createInBatch: (messages: Partial<MessageType>[]) => Promise<void>;
    destroy: (id: string) => Promise<void>;
    createSpeech: (id: string, configuration?: any) => Promise<SpeechType>;
  };
  speeches: {
    create: (
      params: {
        sourceId: string;
        sourceType: string;
        text: string;
        configuration: {
          engine: string;
          model: string;
          voice: string;
        };
      },
      blob: {
        type: string;
        arrayBuffer: ArrayBuffer;
      }
    ) => Promise<SpeechType>;
  };
  echogarden: {
    align: (
      input: string | Uint8Array,
      transcript: string,
      options?: any
    ) => Promise<AlignmentResult>;
    check: () => Promise<boolean>;
  };
  whisper: {
    config: () => Promise<WhisperConfigType>;
    check: () => Promise<{ success: boolean; log: string }>;
    setModel: (model: string) => Promise<WhisperConfigType>;
    setService: (
      service: WhisperConfigType["service"]
    ) => Promise<WhisperConfigType>;
    transcribe: (
      params: {
        file?: string;
        blob?: { type: string; arrayBuffer: ArrayBuffer };
      },
      options?: {
        force?: boolean;
        extra?: string[];
      }
    ) => Promise<Partial<WhisperOutputType>>;
    onProgress: (callback: (event, progress: number) => void) => void;
    removeProgressListeners: () => Promise<void>;
  };
  ffmpeg: {
    check: () => Promise<boolean>;
    transcode: (
      input: string,
      output: string,
      options?: string[]
    ) => Promise<string>;
  };
  download: {
    onState: (callback: (event, state) => void) => void;
    start: (url: string, savePath?: string) => void;
    cancel: (filename: string) => Promise<void>;
    cancelAll: () => void;
    dashboard: () => Promise<DownloadStateType[]>;
    removeAllListeners: () => void;
  };
  cacheObjects: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    writeFile: (filename: string, data: ArrayBuffer) => Promise<string>;
  };
  transcriptions: {
    findOrCreate: (params: any) => Promise<TranscriptionType>;
    update: (id: string, params: any) => Promise<void>;
  };
  waveforms: {
    find: (id: string) => Promise<WaveFormDataType>;
    save: (id: string, data: WaveFormDataType) => Promise<void>;
  };
};
