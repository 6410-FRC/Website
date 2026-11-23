// Generates a new password for the LIVE editor and prints the value to store in Cloudflare.
// Usage: npm run admin:live-password
import { createHmac, randomBytes, randomInt } from 'node:crypto';

const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike characters
const group = () => Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
const password = Array.from({ length: 5 }, group).join('-');
const salt = randomBytes(16).toString('hex');
const mac = createHmac('sha256', salt).update(`password:${password.normalize('NFKC')}`).digest('base64url');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ password, hash: `v1$${salt}$${mac}` }));
} else {
  console.log(`New live editor password (save it in a password manager; it is not stored anywhere):\n\n  ${password}\n`);
  console.log(`Store this value as the ADMIN_PASSWORD_HASH secret on the Cloudflare Pages project, then redeploy:\n\n  v1$${salt}$${mac}\n`);
  console.log('  npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name wingnuts6410');
}
