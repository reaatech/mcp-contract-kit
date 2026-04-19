import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

let _version: string | undefined;

export function getVersion(): string {
  if (_version) return _version;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(__dirname, '../package.json'),
    resolve(__dirname, '../../package.json'),
  ];
  for (const pkgPath of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
      _version = pkg.version;
      return _version;
    } catch {
      continue;
    }
  }
  _version = '0.0.0';
  return _version;
}
