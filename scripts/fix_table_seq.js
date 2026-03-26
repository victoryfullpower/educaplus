require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const table = process.argv[2]
  if (!table) {
    console.error('Usage: node scripts/fix_table_seq.js <table>')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const seqName = `public.${table}_id_seq`
  await pool.query(
    `SELECT setval('${seqName}', (SELECT COALESCE(MAX(id), 0) FROM public.${table}));`
  )

  const s = await pool.query(
    'SELECT last_value FROM pg_sequences WHERE schemaname=$1 AND sequencename=$2',
    ['public', `${table}_id_seq`]
  )

  console.log(`[fix_table_seq] ${table}_id_seq last_value=${s.rows[0]?.last_value}`)

  await pool.end()
}

main().catch((e) => {
  console.error('[fix_table_seq] error:', e)
  process.exit(1)
})

