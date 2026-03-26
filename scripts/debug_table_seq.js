require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const table = process.argv[2]
  if (!table) {
    console.error('Usage: node scripts/debug_table_seq.js <table>')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const r1 = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM public.${table};`)
  const maxId = r1.rows[0]?.max_id

  const seqsRes = await pool.query(
    `SELECT sequence_name FROM information_schema.sequences
     WHERE sequence_schema='public'
     AND sequence_name ILIKE '%${table}%'
     ORDER BY sequence_name`
  )
  const seqNames = seqsRes.rows.map((r) => r.sequence_name)

  console.log(`[debug_table_seq] table=${table} max_id=${maxId}`)
  if (seqNames.length === 0) {
    console.log('[debug_table_seq] No sequences found with matching name.')
    await pool.end()
    return
  }

  for (const seq of seqNames) {
    const s = await pool.query(
      'SELECT last_value FROM pg_sequences WHERE schemaname=$1 AND sequencename=$2',
      ['public', seq]
    )
    console.log(`[debug_table_seq] ${seq}: last_value=${s.rows[0]?.last_value}`)
  }

  await pool.end()
}

main().catch((e) => {
  console.error('[debug_table_seq] error:', e)
  process.exit(1)
})

