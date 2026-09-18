import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export async function isBiometricAvailable(): Promise<{ available: boolean; type: BiometryType | null }> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, type: biometryType ?? null };
  } catch {
    return { available: false, type: null };
  }
}

export async function promptBiometric(title: string): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: title,
      cancelButtonText: 'Cancel',
    });
    return success;
  } catch {
    return false;
  }
}

export async function biometricKeysExist(): Promise<boolean> {
  try {
    const { keysExist } = await rnBiometrics.biometricKeysExist();
    return keysExist;
  } catch {
    return false;
  }
}

export async function createBiometricKeys(): Promise<string | null> {
  try {
    const { publicKey } = await rnBiometrics.createKeys();
    return publicKey;
  } catch {
    return null;
  }
}

export async function deleteBiometricKeys(): Promise<boolean> {
  try {
    const { keysDeleted } = await rnBiometrics.deleteKeys();
    return keysDeleted;
  } catch {
    return false;
  }
}

export function biometryLabel(type: BiometryType | null): string {
  switch (type) {
    case 'TouchID':
      return 'Touch ID';
    case 'FaceID':
      return 'Face ID';
    case 'Biometrics':
      return 'Biometrics';
    default:
      return 'Fingerprint';
  }
}
