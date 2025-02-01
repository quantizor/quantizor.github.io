type TextureLoadMessage = {
  url: string;
  repeat?: { x: number; y: number };
};

self.onmessage = async (e: MessageEvent<TextureLoadMessage>) => {
  try {
    const { url, repeat } = e.data;
    
    // Fetch the image
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Convert to ImageBitmap
    const imageBitmap = await createImageBitmap(blob);
    
    // Send back the ImageBitmap and metadata
    self.postMessage({
      success: true,
      imageBitmap,
      url,
      repeat
    }, { transfer: [imageBitmap] }); // Transfer the ImageBitmap
  } catch (error) {
    self.postMessage({
      success: false,
      url: e.data.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
