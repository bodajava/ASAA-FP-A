import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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
  const mappings = await prisma.importMapping.findMany();
  console.log('--- Import Mappings ---');
  console.log(JSON.stringify(mappings, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  ));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
