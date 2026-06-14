import { encrypt, decrypt } from './crypto.util';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-for-testing!!';
});

describe('CryptoUtil', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const text = 'my-secret-password-123';
    const encrypted = encrypt(text);
    expect(encrypted).not.toBe(text);
    expect(encrypted).toContain(':');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it('should return empty string for empty inputs', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('should handle invalid ciphertext gracefully', () => {
    expect(decrypt('invalid_ciphertext')).toBe('invalid_ciphertext');
    expect(decrypt('invalid:ciphertext')).toBe('');
  });
});
