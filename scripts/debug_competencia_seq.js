require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const r1 = await pool.query('SELECT max(id) AS max_id FROM public.competencia')
  const maxId = r1.rows[0]?.max_id

  const seqsRes = await pool.query(
    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' AND sequence_name ILIKE '%competencia%' ORDER BY sequence_name"
  )
  const seqNames = seqsRes.rows.map((r) => r.sequence_name)

  console.log('[debug_competencia_seq] max_id:', maxId)
  console.log('[debug_competencia_seq] sequences:', seqNames)

  for (const seq of seqNames) {
    const s = await pool.query(
      'SELECT last_value FROM pg_sequences WHERE schemaname=$1 AND sequencename=$2',
      ['public', seq]
    )
    console.log(`[debug_competencia_seq] ${seq}:`, s.rows[0])
  }

  await pool.end()
}

main().catch((e) => {
  console.error('[debug_competencia_seq] error:', e)
  process.exit(1)
})

