import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.argv[2] || 'sqlite';
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

if (target === 'sqlite') {
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  console.log('[DB Switcher] Switched schema provider to SQLite');
} else {
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  console.log('[DB Switcher] Switched schema provider to PostgreSQL');
}

fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
