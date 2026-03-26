require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  // Alinear secuencia con el máximo ID existente
  await pool.query(
    "SELECT setval('public.competencia_id_seq', (SELECT COALESCE(MAX(id), 0) FROM public.competencia));"
  )

  const r = await pool.query("SELECT last_value FROM pg_sequences WHERE schemaname='public' AND sequencename='competencia_id_seq';")
  console.log('[fix_competencia_seq] new last_value:', r.rows[0]?.last_value)

  await pool.end()
}

main().catch((e) => {
  console.error('[fix_competencia_seq] error:', e)
  process.exit(1)
})

