import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export interface PickedImage {
  uri: string;
  name?: string;
  type?: string;
  width?: number;
  height?: number;
}

function toPicked(asset: { uri?: string; fileName?: string; type?: string; width?: number; height?: number } | undefined): PickedImage | null {
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo_${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
    width: asset.width,
    height: asset.height,
  };
}

export async function pickProfilePhoto(source: 'library' | 'camera'): Promise<PickedImage | null> {
  const baseOptions = {
    mediaType: 'photo',
    includeBase64: false,
    selectionLimit: 1,
    quality: 0.8,
    maxWidth: 512,
    maxHeight: 512,
  } as const;

  const result =
    source === 'camera'
      ? await launchCamera({ ...baseOptions, saveToPhotos: false })
      : await launchImageLibrary(baseOptions);

  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? `Image pick failed (${result.errorCode}).`);
  }
  return toPicked(result.assets?.[0]);
}