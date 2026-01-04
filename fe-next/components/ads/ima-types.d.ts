/**
 * Google IMA SDK Type Declarations
 * @see https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side
 */

declare namespace google.ima {
  // View modes for ad display
  enum ViewMode {
    NORMAL = 'normal',
    FULLSCREEN = 'fullscreen',
  }

  // Ad event types
  namespace AdEvent {
    enum Type {
      // Ad lifecycle events
      LOADED = 'loaded',
      STARTED = 'started',
      FIRST_QUARTILE = 'firstQuartile',
      MIDPOINT = 'midpoint',
      THIRD_QUARTILE = 'thirdQuartile',
      COMPLETE = 'complete',
      ALL_ADS_COMPLETED = 'allAdsCompleted',

      // User interaction events
      CLICK = 'click',
      PAUSED = 'pause',
      RESUMED = 'resume',
      SKIPPED = 'skip',
      USER_CLOSE = 'userClose',

      // Other events
      IMPRESSION = 'impression',
      VOLUME_CHANGED = 'volumeChange',
      VOLUME_MUTED = 'mute',
      LOG = 'log',
      CONTENT_PAUSE_REQUESTED = 'contentPauseRequested',
      CONTENT_RESUME_REQUESTED = 'contentResumeRequested',
    }
  }

  // Ad event interface
  interface AdEvent {
    type: AdEvent.Type;
    getAd(): Ad | null;
    getAdData(): Record<string, unknown>;
  }

  // Ad interface
  interface Ad {
    getAdId(): string;
    getTitle(): string;
    getDuration(): number;
    getSkipTimeOffset(): number;
    isLinear(): boolean;
    isSkippable(): boolean;
    getWidth(): number;
    getHeight(): number;
  }

  // Ad error event
  interface AdErrorEvent {
    getError(): AdError;
    getUserRequestContext(): unknown;
  }

  // Ad error interface
  interface AdError {
    getErrorCode(): number;
    getMessage(): string;
    getType(): string;
    getVastErrorCode(): number;
    getInnerError(): Error | null;
  }

  // AdsManager loaded event
  interface AdsManagerLoadedEvent {
    getAdsManager(
      contentPlayback: { currentTime: number; duration: number },
      adsRenderingSettings?: AdsRenderingSettings
    ): AdsManager;
  }

  // Ads rendering settings
  interface AdsRenderingSettings {
    restoreCustomPlaybackStateOnAdBreakComplete?: boolean;
    enablePreloading?: boolean;
    uiElements?: string[];
    autoAlign?: boolean;
    loadVideoTimeout?: number;
    bitrate?: number;
  }

  // Ad display container
  class AdDisplayContainer {
    constructor(
      container: HTMLElement,
      videoElement?: HTMLVideoElement,
      clickTrackingElement?: HTMLElement
    );
    initialize(): void;
    destroy(): void;
  }

  // Ads loader
  class AdsLoader {
    constructor(adDisplayContainer: AdDisplayContainer);
    addEventListener(
      event: 'adsManagerLoaded' | 'adError',
      handler: (event: AdsManagerLoadedEvent | AdErrorEvent) => void,
      useCapture?: boolean,
      handlerScope?: unknown
    ): void;
    removeEventListener(
      event: 'adsManagerLoaded' | 'adError',
      handler: (event: AdsManagerLoadedEvent | AdErrorEvent) => void
    ): void;
    requestAds(adsRequest: AdsRequest): void;
    contentComplete(): void;
    destroy(): void;
  }

  // Ads request
  class AdsRequest {
    adTagUrl: string;
    linearAdSlotWidth: number;
    linearAdSlotHeight: number;
    nonLinearAdSlotWidth: number;
    nonLinearAdSlotHeight: number;
    forceNonLinearFullSlot?: boolean;
    vastLoadTimeout?: number;
  }

  // Ads manager
  interface AdsManager {
    addEventListener(
      event: AdEvent.Type | 'adError',
      handler: (event: AdEvent | AdErrorEvent) => void,
      useCapture?: boolean,
      handlerScope?: unknown
    ): void;
    removeEventListener(
      event: AdEvent.Type | 'adError',
      handler: (event: AdEvent | AdErrorEvent) => void
    ): void;
    init(width: number, height: number, viewMode: ViewMode): void;
    start(): void;
    pause(): void;
    resume(): void;
    skip(): void;
    stop(): void;
    destroy(): void;
    resize(width: number, height: number, viewMode: ViewMode): void;
    setVolume(volume: number): void;
    getVolume(): number;
    getRemainingTime(): number;
    getCuePoints(): number[];
    isCustomClickTrackingUsed(): boolean;
    isCustomPlaybackUsed(): boolean;
  }

  // Settings
  namespace settings {
    function setVpaidMode(mode: ImaSdkSettings.VpaidMode): void;
    function setLocale(locale: string): void;
    function setNumRedirects(numRedirects: number): void;
    function setPlayerType(playerType: string): void;
    function setPlayerVersion(playerVersion: string): void;
    function setAutoPlayAdBreaks(autoPlayAdBreaks: boolean): void;
  }

  namespace ImaSdkSettings {
    enum VpaidMode {
      DISABLED = 0,
      ENABLED = 1,
      INSECURE = 2,
    }
  }
}

// Extend Window interface
declare global {
  interface Window {
    google?: {
      ima: typeof google.ima;
    };
  }
}

export {};
