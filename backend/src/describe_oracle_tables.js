const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { decrypt } = require('./common/utils/crypto.util');
const oracledb = require('oracledb');

let url = process.env.DATABASE_URL;
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

  console.log('Connecting to Oracle...');

  const connInstance = await oracledb.getConnection({
    user: connection.username || '',
    password,
    connectString,
  });

  const productCols = await connInstance.execute(
    `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLS WHERE TABLE_NAME = 'FP_PRODUCTS' ORDER BY COLUMN_ID`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const materialCols = await connInstance.execute(
    `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLS WHERE TABLE_NAME = 'FP_MATERIALS' ORDER BY COLUMN_ID`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log('\n--- FP_PRODUCTS columns ---');
  console.log(JSON.stringify(productCols.rows, null, 2));

  console.log('\n--- FP_MATERIALS columns ---');
  console.log(JSON.stringify(materialCols.rows, null, 2));

  await connInstance.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
