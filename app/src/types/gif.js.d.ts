declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    repeat?: number;
    transparent?: string | null;
    dither?: boolean;
    debug?: boolean;
  }

  interface GIFFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options: GIFOptions);
    addFrame(imageElement: CanvasImageSource, options?: GIFFrameOptions): void;
    render(): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "error", callback: (error: Error) => void): void;
    on(event: "progress", callback: (progress: number) => void): void;
  }

  export default GIF;
}
