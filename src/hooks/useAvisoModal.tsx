'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import AvisoModal, { type AvisoModalTipo } from '@/components/AvisoModal'
import {
  ErrorGeneracionDocumento,
  esErrorTrialAgotado,
  esErrorTrialFichaCotejo,
  esErrorRegenCredito,
  esErrorTrialUnaSesion,
  esErrorTrialUnaUnidadPlan,
  mensajeTrialAgotado,
  MSG_CREDITOS_REGEN_AGOTADOS,
  MSG_REGEN_REQUIERE_PLAN,
  MSG_TRIAL_AGOTADO,
  MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
  MSG_TRIAL_SOLO_SESION_1,
  MSG_TRIAL_UNA_UNIDAD_PLAN,
  RUTA_PLANES_PAGO
} from '@/lib/error-generacion-documento'

export type AvisoModalState = {
  titulo: string
  mensaje: string
  tipo?: AvisoModalTipo
  subtitulo?: string
  botonTexto?: string
  onCloseRedirect?: string
}

export function useAvisoModal(subtituloPorDefecto = 'EducaPlus') {
  const router = useRouter()
  const [aviso, setAviso] = useState<AvisoModalState | null>(null)

  const mostrarAviso = useCallback((opts: AvisoModalState) => {
    setAviso(opts)
  }, [])

  const cerrarAviso = useCallback(() => {
    const redirect = aviso?.onCloseRedirect
    setAviso(null)
    if (redirect) router.push(redirect)
  }, [aviso, router])

  const mostrarAvisoModoPruebaFichaCotejo = useCallback(() => {
    mostrarAviso({
      titulo: 'Requiere plan de pago',
      mensaje: MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
      tipo: 'warn',
      botonTexto: 'Ver planes',
      onCloseRedirect: RUTA_PLANES_PAGO
    })
  }, [mostrarAviso])

  const manejarErrorGeneracion = useCallback(
    (error: unknown): boolean => {
      if (esErrorTrialUnaUnidadPlan(error)) {
        mostrarAviso({
          titulo: 'Solo una unidad en prueba',
          mensaje:
            error instanceof Error ? error.message : MSG_TRIAL_UNA_UNIDAD_PLAN,
          tipo: 'warn',
          botonTexto: 'Ver planes',
          onCloseRedirect: RUTA_PLANES_PAGO
        })
        return true
      }
      if (esErrorTrialUnaSesion(error)) {
        mostrarAviso({
          titulo: 'Solo una sesión en prueba',
          mensaje:
            error instanceof Error ? error.message : MSG_TRIAL_SOLO_SESION_1,
          tipo: 'warn',
          botonTexto: 'Ver planes',
          onCloseRedirect: RUTA_PLANES_PAGO
        })
        return true
      }
      if (esErrorTrialFichaCotejo(error)) {
        mostrarAviso({
          titulo: 'Requiere plan de pago',
          mensaje:
            error instanceof Error
              ? error.message
              : MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
          tipo: 'warn',
          botonTexto: 'Ver planes',
          onCloseRedirect: RUTA_PLANES_PAGO
        })
        return true
      }
      if (esErrorRegenCredito(error)) {
        mostrarAviso({
          titulo:
            error instanceof ErrorGeneracionDocumento &&
            error.code === 'CREDITOS_REGEN_AGOTADOS'
              ? 'Créditos de regeneración agotados'
              : 'Regeneración con IA',
          mensaje:
            error instanceof Error
              ? error.message
              : MSG_REGEN_REQUIERE_PLAN,
          tipo: 'warn',
          botonTexto: 'Ver planes',
          onCloseRedirect: RUTA_PLANES_PAGO
        })
        return true
      }
      if (esErrorTrialAgotado(error)) {
        mostrarAviso({
          titulo: 'Prueba gratuita agotada',
          mensaje: mensajeTrialAgotado(error) || MSG_TRIAL_AGOTADO,
          tipo: 'error',
          botonTexto: 'Ver planes',
          onCloseRedirect: RUTA_PLANES_PAGO
        })
        return true
      }

      const mensaje =
        error instanceof Error ? error.message : 'Error desconocido al generar el documento'
      mostrarAviso({
        titulo: 'No se pudo generar',
        mensaje,
        tipo: 'error'
      })
      return false
    },
    [mostrarAviso]
  )

  const AvisoModalEl = aviso ? (
    <AvisoModal
      abierto
      titulo={aviso.titulo}
      mensaje={aviso.mensaje}
      tipo={aviso.tipo}
      subtitulo={aviso.subtitulo ?? subtituloPorDefecto}
      botonTexto={aviso.botonTexto}
      onCerrar={cerrarAviso}
    />
  ) : null

  return {
    aviso,
    mostrarAviso,
    mostrarAvisoModoPruebaFichaCotejo,
    cerrarAviso,
    manejarErrorGeneracion,
    AvisoModalEl
  }
}
