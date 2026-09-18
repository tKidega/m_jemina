import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

let cachedModel: string | null = null;

export async function getDeviceModel(): Promise<string> {
  if (cachedModel) {
    return cachedModel;
  }
  try {
    const [model, brand] = await Promise.all([
      DeviceInfo.getModel(),
      DeviceInfo.getBrand(),
    ]);
    const name = `${brand} ${model}`.trim();
    cachedModel = name || fallbackDeviceName();
    return cachedModel;
  } catch {
    cachedModel = fallbackDeviceName();
    return cachedModel;
  }
}

export function fallbackDeviceName(): string {
  if (Platform.OS === 'android') {
    return `Android Device`;
  }
  return `iOS Device`;
}

export function getDeviceDescriptor(): string {
  return Platform.OS === 'android' ? 'Android' : 'iOS';
}
