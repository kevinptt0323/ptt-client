export default interface Config {
  name: string;
  url: string;
  charset: string;
  origin: string;
  protocol: string;
  timeout: number;
  blobSize: number;
  preventIdleTimeout: number;
  terminal: {
    columns: number;
    rows: number;
  };
  [key: string]: any;
}
