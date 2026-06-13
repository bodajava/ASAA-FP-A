import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { decrypt } from './common/utils/crypto.util';
import * as oracledb from 'oracledb';

let url = process.env.DATABASE_URL!;
if (url && url.startsWith('"') && url.endsWith('"')) {
  url = url.slice(1, -1);
}
const urlObj = new URL(url);
if (!urlObj.searchParams.has('allowPublicKeyRetrieval')) {
  urlObj.searchParams.set('allowPublicKeyRetrieval', 'true');
}
if (!urlObj.searchParams.has('connectionLimit')) {
  urlObj.searchParams.set('connectionLimit', '10');
}
url = urlObj.toString();

const adapter = new PrismaMariaDb(url, { useTextProtocol: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  const connections = await prisma.integrationConnection.findMany({
    where: {
      connectionType: 'oracle',
      NOT: {
        host: 'mock',
      }
    }
  });

  if (connections.length === 0) {
    console.error('No oracle connections found in MariaDB.');
    return;
  }

  const connection = connections[0];
  const password = connection.passwordEnc ? decrypt(connection.passwordEnc) : '';
  const connectString = `${connection.host}:${connection.port || 1521}/${connection.databaseName || ''}`;

  console.log(`Connecting to Oracle: ${connectString} as ${connection.username}...`);

  const connInstance = await oracledb.getConnection({
    user: connection.username || '',
    password,
    connectString,
  });

  const tables = [
    'FP_COMPANIES',
    'FP_ACCOUNTS',
    'FP_SITES',
    'FP_CUSTOMERS',
    'FP_COST_CENTERS',
    'FP_PRODUCT_CATEGORIES',
    'FP_UNITS',
    'FP_SUPPLIERS',
    'FP_BOM_RECIPES',
    'FP_BOM_LINES'
  ];

  for (const table of tables) {
    try {
      const cols = await connInstance.execute(
        `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLS WHERE TABLE_NAME = :tableName ORDER BY COLUMN_ID`,
        [table],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log(`\n--- ${table} columns ---`);
      console.log(JSON.stringify(cols.rows, null, 2));
    } catch (err: any) {
      console.error(`Error querying ${table}:`, err.message);
    }
  }

  await connInstance.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
