import Link from 'next/link'
import Header from '@/components/Header'
import {
  AREAS_TIPO_A,
  AREAS_TIPO_B,
  ETIQUETA_GRADOS_UNIDAD,
  PRECIO_KIT_ANUAL,
  PRECIO_UNIDAD,
  type AreaTipoComercial,
  type GradosVentaUnidad
} from '@/lib/planes-comerciales'
import styles from './planes.module.css'

const GRADOS_KEYS: GradosVentaUnidad[] = ['1', '2', '3', '4', '15']

function hrefUnidad(grados: GradosVentaUnidad, tipo: AreaTipoComercial) {
  return `/planes/comprar?modalidad=unidad&tipo=${tipo}&grados=${grados}`
}

export default function PlanesPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.hero}>
            <h1>Planes EducaPlus</h1>
            <p>
              Elige cómo quieres acceder a los materiales con IA: <strong>por unidad didáctica</strong>{' '}
              (según cantidad de grados) o el <strong>kit anual</strong> con las 8 unidades. Los precios
              dependen del tipo de área (A: alta carga, B: carga media).
            </p>
          </div>

          <section className={styles.block} id="por-unidad">
            <h2 className={styles.blockTitle}>Modalidad: por unidad</h2>
            <p className={styles.blockSubtitle}>
              Incluye el paquete de materiales por cada unidad según tu área (Tipo A o B). El precio varía
              según cuántos grados incluye tu compra.
            </p>

            <div className={styles.tiposGrid}>
              <div className={styles.tipoCard}>
                <h3>Áreas Tipo A (alta carga)</h3>
                <ul>
                  {AREAS_TIPO_A.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.tipoCard}>
                <h3>Áreas Tipo B (carga media)</h3>
                <ul>
                  {AREAS_TIPO_B.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Alcance (venta por unidad)</th>
                    <th>Tipo A (S/)</th>
                    <th>Tipo B (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADOS_KEYS.map((g) => (
                    <tr key={g}>
                      <td>{ETIQUETA_GRADOS_UNIDAD[g]}</td>
                      <td>
                        S/ {PRECIO_UNIDAD.A[g].toFixed(2)}
                        <Link
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnCell}`}
                          href={hrefUnidad(g, 'A')}
                          style={{ marginLeft: 12 }}
                        >
                          Comprar
                        </Link>
                      </td>
                      <td>
                        S/ {PRECIO_UNIDAD.B[g].toFixed(2)}
                        <Link
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnCell}`}
                          href={hrefUnidad(g, 'B')}
                          style={{ marginLeft: 12 }}
                        >
                          Comprar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              Los montos aplican por unidad didáctica según el alcance de grados elegido. El pago se
              confirmará en el siguiente paso (pasarela en integración).
            </p>
          </section>

          <section className={styles.block} id="kit-anual">
            <h2 className={styles.blockTitle}>Modalidad: kit anual</h2>
            <p className={styles.blockSubtitle}>
              Las 8 unidades didácticas para grados 1° a 5°, según tipo de área.
            </p>

            <div className={styles.kitGrid}>
              <div className={styles.kitCard}>
                <h3>Tipo A — 1° a 5°</h3>
                <div className={styles.kitPrice}>S/ {PRECIO_KIT_ANUAL.A.toFixed(2)}</div>
                <p className={styles.kitNote}>Incluye el kit completo de unidades para áreas de alta carga.</p>
                <Link
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  href="/planes/comprar?modalidad=kit&tipo=A"
                >
                  Comprar kit anual
                </Link>
              </div>
              <div className={styles.kitCard}>
                <h3>Tipo B — 1° a 5°</h3>
                <div className={styles.kitPrice}>S/ {PRECIO_KIT_ANUAL.B.toFixed(2)}</div>
                <p className={styles.kitNote}>Incluye el kit completo de unidades para áreas de carga media.</p>
                <Link
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  href="/planes/comprar?modalidad=kit&tipo=B"
                >
                  Comprar kit anual
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
