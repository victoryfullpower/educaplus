'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import {
  ETIQUETA_GRADOS_UNIDAD,
  precioKit,
  precioUnidad,
  type AreaTipoComercial,
  type GradosVentaUnidad
} from '@/lib/planes-comerciales'
import styles from '../planes.module.css'
import comprarStyles from './comprar.module.css'

function esGradosValido(s: string | null): s is GradosVentaUnidad {
  return s === '1' || s === '2' || s === '3' || s === '4' || s === '15'
}

function esTipoValido(s: string | null): s is AreaTipoComercial {
  return s === 'A' || s === 'B'
}

function ContenidoComprar() {
  const searchParams = useSearchParams()
  const modalidad = searchParams.get('modalidad')
  const tipoRaw = searchParams.get('tipo')
  const gradosRaw = searchParams.get('grados')

  const [auth, setAuth] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/check')
      .then((r) => r.json())
      .then((d) => setAuth(!!d.authenticated))
      .catch(() => setAuth(false))
  }, [])

  const tipo = esTipoValido(tipoRaw) ? tipoRaw : null
  const grados = esGradosValido(gradosRaw) ? gradosRaw : null

  const validoUnidad =
    modalidad === 'unidad' && tipo !== null && grados !== null
  const validoKit = modalidad === 'kit' && tipo !== null
  const valido = validoUnidad || validoKit

  let monto: number | null = null
  let titulo = ''
  let detalle = ''

  if (validoUnidad && tipo && grados) {
    monto = precioUnidad(tipo, grados)
    titulo = `Compra por unidad — Tipo ${tipo}`
    detalle = `${ETIQUETA_GRADOS_UNIDAD[grados]} · unidad didáctica según plan elegido`
  } else if (validoKit && tipo) {
    monto = precioKit(tipo)
    titulo = `Kit anual — Tipo ${tipo}`
    detalle = '8 unidades · grados 1° a 5°'
  }

  const queryActual =
    typeof window !== 'undefined' ? window.location.search : ''
  const loginHref = `/login?redirect=${encodeURIComponent('/planes/comprar' + queryActual)}`

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <div className={comprarStyles.card}>
          <h1 className={comprarStyles.title}>Finalizar compra</h1>

          {!valido && (
            <p className={comprarStyles.error}>
              Selección no válida.{' '}
              <Link href="/planes">Volver a planes</Link>
            </p>
          )}

          {valido && monto !== null && (
            <>
              <p className={comprarStyles.lead}>{titulo}</p>
              <p className={comprarStyles.detail}>{detalle}</p>
              <p className={comprarStyles.price}>
                Total: <strong>S/ {monto.toFixed(2)}</strong>
              </p>

              {auth === null && <p className={comprarStyles.muted}>Verificando sesión…</p>}

              {auth === false && (
                <div className={comprarStyles.box}>
                  <p>Para continuar necesitas una cuenta.</p>
                  <Link className={`${styles.btn} ${styles.btnPrimary}`} href={loginHref}>
                    Iniciar sesión
                  </Link>
                  <Link className={comprarStyles.linkAlt} href="/register">
                    Crear cuenta
                  </Link>
                </div>
              )}

              {auth === true && (
                <div className={comprarStyles.box}>
                  <p className={comprarStyles.pagoMsg}>
                    El pago con tarjeta, Yape/Plin u otras vías se activará aquí al conectar la pasarela
                    (Mercado Pago o Culqi) y webhooks.
                  </p>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled>
                    Pagar ahora (próximamente)
                  </button>
                </div>
              )}

              <p className={comprarStyles.footer}>
                <Link href="/planes">← Volver a planes</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ComprarPlanPage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <main className={styles.main}>
            <div className={styles.inner}>
              <p style={{ color: '#faf5ff', textAlign: 'center' }}>Cargando…</p>
            </div>
          </main>
        }
      >
        <ContenidoComprar />
      </Suspense>
    </>
  )
}
