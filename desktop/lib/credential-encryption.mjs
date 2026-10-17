// Encrypts the ChatGPT connection at rest with the operating system's own protection
// (Windows: DPAPI, macOS: Keychain, Linux: the desktop keyring). Main process only.
export function createCredentialEncryption(safeStorage, isReady, platform = process.platform) {
  const LINUX_KEYRINGS = ['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'];
  const isAvailable = () => {
    if (!isReady() || !safeStorage.isEncryptionAvailable()) return false;
    // Without a real keyring, Electron on Linux falls back to a fixed key: refuse it.
    return platform !== 'linux' || LINUX_KEYRINGS.includes(safeStorage.getSelectedStorageBackend());
  };
  const need = () => { if (!isAvailable()) throw new Error('Le chiffrement du système est indisponible.'); };
  return {
    id: 'electron-safe-storage-v1',
    isAvailable,
    encrypt(plaintext) { need(); return safeStorage.encryptString(plaintext); },
    decrypt(ciphertext) { need(); return safeStorage.decryptString(Buffer.from(ciphertext)); },
  };
}
