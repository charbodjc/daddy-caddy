// Global type declarations for external modules and environment

// Detox types
declare module 'detox' {
  export interface DetoxConfig {
    configurations: Record<string, unknown>;
  }
  
  export const device: {
    launchApp: (config?: object) => Promise<void>;
    reloadReactNative: () => Promise<void>;
    terminateApp: () => Promise<void>;
    sendToHome: () => Promise<void>;
    openURL: (url: { url: string }) => Promise<void>;
  };
  
  export const element: (matcher: Matcher) => Element;
  export const by: {
    id: (id: string) => Matcher;
    text: (text: string) => Matcher;
    label: (label: string) => Matcher;
    type: (type: string) => Matcher;
  };
  
  export const waitFor: (element: Element) => Waiter;
  
  export interface Matcher {
    _call: () => unknown;
  }
  
  export interface Element {
    tap: () => Promise<void>;
    typeText: (text: string) => Promise<void>;
    clearText: () => Promise<void>;
    replaceText: (text: string) => Promise<void>;
    scroll: (pixels: number, direction: string) => Promise<void>;
    scrollTo: (edge: string) => Promise<void>;
    swipe: (direction: string, speed?: string, percentage?: number) => Promise<void>;
  }
  
  export interface Waiter {
    toBeVisible: () => Promise<void>;
    toExist: () => Promise<void>;
    toBeNotVisible: () => Promise<void>;
    toNotExist: () => Promise<void>;
    withTimeout: (timeout: number) => Waiter;
  }
}

// OpenAI types (simplified)
declare class OpenAI {
  constructor(config: { apiKey: string });
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }) => Promise<{
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      }>;
    };
  };
}

// __DEV__ environment variable
declare const __DEV__: boolean;

