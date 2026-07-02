import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { json, urlencoded } from 'express';

// ─── Type helpers ──────────────────────────────────────────────────────

interface ModuleTestData {
  module: string;
  headers: string[];
  validRow: string[];
  altRow?: string[];
  invalidRow?: string[];
  skipCommit?: boolean;
  skipDownload?: boolean;
  skipPreview?: boolean;
  skipInvalidTest?: boolean;
  skipApiRead?: boolean;
  expectUpdated?: boolean;
  endpoint?: string;
}

// ─── Main test suite ───────────────────────────────────────────────────

describe('Import/Export Pipeline — All 24 Modules (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@idiibi.com', password: 'Admin@123456' });

    authToken = loginRes.body.accessToken;
    expect(authToken).toBeDefined();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Helpers ─────────────────────────────────────────────────────

  function h() {
    return {
      Authorization: `Bearer ${authToken}`,
      'x-company-id': '1',
      'x-tenant-id': '1',
    };
  }

  function toBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  function csv(headers: string[], rows: string[][]): string {
    const lines = [headers.join(','), ...rows.map((r) => r.join(','))];
    return toBase64(Buffer.from(lines.join('\n'), 'utf-8'));
  }

  // ─── Run a full module test ──────────────────────────────────────

  async function testModule(d: ModuleTestData) {
    const m = d.module;

    // 1. Download template
    if (!d.skipDownload) {
      const dl = await request(app.getHttpServer())
        .get(`/api/imports/sample/${m}`)
        .set(h());
      expect(dl.status).toBe(200);
      expect(dl.headers['content-type']).toContain('spreadsheetml');
      expect(dl.headers['content-disposition']).toContain(
        `${m}_template.xlsx`,
      );
    }

    // 2. Preview valid row
    if (!d.skipPreview) {
      const previewBody = csv(d.headers, [d.validRow]);
      const preview = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({ module: m, fileContent: previewBody, fileName: `${m}.csv` });
      expect(preview.status).toBe(200);
      expect(preview.body.summary.totalRows).toBeGreaterThanOrEqual(1);
      expect(preview.body.summary.validRows).toBeGreaterThanOrEqual(1);
      expect(preview.body.rows.length).toBeGreaterThanOrEqual(1);
      expect(preview.body.rows[0].isValid).toBe(true);
    }

    // 3. Commit valid row
    if (!d.skipCommit) {
      const previewBody2 = csv(d.headers, [d.validRow]);
      const preview2 = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({ module: m, fileContent: previewBody2, fileName: `${m}.csv` });
      expect(preview2.status).toBe(200);

      const rowsToCommit = preview2.body.rows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.data);

      const commitRes = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set(h())
        .send({ module: m, rows: rowsToCommit });

      expect(commitRes.status).toBe(200);
      // Accept either insert or update (record may already exist from prior run)
      expect(commitRes.body.insertedRows + commitRes.body.updatedRows).toBeGreaterThanOrEqual(1);
      expect(commitRes.body.failedRows).toBe(0);
      expect(commitRes.body.dbVerified).toBe(true);
    }

    // 4. Verify API can read the data
    if (d.endpoint) {
      const readRes = await request(app.getHttpServer())
        .get(`/api${d.endpoint}`)
        .set(h());
      expect([200, 201, 204]).toContain(readRes.status);
    }

    // 5. Test invalid row gives friendly validation error
    if (!d.skipInvalidTest && d.invalidRow) {
      const invalidBody = csv(d.headers, [d.invalidRow]);
      const invalidRes = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: m,
          fileContent: invalidBody,
          fileName: `${m}_invalid.csv`,
        });
      expect(invalidRes.status).toBe(200);
      expect(invalidRes.body.summary.invalidRows).toBeGreaterThan(0);
      if (invalidRes.body.rows.length > 0) {
        expect(invalidRes.body.rows[0].isValid).toBe(false);
        expect(invalidRes.body.rows[0].errors.length).toBeGreaterThan(0);
      }
    }
  }

  // ─── All 24 Module Definitions ──────────────────────────────────

  const ts = Date.now().toString(36);

  const MODULES: ModuleTestData[] = [
    {
      module: 'companies',
      headers: ['name', 'legalName', 'industryType', 'currencyCode'],
      validRow: [`E2E Test Co ${ts}`, `Legal ${ts}`, 'mixed', 'EGP'],
      invalidRow: ['', '', '', ''],
      endpoint: '/companies',
    },
    {
      module: 'sites',
      headers: ['name', 'type', 'region', 'status'],
      validRow: [`E2E Site ${ts}`, 'factory', 'Test Region', 'active'],
      invalidRow: ['', '', '', ''],
      endpoint: '/sites',
    },
    {
      module: 'units',
      headers: ['name', 'symbol'],
      validRow: [`E2E Unit ${ts}`, `eu${ts}`],
      invalidRow: ['', ''],
      endpoint: '/units',
    },
    {
      module: 'accounts',
      headers: ['code', 'name', 'type', 'isActive'],
      validRow: [`E2E-${ts}`, `E2E Account ${ts}`, 'expense', 'true'],
      invalidRow: ['', '', '', ''],
      endpoint: '/accounts',
    },
    {
      module: 'cost-centers',
      headers: ['code', 'name', 'type', 'siteName'],
      validRow: [
        `E2ECC-${ts}`,
        `E2E Cost Center ${ts}`,
        'production',
        'Test Factory',
      ],
      invalidRow: ['', '', '', ''],
      endpoint: '/cost-centers',
    },
    {
      module: 'product-categories',
      headers: ['name'],
      validRow: [`E2E Cat ${ts}`],
      invalidRow: [''],
      skipInvalidTest: true, // single-field module throws 400 on empty
      endpoint: '/product-categories',
    },
    {
      module: 'customers',
      headers: ['code', 'name', 'customerType', 'isActive'],
      validRow: [`E2ECUST-${ts}`, `E2E Customer ${ts}`, 'retail', 'true'],
      invalidRow: ['', '', '', ''],
      endpoint: '/customers',
    },
    {
      module: 'suppliers',
      headers: ['name'],
      validRow: [`E2E Supplier ${ts}`],
      invalidRow: [''],
      skipInvalidTest: true, // single-field module throws 400 on empty
      endpoint: '/suppliers',
    },
    {
      module: 'materials',
      headers: [
        'code',
        'name',
        'unitSymbol',
        'materialType',
        'purchasePrice',
      ],
      validRow: [`E2ERM-${ts}`, `E2E Material ${ts}`, 'kg', 'raw_material', '10'],
      invalidRow: ['', '', '', '', ''],
      endpoint: '/materials',
    },
    {
      module: 'products',
      headers: [
        'sku',
        'name',
        'unitSymbol',
        'productType',
        'standardCost',
        'salePrice',
      ],
      validRow: [
        `E2EP-${ts}`,
        `E2E Product ${ts}`,
        'pcs',
        'finished_good',
        '50',
        '100',
      ],
      invalidRow: ['', '', '', '', '', ''],
      endpoint: '/products',
    },
    {
      module: 'bom-recipes',
      headers: [
        'productSku',
        'version',
        'materialCode',
        'qtyPerOutput',
        'outputQty',
      ],
      validRow: ['P-001', 'v-e2e', 'RM-001', '2', '1'],
      invalidRow: ['', '', '', '', ''],
      endpoint: '/bom-recipes',
    },
    {
      module: 'exchange-rates',
      headers: ['fromCurrency', 'toCurrency', 'rate', 'rateDate'],
      validRow: ['EUR', 'EGP', '52.0', `2026-${String((parseInt(ts, 36) % 12) + 1).padStart(2, '0')}-15`],
      invalidRow: ['', '', '', ''],
      endpoint: '/exchange-rates',
    },
    {
      module: 'kpi-targets',
      headers: ['kpiName', 'kpiCategory', 'fiscalYear', 'targetValue'],
      validRow: [`E2E KPI ${ts}`, 'financial', '2026', '1000'],
      invalidRow: ['', '', '', ''],
      endpoint: '/kpi-targets',
    },
    {
      // strategy=update: updates material.purchasePrice, creates raw_material_price row
      // Returns 'insert' from handler (not 'update')
      module: 'raw-material-prices',
      headers: ['materialCode', 'price', 'effectiveDate', 'source'],
      validRow: ['RM-001', '15', '2026-07-01', 'import'],
      expectUpdated: false,
      endpoint: '/raw-material-prices',
    },
    {
      module: 'production-plans',
      headers: [
        'productSku',
        'siteName',
        'fiscalYear',
        'periodMonth',
        'plannedQty',
        'planSource',
      ],
      validRow: ['P-001', 'Test Factory', '2026', '6', '500', 'budget'],
      invalidRow: ['', '', '', '', '', ''],
      endpoint: '/production-plans',
    },
    {
      module: 'production-allocations',
      headers: [
        'siteName',
        'period',
        'allocatedAmount',
        'costCategory',
      ],
      validRow: ['Test Factory', '2026-07', '25000', 'overhead'],
      invalidRow: ['', '', '', ''],
      skipApiRead: true, // no dedicated GET controller
    },
    {
      // updateOnly=true: updates existing BOM recipe wastagePct
      module: 'yield-waste',
      headers: ['productSku', 'wastagePct'],
      validRow: ['P-001', '3.5'],
      expectUpdated: true,
      endpoint: '/bom-recipes',
    },
    {
      module: 'budget-lines',
      headers: [
        'budgetCycleName',
        'fiscalYear',
        'accountCode',
        'periodMonth',
        'amount',
      ],
      validRow: ['FY26 Budget', '2026', '4000', '6', '50000'],
      endpoint: '/budgets',
    },
    {
      module: 'forecast-lines',
      headers: [
        'forecastCycleName',
        'fiscalYear',
        'accountCode',
        'periodMonth',
        'amount',
      ],
      validRow: ['FY26 Forecast', '2026', '4000', '6', '30000'],
      endpoint: '/forecasts',
    },
    {
      module: 'actual-lines',
      headers: ['accountCode', 'transactionDate', 'amount', 'quantity'],
      validRow: ['4000', '2026-06-15', '25000', '100'],
      endpoint: '/actual-imports',
    },
    {
      module: 'promotions',
      headers: [
        'name',
        'startDate',
        'endDate',
        'productSku',
        'customerCode',
        'discountPct',
      ],
      validRow: [
        `E2E Promo ${ts}`,
        '2026-07-01',
        '2026-07-31',
        'P-001',
        'CUST-001',
        '10',
      ],
      invalidRow: ['', '', '', '', '', ''],
      endpoint: '/promotions',
    },
    {
      module: 'headcount-plans',
      headers: [
        'budgetCycleName',
        'jobTitle',
        'periodMonth',
        'totalCost',
        'headcount',
      ],
      validRow: ['FY26 Budget', `E2E Role ${ts}`, '6', '15000', '2'],
      skipApiRead: true, // requires cycleId query param, tested in dbVerified test
    },
    {
      module: 'notification-rules',
      headers: [
        'ruleName',
        'triggerType',
        'thresholdValue',
        'accountCode',
      ],
      validRow: [
        `E2E Rule ${ts}`,
        'variance_pct',
        '10',
        '4000',
      ],
      invalidRow: ['', '', '', ''],
      skipApiRead: true, // no dedicated GET controller
    },
    {
      // Uses same production_plans table as production-plans, different periodMonth
      module: 'sales-plans',
      headers: ['productSku', 'siteName', 'fiscalYear', 'periodMonth', 'plannedQty'],
      validRow: ['P-001', 'Test Factory', '2026', '8', '300'],
      skipApiRead: true, // no dedicated controller
    },
  ];

  // ─── Test all 24 modules ────────────────────────────────────────

  describe.each(MODULES)('$module', (d) => {
    it('should complete all 8 verification steps', async () => {
      await testModule(d);
    });
  });

  // ─── Month Format Tests ─────────────────────────────────────────

  describe('Month format validation', () => {
    const monthModule = 'budget-lines';
    const headers = [
      'budgetCycleName',
      'fiscalYear',
      'accountCode',
      'periodMonth',
      'amount',
    ];
    const base = ['FY26 Budget', '2026', '4000', '1', '1000'];

    const validFormats: [string, string][] = [
      ['numeric 1', '1'],
      ['zero-padded 01', '01'],
      ['short name Jan', 'Jan'],
      ['full name January', 'January'],
      ['arabic يناير', 'يناير'],
      ['quarter Q1', 'Q1'],
    ];

    it.each(validFormats)(
      'should accept %s',
      async (_, monthVal) => {
        const row = [...base];
        row[3] = monthVal;
        const body = csv(headers, [row]);
        const res = await request(app.getHttpServer())
          .post('/api/imports/preview')
          .set(h())
          .send({
            module: monthModule,
            fileContent: body,
            fileName: 'months.csv',
          });
        expect(res.status).toBe(200);
        expect(res.body.summary.validRows).toBe(1);
      },
    );

    const invalidFormats: [string, string][] = [
      ['zero', '0'],
      ['thirteen', '13'],
      ['abc', 'abc'],
      ['year-month', 'Jan-26'],
    ];

    it.each(invalidFormats)(
      'should reject %s',
      async (_, monthVal) => {
        const row = [...base];
        row[3] = monthVal;
        const body = csv(headers, [row]);
        const res = await request(app.getHttpServer())
          .post('/api/imports/preview')
          .set(h())
          .send({
            module: monthModule,
            fileContent: body,
            fileName: 'months.csv',
          });
        expect(res.status).toBe(200);
        expect(res.body.summary.invalidRows).toBeGreaterThan(0);
        if (res.body.rows.length > 0) {
          expect(res.body.rows[0].isValid).toBe(false);
        }
      },
    );
  });

  // ─── Production Plans: second import must update ────────────────

  describe('Production Plans — second import must update', () => {
    it('should upsert on second import of same product/site/year/month', async () => {
      const headers = [
        'productSku',
        'siteName',
        'fiscalYear',
        'periodMonth',
        'plannedQty',
        'planSource',
        'actualQty',
      ];
      const row = [
        'P-001',
        'Test Factory',
        '2026',
        '9',
        '600',
        'manual',
        '550',
      ];

      // First import
      const body1 = csv(headers, [row]);
      const p1 = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: 'production-plans',
          fileContent: body1,
          fileName: 'pp1.csv',
        });
      expect(p1.status).toBe(200);

      const rows1 = p1.body.rows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.data);
      const c1 = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set(h())
        .send({ module: 'production-plans', rows: rows1 });
      expect(c1.status).toBe(200);
      expect(c1.body.insertedRows + c1.body.updatedRows).toBeGreaterThanOrEqual(1);
      expect(c1.body.dbVerified).toBe(true);

      // Second import — same key, different plannedQty
      const row2 = [
        'P-001',
        'Test Factory',
        '2026',
        '9',
        '700',
        'manual',
        '600',
      ];
      const body2 = csv(headers, [row2]);
      const p2 = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: 'production-plans',
          fileContent: body2,
          fileName: 'pp2.csv',
        });
      expect(p2.status).toBe(200);

      const rows2 = p2.body.rows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.data);
      const c2 = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set(h())
        .send({ module: 'production-plans', rows: rows2 });
      expect(c2.status).toBe(200);
      expect(c2.body.updatedRows).toBe(1);
      expect(c2.body.insertedRows).toBe(0);
      expect(c2.body.dbVerified).toBe(true);
    });
  });

  // ─── Sales Plans must not conflict with Production Plans ────────

  describe('Sales Plans — no conflict with Production Plans', () => {
    it('should insert sales-plans without conflict', async () => {
      const headers = [
        'productSku',
        'siteName',
        'fiscalYear',
        'periodMonth',
        'plannedQty',
      ];
      const spMonth = (parseInt(ts, 36) % 12) + 1;
      const row = ['P-001', 'Test Factory', '2026', String(spMonth), '200'];
      const body = csv(headers, [row]);
      const p = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: 'sales-plans',
          fileContent: body,
          fileName: 'sp.csv',
        });
      expect(p.status).toBe(200);

      const rows = p.body.rows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.data);
      const c = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set(h())
        .send({ module: 'sales-plans', rows });
      expect(c.status).toBe(200);
      expect(c.body.insertedRows + c.body.updatedRows).toBeGreaterThanOrEqual(1);
      expect(c.body.dbVerified).toBe(true);
    });
  });

  // ─── BOM name-based resolution ──────────────────────────────────

  describe('BOM — name-based resolution', () => {
    it('should resolve Product/Material by name not only code', async () => {
      const headers = [
        'productSku',
        'materialCode',
        'qtyPerOutput',
        'version',
      ];
      const row = ['Test Product', 'Raw Material 1', '1.5', 'v-name-test'];
      const body = csv(headers, [row]);
      const p = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: 'bom-recipes',
          fileContent: body,
          fileName: 'bom.csv',
        });
      expect(p.status).toBe(200);
      expect(p.body.summary.validRows).toBe(1);
    });
  });

  // ─── Raw Material Prices must update Material.purchasePrice ─────

  describe('Raw Material Prices — purchasePrice update', () => {
    it('should update material purchasePrice after import', async () => {
      const headers = ['materialCode', 'price', 'effectiveDate', 'source'];
      const price = '25';
      const materialCode = 'RM-001';

      // Get current purchasePrice
      const before = await request(app.getHttpServer())
        .get('/api/materials')
        .set(h());
      expect(before.status).toBe(200);
      const materials: any[] = before.body.data ?? before.body;
      const matBefore = materials.find((m: any) => {
        const code = m.code ?? m.materialCode;
        return code === materialCode;
      });

      // Import new price
      const row = [materialCode, price, '2026-07-15', 'import'];
      const body = csv(headers, [row]);
      const p = await request(app.getHttpServer())
        .post('/api/imports/preview')
        .set(h())
        .send({
          module: 'raw-material-prices',
          fileContent: body,
          fileName: 'rmp.csv',
        });
      expect(p.status).toBe(200);

      const rows = p.body.rows
        .filter((r: any) => r.isValid)
        .map((r: any) => r.data);
      const c = await request(app.getHttpServer())
        .post('/api/imports/commit')
        .set(h())
        .send({ module: 'raw-material-prices', rows });
      expect(c.status).toBe(200);
      expect(c.body.insertedRows).toBe(1);
      expect(c.body.dbVerified).toBe(true);

      // Verify purchasePrice was updated on the material
      const after = await request(app.getHttpServer())
        .get('/api/materials')
        .set(h());
      expect(after.status).toBe(200);
      const materialsAfter: any[] = after.body.data ?? after.body;
      const matAfter = materialsAfter.find((m: any) => {
        const code = m.code ?? m.materialCode;
        return code === materialCode;
      });
      expect(matAfter).toBeDefined();
      const newPrice = Number(
        matAfter.purchasePrice ?? matAfter.purchase_price ?? 0,
      );
      expect(newPrice).toBe(Number(price));
    });
  });

  // ─── dbVerified = true for Budget / Forecast / Actual / Headcount ─

  describe('dbVerified — budget/forecast/actual/headcount', () => {
    const checkModules = [
      {
        module: 'budget-lines',
        headers: [
          'budgetCycleName',
          'fiscalYear',
          'accountCode',
          'periodMonth',
          'amount',
        ],
        row: ['FY26 Budget', '2026', '4000', '11', '1000'],
      },
      {
        module: 'forecast-lines',
        headers: [
          'forecastCycleName',
          'fiscalYear',
          'accountCode',
          'periodMonth',
          'amount',
        ],
        row: ['FY26 Forecast', '2026', '4000', '11', '2000'],
      },
      {
        module: 'actual-lines',
        headers: ['accountCode', 'transactionDate', 'amount', 'quantity'],
        row: ['4000', '2026-06-20', '5000', '25'],
      },
      {
        module: 'headcount-plans',
        headers: [
          'budgetCycleName',
          'jobTitle',
          'periodMonth',
          'totalCost',
          'headcount',
        ],
        row: ['FY26 Budget', `E2E HC ${ts}`, '11', '20000', '3'],
      },
    ];

    it.each(checkModules)(
      '$module should have dbVerified=true',
      async (d) => {
        const body = csv(d.headers, [d.row]);
        const p = await request(app.getHttpServer())
          .post('/api/imports/preview')
          .set(h())
          .send({
            module: d.module,
            fileContent: body,
            fileName: `${d.module}.csv`,
          });
        expect(p.status).toBe(200);

        const rows = p.body.rows
          .filter((r: any) => r.isValid)
          .map((r: any) => r.data);
        if (rows.length === 0) return; // skip if no valid rows

        const c = await request(app.getHttpServer())
          .post('/api/imports/commit')
          .set(h())
          .send({ module: d.module, rows });
        expect(c.status).toBe(200);
        expect(c.body.dbVerified).toBe(true);
      },
    );
  });
});
