import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL no definida')

  const pool = new pg.Pool({ connectionString })
  const client = await pool.connect()

  try {
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM plan_catalogo')
    if (rows[0].c > 0) {
      console.log(`plan_catalogo ya tiene ${rows[0].c} filas, omitiendo seed.`)
      return
    }

    const sql = readFileSync(join(__dirname, 'seed-plan-catalogo-data.sql'), 'utf8')
    await client.query(sql)

    const after = await client.query('SELECT COUNT(*)::int AS c FROM plan_catalogo')
    console.log(`Seed aplicado: ${after.rows[0].c} planes en plan_catalogo.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
