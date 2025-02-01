import * as THREE from 'three';

export class WorkerTextureLoader {
  private worker: Worker;
  private loadingPromises: Map<string, {
    resolve: (texture: THREE.Texture) => void;
    reject: (error: any) => void;
  }>;

  constructor() {
    this.worker = new Worker(new URL('../workers/textureLoader', import.meta.url), {
      type: 'module'
    });
    this.loadingPromises = new Map();

    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { success, url, imageBitmap, error, repeat } = event.data;
    const promise = this.loadingPromises.get(url);
    
    if (!promise) return;
    
    if (success) {
      const texture = new THREE.Texture(imageBitmap);
      
      if (repeat) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat.x, repeat.y);
      }
      
      texture.needsUpdate = true;
      promise.resolve(texture);
    } else {
      promise.reject(new Error(error));
    }
    
    this.loadingPromises.delete(url);
  }

  loadTexture(url: string, repeat?: { x: number; y: number }): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.loadingPromises.set(url, { resolve, reject });
      this.worker.postMessage({ url, repeat });
    });
  }

  dispose() {
    this.worker.terminate();
    this.loadingPromises.clear();
  }
}
