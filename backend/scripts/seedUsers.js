/**
 * One-off script to bulk-create participant accounts, bypassing the
 * /auth/register HTTP endpoint. Run it inside the backend container
 * (it already has bcrypt + pg installed there):
 *
 *   docker compose exec backend node src/../scripts/seedUsers.js
 *
 * Creates iei100..iei120, all named "ccc", each with a unique password,
 * and prints the credential list to the console (also writes it to
 * /app/credentials.txt inside the container — copy it out with
 * `docker compose cp backend:/app/credentials.txt .` if you want a file).
 */
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';
import { writeFileSync } from 'fs';

async function main() {
  const lines = ['participant_id\tpassword'];

  for (let i = 100; i <= 120; i++) {
    const participantId = `iei${i}`;
    const name = 'ccc';
    const password = `Iei${i}Pass!`;
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (participant_id, name, password_hash, role)
       VALUES ($1, $2, $3, 'participant')
       ON CONFLICT (participant_id) DO NOTHING`,
      [participantId, name, hash]
    );

    lines.push(`${participantId}\t${password}`);
    console.log(`created ${participantId} / ${password}`);
  }

  writeFileSync('/app/credentials.txt', lines.join('\n') + '\n');
  console.log('\nAll done. Credential list written to /app/credentials.txt inside the container.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
