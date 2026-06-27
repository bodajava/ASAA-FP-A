import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let url = process.env.DATABASE_URL!;
    if (url && url.startsWith('"') && url.endsWith('"')) {
      url = url.slice(1, -1);
    }
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('allowPublicKeyRetrieval')) {
      urlObj.searchParams.set('allowPublicKeyRetrieval', 'true');
    }
    const currentLimit = parseInt(urlObj.searchParams.get('connectionLimit') || '10', 10);
    if (currentLimit < 3) {
      urlObj.searchParams.set('connectionLimit', '5');
    }
    url = urlObj.toString();
    console.log(
      'Using database URL:',
      url ? url.replace(/:[^@]+@/, ':***@') : 'undefined',
    );
    const adapter = new PrismaMariaDb(url, { useTextProtocol: true });
    super({ adapter });
  }

  async onModuleInit() {
    this.logger.log('PrismaService initializing...');
    const isProduction = process.env.NODE_ENV === 'production';
    const forceDeploy = process.env.DEPLOY_VIEWS === 'true';

    if (forceDeploy || (!isProduction && process.env.DEPLOY_VIEWS !== 'false')) {
      this.logger.log('Deploying database views...');
      await this.ensureViewsCreated();
    } else {
      this.logger.log('Skipping database view deployment (production or disabled).');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureViewsCreated(): Promise<void> {
    try {
      const viewsPath = path.resolve(
        __dirname,
        '../prisma/migrations/views.sql',
      );
      if (!fs.existsSync(viewsPath)) {
        // Try alternate path
        const altPath = path.resolve(
          process.cwd(),
          'prisma/migrations/views.sql',
        );
        if (!fs.existsSync(altPath)) {
          this.logger.warn('views.sql not found, skipping view creation');
          return;
        }
        await this.executeSqlFile(altPath);
        return;
      }
      await this.executeSqlFile(viewsPath);
    } catch (err) {
      this.logger.error('Failed to create database views', err);
    }
  }

  private async executeSqlFile(filePath: string): Promise<void> {
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    // Split by semicolons and filter out empty/comment lines
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 0 &&
          (s.includes('CREATE') || s.includes('SELECT') || s.includes('DROP')),
      );

    let created = 0;
    for (const statement of statements) {
      try {
        await this.$executeRawUnsafe(statement);
        created++;
      } catch (err) {
        this.logger.warn(
          `View statement failed (ignored): ${(err as Error)?.message?.slice(0, 120)}`,
        );
      }
    }
    this.logger.log(`Database views: ${created} created/updated successfully`);
  }
}
