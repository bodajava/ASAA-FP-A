import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // Fallback for local dev mode
    return Buffer.from('harvest-local-dev-key-32-chars!!!!!', 'utf-8').slice(
      0,
      32,
    );
  }
  return Buffer.from(key, 'hex').length === 32
    ? Buffer.from(key, 'hex')
    : Buffer.from(key.padEnd(32, '0'), 'utf-8').slice(0, 32);
}

function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptApiKey(encryptedKey: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedKey.split(':');
  if (!ivHex || !encrypted) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '****';
  return `****${apiKey.slice(-4)}`;
}

@Injectable()
export class AiSettingsService {
  private readonly logger = new Logger(AiSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(companyId: bigint) {
    try {
      const row = await this.prisma.$queryRawUnsafe<
        { api_key_encrypted: string; model: string; is_enabled: boolean }[]
      >(
        `SELECT api_key_encrypted, model, is_enabled FROM ai_settings WHERE company_id = ? LIMIT 1`,
        companyId,
      );

      if (row.length === 0) {
        return {
          provider: 'google_gemini',
          apiKeyMasked: '',
          model: 'gemini-2.5-flash-lite',
          isEnabled: false,
          configured: false,
        };
      }

      const r = row[0];
      return {
        provider: 'google_gemini',
        apiKeyMasked: maskApiKey(decryptApiKey(r.api_key_encrypted)),
        model: r.model || 'gemini-2.5-flash-lite',
        isEnabled: r.is_enabled,
        configured: true,
      };
    } catch {
      return {
        provider: 'google_gemini',
        apiKeyMasked: '',
        model: 'gemini-2.5-flash-lite',
        isEnabled: false,
        configured: false,
      };
    }
  }

  async updateSettings(companyId: bigint, dto: UpdateAiSettingsDto) {
    const encryptedKey = encryptApiKey(dto.apiKey);

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ai_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          company_id BIGINT NOT NULL,
          provider VARCHAR(100) NOT NULL DEFAULT 'google_gemini',
          api_key_encrypted TEXT NOT NULL,
          model VARCHAR(100) DEFAULT 'gemini-2.5-flash-lite',
          is_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_company (company_id)
        )
      `);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO ai_settings (company_id, provider, api_key_encrypted, model, is_enabled)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE api_key_encrypted = VALUES(api_key_encrypted), model = VALUES(model), is_enabled = VALUES(is_enabled), updated_at = CURRENT_TIMESTAMP`,
        companyId,
        dto.provider,
        encryptedKey,
        dto.model || 'gemini-2.5-flash-lite',
        dto.isEnabled !== false,
      );

      this.logger.log(
        `AI settings updated for company ${companyId.toString()}`,
      );

      return {
        success: true,
        message: 'AI settings saved successfully',
        apiKeyMasked: maskApiKey(dto.apiKey),
      };
    } catch (error) {
      this.logger.error(
        `Failed to save AI settings: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        success: false,
        message: 'Failed to save AI settings',
      };
    }
  }

  async getApiKeyForCompany(companyId: bigint): Promise<string | null> {
    // First check env fallback
    if (
      process.env.ALLOW_ENV_GEMINI_FALLBACK === 'true' &&
      process.env.GEMINI_API_KEY
    ) {
      return process.env.GEMINI_API_KEY;
    }

    try {
      const row = await this.prisma.$queryRawUnsafe<
        { api_key_encrypted: string; is_enabled: boolean }[]
      >(
        `SELECT api_key_encrypted, is_enabled FROM ai_settings WHERE company_id = ? AND is_enabled = true LIMIT 1`,
        companyId,
      );

      if (row.length === 0) return null;
      return decryptApiKey(row[0].api_key_encrypted);
    } catch {
      return null;
    }
  }
}
