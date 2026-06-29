import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as XLSX from 'xlsx';
import { AppModule } from '../app.module';
import { json, urlencoded } from 'express';

describe('Import/Export Pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  /* ─── Helpers ──────────────────────────────────────────────────────── */

  function createCsvBuffer(headers: string[], rows: string[][]): Buffer {
    const lines = [headers.join(','), ...rows.map(r => r.join(','))];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  function createXlsxBuffer(
    headers: string[],
    rows: string[][],
  ): Buffer {
    const wb = XLSX.utils.book_new();
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  function toBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /* ─── Issue 2: .numbers Rejection ──────────────────────────────────── */

  describe('File Extension Rejection', () => {
    it('should reject .numbers files', async () => {
      const buffer = Buffer.from('fake numbers content');
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'test.numbers',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('.numbers');
      expect(res.body.message).toContain('not supported');
    });

    it('should reject unknown file extensions', async () => {
      const buffer = Buffer.from('fake content');
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'test.pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not supported');
    });
  });

  /* ─── Issue 5: Empty Template Detection ────────────────────────────── */

  describe('Empty Template Detection', () => {
    it('should reject CSV with only headers (no data rows)', async () => {
      const buffer = createCsvBuffer(['name', 'type'], []);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'empty.csv',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('no data');
    });

    it('should reject empty buffer', async () => {
      const base64 = toBase64(Buffer.alloc(0));

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'empty.csv',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('empty');
    });
  });

  /* ─── Issue 4: Preview Summary ─────────────────────────────────────── */

  describe('Preview Summary', () => {
    it('should return summary with totalRows, validRows, invalidRows', async () => {
      const rows = [
        ['Cairo Factory', 'factory'],
        ['Invalid Site', ''],
      ];
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'sites.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('rows');
      expect(res.body.summary.totalRows).toBe(2);
      expect(typeof res.body.summary.validRows).toBe('number');
      expect(typeof res.body.summary.invalidRows).toBe('number');
      expect(Array.isArray(res.body.rows)).toBe(true);
    });
  });

  /* ─── CSV Upload ───────────────────────────────────────────────────── */

  describe('CSV Upload', () => {
    it('should parse valid CSV for sites module', async () => {
      const rows = [['Cairo Factory', 'factory']];
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'sites.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRows).toBe(1);
      expect(res.body.rows.length).toBe(1);
    });

    it('should parse valid CSV for accounts module', async () => {
      const rows = [['4000', 'Revenue', 'revenue']];
      const buffer = createCsvBuffer(['code', 'name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'accounts',
          fileContent: base64,
          fileName: 'accounts.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRows).toBe(1);
    });
  });

  /* ─── XLSX Upload ──────────────────────────────────────────────────── */

  describe('XLSX Upload', () => {
    it('should parse valid XLSX for sites module', async () => {
      const rows = [['Cairo Factory', 'factory']];
      const buffer = createXlsxBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'sites.xlsx',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRows).toBe(1);
    });
  });

  /* ─── Large File ───────────────────────────────────────────────────── */

  describe('Large File Handling', () => {
    it('should handle a file with 100 rows', async () => {
      const rows: string[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([`Site ${i}`, 'factory']);
      }
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'large_sites.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRows).toBe(100);
    });
  });

  /* ─── Export/Download ──────────────────────────────────────────────── */

  describe('Template Download', () => {
    it('should download sites template as XLSX', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/imports/sample/sites')
        .set('x-company-id', '1');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('sites_template.xlsx');
      expect(res.headers['content-length']).toBeDefined();
    });

    it('should download accounts template as XLSX', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/imports/sample/accounts')
        .set('x-company-id', '1');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain('accounts_template.xlsx');
    });

    it('should return 400 for unknown module', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/imports/sample/nonexistent')
        .set('x-company-id', '1');

      expect(res.status).toBe(400);
    });
  });

  /* ─── Validation Errors ────────────────────────────────────────────── */

  describe('Validation Errors', () => {
    it('should return validation errors for missing required fields', async () => {
      const rows = [['', '']];
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'invalid.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.invalidRows).toBeGreaterThan(0);
      expect(res.body.rows[0].isValid).toBe(false);
      expect(res.body.rows[0].errors.length).toBeGreaterThan(0);
    });

    it('should report per-row errors with row numbers', async () => {
      const rows = [
        ['Valid Site', 'factory'],
        ['', ''],
      ];
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      const res = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'mixed.csv',
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.totalRows).toBe(2);
      expect(res.body.rows[0].isValid).toBe(true);
      expect(res.body.rows[1].isValid).toBe(false);
      expect(res.body.rows[1].errors.length).toBeGreaterThan(0);
    });
  });

  /* ─── Successful Import Flow ───────────────────────────────────────── */

  describe('Full Import Flow', () => {
    it('should preview then commit valid rows', async () => {
      const rows = [['Test Site Import', 'factory']];
      const buffer = createCsvBuffer(['name', 'type'], rows);
      const base64 = toBase64(buffer);

      // Step 1: Preview
      const previewRes = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          fileContent: base64,
          fileName: 'test_import.csv',
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.summary.validRows).toBe(1);

      // Step 2: Commit
      const validRows = previewRes.body.rows
        .filter((r: { isValid: boolean }) => r.isValid)
        .map((r: { data: Record<string, unknown> }) => r.data);

      const commitRes = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set('x-company-id', '1')
        .send({
          module: 'sites',
          rows: validRows,
        });

      expect(commitRes.status).toBe(200);
      expect(commitRes.body.successCount).toBe(1);
      expect(commitRes.body.failCount).toBe(0);
    });
  });
});
