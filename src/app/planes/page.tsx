'use client'

import Link from 'next/link'
import { useState } from 'react'
import Header from '@/components/Header'
import {
  ETIQUETA_GRADOS,
  GRADOS_KEYS,
  includesPorGrado,
  precioPlan,
  type CantidadGrados,
  type PlanVigencia,
  type SesionesPorUnidad
} from '@/lib/planes-comerciales'
import styles from './planes.module.css'

function hrefComprar(
  vigencia: PlanVigencia,
  sesiones: SesionesPorUnidad,
  grados: CantidadGrados
) {
  const params = new URLSearchParams({
    plan: vigencia,
    sesiones: String(sesiones),
    grados
  })
  return `/planes/comprar?${params.toString()}`
}

export default function PlanesPage() {
  const [vigencia, setVigencia] = useState<PlanVigencia>('mensual')
  const [sesiones, setSesiones] = useState<SesionesPorUnidad>(5)

  const includes = includesPorGrado(sesiones)
  const vigenciaLabel = vigencia === 'mensual' ? 'mensual' : 'anual'
  const sesionesLabel = `${sesiones} sesiones por unidad`

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1>Planes EducaPlus</h1>
          <p>
            Accede a los materiales <strong>por unidad didáctica</strong> o con el{' '}
            <strong>kit anual</strong> (8 unidades). Los precios varían según el tipo de área (A o B)
            y la cantidad de grados que incluyas.
          </p>
        </div>

        <div className={styles.inner}>
          <div className={styles.planToggleRow}>
            <button
              type="button"
              className={`${styles.planToggle} ${styles.planMensual} ${
                vigencia === 'mensual' ? styles.planToggleActive : ''
              }`}
              onClick={() => setVigencia('mensual')}
            >
              <span className={styles.planToggleTitle}>PLAN MENSUAL</span>
              <span className={styles.planToggleSub}>Ahorro del 10%</span>
            </button>
            <button
              type="button"
              className={`${styles.planToggle} ${styles.planAnual} ${
                vigencia === 'anual' ? styles.planToggleActive : ''
              }`}
              onClick={() => setVigencia('anual')}
            >
              <span className={styles.planToggleTitle}>PLAN ANUAL</span>
              <span className={styles.planToggleSub}>Ahorro del 25%</span>
            </button>
          </div>

          <p className={styles.sesionesPrompt}>Selecciona el número de sesiones por unidad</p>

          <div className={styles.sesionesRow}>
            <button
              type="button"
              className={`${styles.sesionesBtn} ${
                sesiones === 5 ? styles.sesionesBtnActive : ''
              }`}
              onClick={() => setSesiones(5)}
            >
              5 sesiones por unidad
            </button>
            <button
              type="button"
              className={`${styles.sesionesBtn} ${
                sesiones === 10 ? styles.sesionesBtnActive : ''
              }`}
              onClick={() => setSesiones(10)}
            >
              10 sesiones por unidad
            </button>
          </div>

          <section className={styles.pricingCard}>
            <div
              className={`${styles.pricingBanner} ${
                sesiones === 5 ? styles.banner5 : styles.banner10
              }`}
            >
              Plan {vigenciaLabel} · {sesionesLabel}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Alcance</th>
                    <th>Precio (S/)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {GRADOS_KEYS.map((g) => (
                    <tr key={g}>
                      <td>{ETIQUETA_GRADOS[g]}</td>
                      <td className={styles.priceCell}>
                        S/ {precioPlan(vigencia, sesiones, g).toFixed(0)}
                      </td>
                      <td className={styles.actionCell}>
                        <Link
                          className={`${styles.btn} ${styles.btnBuyRow}`}
                          href={hrefComprar(vigencia, sesiones, g)}
                        >
                          Comprar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className={styles.includesTitle}>¿Qué incluye por grado?</h3>
            <ul className={styles.includesList}>
              {includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className={styles.ctaWrap}>
              <Link
                className={styles.btnComprarAhora}
                href={hrefComprar(vigencia, sesiones, '1')}
              >
                COMPRAR AHORA
              </Link>
            </div>
          </section>

          <p className={styles.areasNote}>
            Las áreas <strong>Tipo A</strong> (Comunicación, Matemática, Ciencia y Tecnología, CCSS)
            corresponden al plan de <strong>10 sesiones</strong>. Las demás áreas usan el plan de{' '}
            <strong>5 sesiones</strong>.
          </p>
        </div>
      </main>
    </>
  )
}
