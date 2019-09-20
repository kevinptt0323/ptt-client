export {};

declare global {
  namespace NodeJS {
    interface Global {
        WebSocket: any;
    }
  }
}

