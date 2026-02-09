'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'
import styles from './valores.module.css'

export default function ValoresPage() {
  const [valores, setValores] = useState<any[]>([])
  const [enfoques, setEnfoques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSeleccionEnfoques, setModalSeleccionEnfoques] = useState(false)
  const [editingValor, setEditingValor] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [enfoquesSeleccionados, setEnfoquesSeleccionados] = useState<number[]>([])
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchEnfoques = async () => {
    try {
      const response = await fetch('/api/admin/enfoques-transversales')
      if (response.ok) {
        const data = await response.json()
        setEnfoques(data.enfoques || [])
      }
    } catch (error) {
      console.error('Error al cargar enfoques:', error)
    }
  }

  const fetchValores = async () => {
    try {
      const response = await fetch('/api/admin/valores')
      if (response.ok) {
        const data = await response.json()
        setValores(data.valores || [])
      }
    } catch (error) {
      console.error('Error al cargar valores:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnfoques()
    fetchValores()
  }, [])

  const handleCreate = () => {
    setEditingValor(null)
    setFormData({})
    setEnfoquesSeleccionados([])
    setErrors({})
    setModalOpen(true)
  }

  const handleEdit = (valor: any) => {
    setEditingValor(valor)
    // Extraer los IDs de los enfoques relacionados
    const enfoquesIds = valor.enfoqueValores ? valor.enfoqueValores.map((ev: any) => ev.idenfoque) : []
    setFormData({
      idvalor: valor.idvalor,
      descripcion: valor.descripcion,
      actitud: valor.actitud,
      idenfoques: enfoquesIds.join(',')
    })
    setEnfoquesSeleccionados(enfoquesIds)
    setErrors({})
    setModalOpen(true)
  }

  const handleAbrirModalEnfoques = () => {
    // Cuando abrimos el modal, cargar los valores actuales desde formData.idenfoques
    if (formData.idenfoques) {
      const enfoquesIds = formData.idenfoques.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      setEnfoquesSeleccionados(enfoquesIds)
    } else {
      setEnfoquesSeleccionados([])
    }
    setModalSeleccionEnfoques(true)
  }

  const handleCerrarModalEnfoques = () => {
    setModalSeleccionEnfoques(false)
  }

  const handleToggleEnfoque = (id: number) => {
    setEnfoquesSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((eid) => eid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleAceptarEnfoques = () => {
    const idsString = enfoquesSeleccionados.sort((a, b) => a - b).join(',')
    setFormData((prev: any) => ({ ...prev, idenfoques: idsString }))
    setModalSeleccionEnfoques(false)
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este valor?')) return
    try {
      const response = await fetch(`/api/admin/valores?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchValores()
      else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar valor')
      }
    } catch (error) {
      alert('Error al eliminar valor')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (editingValor && !formData.idvalor) newErrors.idvalor = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.actitud) newErrors.actitud = 'Actitud es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/valores'
      const method = editingValor ? 'PUT' : 'POST'
      const dataToSend = {
        ...formData,
        idenfoques: formData.idenfoques || enfoquesSeleccionados.join(',')
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        setFormData({})
        setEnfoquesSeleccionados([])
        fetchValores()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar valor')
      }
    } catch (error) {
      alert('Error al guardar valor')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'idvalor', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { 
      key: 'actitud', 
      label: 'Actitud', 
      render: (value: string) => value?.substring(0, 100) + (value?.length > 100 ? '...' : '') 
    },
    { 
      key: 'enfoqueValores', 
      label: 'Enfoques Transversales', 
      render: (value: any[]) => {
        if (!value || value.length === 0) return '-'
        return value.map((ev: any) => ev.enfoque?.descripcion || `ID: ${ev.idenfoque}`).join(', ')
      }
    }
  ]

  // Agregar campo id para compatibilidad con CRUDTable
  const formattedValores = valores.map(valor => ({
    ...valor,
    id: valor.idvalor // CRUDTable espera 'id' para las acciones
  }))

  return (
    <>
      <CRUDTable
        title="Gestión de Valores"
        columns={columns}
        data={formattedValores}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingValor(null)
          setFormData({})
          setEnfoquesSeleccionados([])
          setErrors({})
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingValor ? 'Editar Valor' : 'Crear Valor'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingValor(null)
                  setFormData({})
                  setEnfoquesSeleccionados([])
                  setErrors({})
                }}
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* Campo ID */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  ID
                </label>
                <input
                  type="number"
                  value={formData.idvalor || ''}
                  readOnly
                  disabled
                  className={modalStyles.input}
                />
              </div>

              {/* Campo Descripción */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Descripción<span className={modalStyles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.descripcion || ''}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className={modalStyles.input}
                  placeholder="Descripción del valor"
                />
                {errors.descripcion && (
                  <span className={modalStyles.error}>{errors.descripcion}</span>
                )}
              </div>

              {/* Campo Actitud */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Actitud<span className={modalStyles.required}>*</span>
                </label>
                <textarea
                  value={formData.actitud || ''}
                  onChange={(e) => handleChange('actitud', e.target.value)}
                  className={modalStyles.input}
                  placeholder="Actitud del valor"
                  rows={5}
                />
                {errors.actitud && (
                  <span className={modalStyles.error}>{errors.actitud}</span>
                )}
              </div>

              {/* Campo Enfoques Transversales (solo lectura con botón) */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Enfoques Transversales
                </label>
                <div className={styles.readonlyInputGroup}>
                  <input
                    type="text"
                    value={formData.idenfoques || ''}
                    readOnly
                    className={styles.readonlyInput}
                    placeholder="Selecciona enfoques transversales..."
                  />
                  <button
                    type="button"
                    onClick={handleAbrirModalEnfoques}
                    className={styles.selectButton}
                  >
                    Seleccionar
                  </button>
                </div>
                {formData.idenfoques && (
                  <div className={styles.selectedItems}>
                    {enfoques
                      .filter(e => formData.idenfoques?.split(',').includes(e.idenfoque.toString()))
                      .map(e => e.descripcion)
                      .join(', ')}
                  </div>
                )}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingValor(null)
                    setFormData({})
                    setEnfoquesSeleccionados([])
                    setErrors({})
                  }}
                  className={modalStyles.cancelButton}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={modalStyles.submitButton}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para seleccionar enfoques transversales */}
      {modalSeleccionEnfoques && (
        <div className={styles.overlay} onClick={handleCerrarModalEnfoques}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Seleccionar Enfoques Transversales</h2>
              <button onClick={handleCerrarModalEnfoques} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              {enfoques.map((enfoque) => (
                <div key={enfoque.idenfoque} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`enfoque-${enfoque.idenfoque}`}
                    checked={enfoquesSeleccionados.includes(enfoque.idenfoque)}
                    onChange={() => handleToggleEnfoque(enfoque.idenfoque)}
                    className={styles.checkbox}
                  />
                  <label htmlFor={`enfoque-${enfoque.idenfoque}`} className={styles.checkboxLabel}>
                    {enfoque.idenfoque} - {enfoque.descripcion}
                  </label>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCerrarModalEnfoques}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAceptarEnfoques}
                className={styles.acceptButton}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

