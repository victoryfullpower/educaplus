'use client'



import { Suspense, useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { useRouter, useSearchParams } from 'next/navigation'

import Header from '@/components/Header'

import {

  ETIQUETA_GRADOS,

  ETIQUETA_GRADOS_UNIDAD,

  precioKit,

  precioPlan,

  precioUnidad,

  type AreaTipoComercial,

  type CantidadGrados,

  type GradosVentaUnidad,

  type PlanVigencia,

  type SesionesPorUnidad

} from '@/lib/planes-comerciales'

import {

  PLANES_SUSCRIPCION,

  type PlanSuscripcionCatalogo,

  type PlanSuscripcionId

} from '@/lib/planes-catalogo'

import styles from '../planes.module.css'

import comprarStyles from './comprar.module.css'



function esGradosValido(s: string | null): s is GradosVentaUnidad {

  return s === '1' || s === '2' || s === '3' || s === '4' || s === '5' || s === '15'

}



function esCantidadGrados(s: string | null): s is CantidadGrados {

  return s === '1' || s === '2' || s === '3' || s === '4' || s === '5'

}



function esPlanValido(s: string | null): s is PlanVigencia {

  return s === 'mensual' || s === 'anual'

}



function parseSesiones(s: string | null): SesionesPorUnidad | null {

  if (s === '5') return 5

  if (s === '10') return 10

  return null

}



function esTipoValido(s: string | null): s is AreaTipoComercial {

  return s === 'A' || s === 'B'

}



function esSuscripcionId(s: string | null): s is PlanSuscripcionId {

  return s === 'basico' || s === 'premium' || s === 'anual'

}



function ContenidoComprar() {

  const router = useRouter()

  const searchParams = useSearchParams()

  const planRaw = searchParams.get('plan')

  const sesionesRaw = searchParams.get('sesiones')

  const modalidad = searchParams.get('modalidad')

  const tipoRaw = searchParams.get('tipo')

  const gradosRaw = searchParams.get('grados')



  const [auth, setAuth] = useState<boolean | null>(null)

  const [creandoOrden, setCreandoOrden] = useState(false)

  const [activandoOrden, setActivandoOrden] = useState(false)

  const [msgPago, setMsgPago] = useState<string | null>(null)

  const [ordenId, setOrdenId] = useState<number | null>(null)

  const [culqiConfigured, setCulqiConfigured] = useState(false)

  const [planSuscripcion, setPlanSuscripcion] = useState<PlanSuscripcionCatalogo | null>(null)



  useEffect(() => {

    fetch('/api/auth/check')

      .then((r) => r.json())

      .then((d) => setAuth(!!d.authenticated))

      .catch(() => setAuth(false))

  }, [])



  const suscripcionRaw = searchParams.get('suscripcion')



  useEffect(() => {

    if (!esSuscripcionId(suscripcionRaw)) {

      setPlanSuscripcion(null)

      return

    }

    const fallback = PLANES_SUSCRIPCION.find((p) => p.id === suscripcionRaw) ?? null

    setPlanSuscripcion(fallback)



    fetch(`/api/planes/catalogo?codigo=${encodeURIComponent(suscripcionRaw)}`)

      .then((r) => r.json())

      .then((data) => {

        if (data.plan) setPlanSuscripcion(data.plan)

      })

      .catch(() => {})

  }, [suscripcionRaw])



  const plan = esPlanValido(planRaw) ? planRaw : null

  const sesiones = parseSesiones(sesionesRaw)

  const gradosNuevo = esCantidadGrados(gradosRaw) ? gradosRaw : null



  const tipo = esTipoValido(tipoRaw) ? tipoRaw : null

  const grados = esGradosValido(gradosRaw) ? gradosRaw : null



  const validoNuevo = plan !== null && sesiones !== null && gradosNuevo !== null

  const validoSuscripcion = planSuscripcion != null

  const validoUnidad =

    modalidad === 'unidad' && tipo !== null && grados !== null

  const validoKit = modalidad === 'kit' && tipo !== null

  const valido = validoNuevo || validoSuscripcion || validoUnidad || validoKit

  const btnTemaClass =
    planSuscripcion?.id === 'basico'
      ? comprarStyles.btnCtaAzul
      : planSuscripcion?.id === 'premium'
        ? comprarStyles.btnCtaNaranja
        : planSuscripcion?.id === 'anual'
          ? comprarStyles.btnCtaVerde
          : comprarStyles.btnCtaDefault



  let monto: number | null = null

  let titulo = ''

  let detalle = ''



  if (validoSuscripcion && planSuscripcion) {

    monto = planSuscripcion.precio

    titulo = planSuscripcion.nombre

    detalle = planSuscripcion.creditos

  } else if (validoNuevo && plan && sesiones !== null && gradosNuevo) {

    monto = precioPlan(plan, sesiones, gradosNuevo)

    titulo =

      plan === 'mensual'

        ? `Plan mensual — ${sesiones} sesiones por unidad`

        : `Plan anual — ${sesiones} sesiones por unidad`

    detalle = `${ETIQUETA_GRADOS[gradosNuevo]} · kit de materiales según selección`

  } else if (validoUnidad && tipo && grados) {

    const g = grados === '15' ? '5' : grados

    monto = precioUnidad(tipo, g as CantidadGrados)

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



  const activarOrdenDev = useCallback(

    async (id: number) => {

      setActivandoOrden(true)

      setMsgPago(null)

      try {

        const res = await fetch('/api/pagos/activar-orden', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ ordenId: id })

        })

        const data = (await res.json()) as {

          error?: string

          message?: string

          estado?: string

        }

        if (!res.ok) throw new Error(data.error || 'No se pudo activar el plan')

        setMsgPago(data.message || 'Plan activado correctamente.')

        setTimeout(() => router.push('/home'), 1200)

      } catch (e) {

        setMsgPago(e instanceof Error ? e.message : 'Error al activar la orden')

      } finally {

        setActivandoOrden(false)

      }

    },

    [router]

  )



  const crearOrden = async () => {

    if (validoSuscripcion && planSuscripcion) {

      setMsgPago(null)

      setCreandoOrden(true)

      try {

        const res = await fetch('/api/pagos/crear-orden', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            planCodigo: planSuscripcion.id

          })

        })

        const data = (await res.json()) as {

          error?: string

          message?: string

          ordenId?: number

          culqiConfigured?: boolean

        }

        if (!res.ok) throw new Error(data.error || 'No se pudo crear la orden')

        setOrdenId(data.ordenId ?? null)

        setCulqiConfigured(!!data.culqiConfigured)

        if (data.culqiConfigured) {

          setMsgPago(

            `Orden #${data.ordenId} creada. Siguiente paso: abrir checkout de Culqi.`

          )

        } else if (data.ordenId) {

          await activarOrdenDev(data.ordenId)

        }

      } catch (e) {

        setMsgPago(e instanceof Error ? e.message : 'Error al crear la orden')

      } finally {

        setCreandoOrden(false)

      }

      return

    }



    if (!validoNuevo || !plan || sesiones === null || !gradosNuevo) return

    setMsgPago(null)

    setCreandoOrden(true)

    try {

      const res = await fetch('/api/pagos/crear-orden', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          vigencia: plan,

          sesionesPorUnidad: sesiones,

          cantidadGrados: gradosNuevo

        })

      })

      const data = (await res.json()) as {

        error?: string

        message?: string

        ordenId?: number

        culqiConfigured?: boolean

      }

      if (!res.ok) throw new Error(data.error || 'No se pudo crear la orden')

      setOrdenId(data.ordenId ?? null)

      setCulqiConfigured(!!data.culqiConfigured)

      setMsgPago(

        data.culqiConfigured

          ? `Orden #${data.ordenId} creada. Siguiente paso: abrir checkout de Culqi.`

          : `Orden #${data.ordenId} creada en pendiente. Configura CULQI_SECRET_KEY y NEXT_PUBLIC_CULQI_PUBLIC_KEY.`

      )

    } catch (e) {

      setMsgPago(e instanceof Error ? e.message : 'Error al crear la orden')

    } finally {

      setCreandoOrden(false)

    }

  }



  return (

    <main className={styles.main}>

      <div className={comprarStyles.pageInner}>

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



              {validoSuscripcion && auth === true && (

                <p className={comprarStyles.pagoMsg}>

                  El área y grado los eliges al crear cada programación. Las combinaciones ya

                  usadas en el año no se pueden repetir.

                </p>

              )}



              {auth === null && <p className={comprarStyles.muted}>Verificando sesión…</p>}



              {auth === false && (

                <div className={comprarStyles.box}>

                  <p>Para continuar necesitas una cuenta.</p>

                  <Link
                    className={`${comprarStyles.btnCta} ${comprarStyles.btnCtaDefault}`}
                    href={loginHref}
                  >
                    Iniciar sesión
                  </Link>

                  <Link className={comprarStyles.linkAlt} href="/register">

                    Crear cuenta

                  </Link>

                </div>

              )}



              {auth === true && (

                <div className={comprarStyles.box}>

                  {!validoSuscripcion && (

                    <p className={comprarStyles.pagoMsg}>

                      Flujo base Culqi habilitado: crea orden pendiente y procesa webhook para

                      activar suscripción. Falta conectar checkout/tokenización en frontend.

                    </p>

                  )}

                  {validoSuscripcion && !culqiConfigured && !ordenId && (

                    <p className={comprarStyles.pagoMsg}>

                      Modo desarrollo: al confirmar se creará la orden y se activará tu plan

                      automáticamente (sin Culqi).

                    </p>

                  )}

                  <button
                    type="button"
                    className={`${comprarStyles.btnCta} ${btnTemaClass}`}
                    onClick={() => void crearOrden()}

                    disabled={

                      creandoOrden ||

                      activandoOrden ||

                      (!validoNuevo && !validoSuscripcion)

                    }

                  >

                    {creandoOrden || activandoOrden

                      ? 'Procesando…'

                      : validoSuscripcion

                        ? culqiConfigured

                          ? 'Continuar con el pago'

                          : 'Confirmar y activar plan'

                        : 'Crear orden de pago'}

                  </button>

                  {ordenId != null && culqiConfigured && !validoSuscripcion && (

                    <button
                      type="button"
                      className={comprarStyles.btnDev}
                      onClick={() => void activarOrdenDev(ordenId)}
                      disabled={activandoOrden}
                    >
                      Activar en desarrollo (sin Culqi)
                    </button>

                  )}

                  {msgPago && <p className={comprarStyles.pagoMsg}>{msgPago}</p>}

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

            <div className={comprarStyles.pageInner}>

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


