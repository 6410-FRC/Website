#!/usr/bin/env node
/**
 * Creates .local/admin-auth.json for the local admin sign-in (npm run dev → http://localhost:4321/admin/).
 * Stores a scrypt hash of the password plus a random session secret. Nothing here is used in production.
 *   npm run admin:setup                # asks for a username and password
 *   ADMIN_PASSWORD=... npm run admin:setup -- --user admin   # non-interactive
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

async function ask(question, hidden = false) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    // Echo nothing while the password is typed.
    const original = rl._writeToOutput;
    rl._writeToOutput = (s) => { if (s.includes('\n')) original.call(rl, '\n'); else if (s === question) original.call(rl, s); };
  }
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

const username = flag('--user') || process.env.ADMIN_USERNAME || (await ask('Username for the local admin [admin]: ')) || 'admin';
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await ask('Password (typing is hidden): ', true);
  const again = await ask('Type it again: ', true);
  if (password !== again) { console.error('The two passwords do not match. Nothing was changed.'); process.exit(1); }
}
if (password.length < 8) { console.error('Use at least 8 characters. Nothing was changed.'); process.exit(1); }

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password.normalize('NFKC'), Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
mkdirSync('.local', { recursive: true });
writeFileSync('.local/admin-auth.json', JSON.stringify({ username, salt, hash, keyLength: 64, sessionSecret: randomBytes(32).toString('hex') }, null, 2) + '\n', { mode: 0o600 });
console.log(`Saved .local/admin-auth.json for user "${username}". Start the site with npm run dev and open http://localhost:4321/admin/`);
