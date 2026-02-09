'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'
import styles from './enfoques-transversales.module.css'

export default function EnfoquesTransversalesPage() {
  const [enfoques, setEnfoques] = useState<any[]>([])
  const [niveles, setNiveles] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [valores, setValores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEnfoque, setEditingEnfoque] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [modalSeleccionNiveles, setModalSeleccionNiveles] = useState(false)
  const [modalSeleccionGrados, setModalSeleccionGrados] = useState(false)
  const [modalSeleccionValores, setModalSeleccionValores] = useState(false)
  const [nivelesSeleccionados, setNivelesSeleccionados] = useState<number[]>([])
  const [gradosSeleccionados, setGradosSeleccionados] = useState<number[]>([])
  const [valoresSeleccionados, setValoresSeleccionados] = useState<number[]>([])
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchNiveles = async () => {
    try {
      const response = await fetch('/api/admin/niveles')
      if (response.ok) {
        const data = await response.json()
        setNiveles(data.niveles || [])
      }
    } catch (error) {
      console.error('Error al cargar niveles:', error)
    }
  }

  const fetchGrados = async () => {
    try {
      const response = await fetch('/api/admin/grados')
      if (response.ok) {
        const data = await response.json()
        setGrados(data.grados || [])
      }
    } catch (error) {
      console.error('Error al cargar grados:', error)
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
    }
  }

  const fetchEnfoques = async () => {
    try {
      const response = await fetch('/api/admin/enfoques-transversales')
      if (response.ok) {
        const data = await response.json()
        setEnfoques(data.enfoques || [])
      }
    } catch (error) {
      console.error('Error al cargar enfoques transversales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNiveles()
    fetchGrados()
    fetchValores()
    fetchEnfoques()
  }, [])

  const handleCreate = () => {
    setEditingEnfoque(null)
    setFormData({})
    setNivelesSeleccionados([])
    setGradosSeleccionados([])
    setValoresSeleccionados([])
    setModalOpen(true)
  }

  const handleEdit = (enfoque: any) => {
    setEditingEnfoque(enfoque)
    // Parsear idnivel e idgrado si existen (vienen como strings "1,2,3")
    const nivelesIds = enfoque.idnivel ? enfoque.idnivel.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id)) : []
    const gradosIds = enfoque.idgrado ? enfoque.idgrado.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id)) : []
    // Extraer los IDs de los valores relacionados
    const valoresIds = enfoque.enfoqueValores ? enfoque.enfoqueValores.map((ev: any) => ev.idvalor) : []
    setFormData({
      ...enfoque,
      idnivel: enfoque.idnivel || '',
      idgrado: enfoque.idgrado || '',
      idvalores: valoresIds.join(',')
    })
    setNivelesSeleccionados(nivelesIds)
    setGradosSeleccionados(gradosIds)
    setValoresSeleccionados(valoresIds)
    setModalOpen(true)
  }

  const handleAbrirModalNiveles = () => {
    // Cuando abrimos el modal, cargar los valores actuales desde formData.idnivel
    if (formData.idnivel) {
      const nivelesIds = formData.idnivel.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      setNivelesSeleccionados(nivelesIds)
    } else {
      setNivelesSeleccionados([])
    }
    setModalSeleccionNiveles(true)
  }

  const handleAbrirModalGrados = () => {
    // Cuando abrimos el modal, cargar los valores actuales desde formData.idgrado
    if (formData.idgrado) {
      const gradosIds = formData.idgrado.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      setGradosSeleccionados(gradosIds)
    } else {
      setGradosSeleccionados([])
    }
    setModalSeleccionGrados(true)
  }

  const handleCerrarModalNiveles = () => {
    setModalSeleccionNiveles(false)
  }

  const handleCerrarModalGrados = () => {
    setModalSeleccionGrados(false)
  }

  const handleToggleNivel = (id: number) => {
    setNivelesSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((nid) => nid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleToggleGrado = (id: number) => {
    setGradosSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((gid) => gid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleAceptarNiveles = () => {
    const idsString = nivelesSeleccionados.sort((a, b) => a - b).join(',')
    setFormData((prev: any) => ({ ...prev, idnivel: idsString }))
    setModalSeleccionNiveles(false)
  }

  const handleAceptarGrados = () => {
    const idsString = gradosSeleccionados.sort((a, b) => a - b).join(',')
    setFormData((prev: any) => ({ ...prev, idgrado: idsString }))
    setModalSeleccionGrados(false)
  }

  const handleAbrirModalValores = () => {
    // Cuando abrimos el modal, cargar los valores actuales desde formData.idvalores
    if (formData.idvalores) {
      const valoresIds = formData.idvalores.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      setValoresSeleccionados(valoresIds)
    } else {
      setValoresSeleccionados([])
    }
    setModalSeleccionValores(true)
  }

  const handleCerrarModalValores = () => {
    setModalSeleccionValores(false)
  }

  const handleToggleValor = (id: number) => {
    setValoresSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((vid) => vid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleAceptarValores = () => {
    const idsString = valoresSeleccionados.sort((a, b) => a - b).join(',')
    setFormData((prev: any) => ({ ...prev, idvalores: idsString }))
    setModalSeleccionValores(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este enfoque transversal?')) return
    try {
      const response = await fetch(`/api/admin/enfoques-transversales?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchEnfoques()
      else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar enfoque transversal')
      }
    } catch (error) {
      alert('Error al eliminar enfoque transversal')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/enfoques-transversales'
      const method = editingEnfoque ? 'PUT' : 'POST'
      // Usar formData si existe (que contiene los valores de los modales), sino usar data
      const submitData = {
        ...data,
        ...formData,
        idnivel: formData.idnivel || String(data.idnivel || ''),
        idgrado: formData.idgrado || String(data.idgrado || ''),
        idvalores: formData.idvalores || data.idvalores || ''
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      if (response.ok) {
        setModalOpen(false)
        setFormData({})
        setNivelesSeleccionados([])
        setGradosSeleccionados([])
        setValoresSeleccionados([])
        fetchEnfoques()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar enfoque transversal')
      }
    } catch (error) {
      alert('Error al guardar enfoque transversal')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const columns = [
    { key: 'idenfoque', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'idnivel', label: 'ID Niveles' },
    { key: 'idgrado', label: 'ID Grados' },
    { 
      key: 'enfoqueValores', 
      label: 'Valores', 
      render: (value: any[]) => {
        if (!value || value.length === 0) return '-'
        return value.map((ev: any) => ev.valor?.descripcion || `ID: ${ev.idvalor}`).join(', ')
      }
    }
  ]


  // Agregar campo id para compatibilidad con CRUDTable
  const formattedEnfoques = enfoques.map(enfoque => ({
    ...enfoque,
    id: enfoque.idenfoque // CRUDTable espera 'id' para las acciones
  }))

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (editingEnfoque && !formData.idenfoque) newErrors.idenfoque = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.idnivel) newErrors.idnivel = 'ID Niveles es requerido'
    if (!formData.idgrado) newErrors.idgrado = 'ID Grados es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await handleSubmit(formData)
  }

  return (
    <>
      <CRUDTable
        title="Gestión de Enfoques Transversales"
        columns={columns}
        data={formattedEnfoques}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingEnfoque(null)
          setFormData({})
          setNivelesSeleccionados([])
          setGradosSeleccionados([])
          setValoresSeleccionados([])
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingEnfoque ? 'Editar Enfoque Transversal' : 'Crear Enfoque Transversal'}
              </h2>
              <button 
                  onClick={() => {
                    setModalOpen(false)
                    setEditingEnfoque(null)
                    setFormData({})
                    setNivelesSeleccionados([])
                    setGradosSeleccionados([])
                    setValoresSeleccionados([])
                  }}
                  className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className={modalStyles.form}>
              {/* Campo ID */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  ID
                </label>
                <input
                  type="number"
                  value={formData.idenfoque || ''}
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
                  placeholder="Descripción del enfoque transversal"
                />
                {errors.descripcion && (
                  <span className={modalStyles.error}>{errors.descripcion}</span>
                )}
              </div>

              {/* Campo ID Niveles (solo lectura con botón) */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  ID Niveles<span className={modalStyles.required}>*</span>
                </label>
                <div className={styles.readonlyInputGroup}>
                  <input
                    type="text"
                    value={formData.idnivel || ''}
                    readOnly
                    className={styles.readonlyInput}
                    placeholder="Selecciona niveles..."
                  />
                  <button
                    type="button"
                    onClick={handleAbrirModalNiveles}
                    className={styles.selectButton}
                  >
                    Seleccionar
                  </button>
                </div>
                {errors.idnivel && (
                  <span className={modalStyles.error}>{errors.idnivel}</span>
                )}
              </div>

              {/* Campo ID Grados (solo lectura con botón) */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  ID Grados<span className={modalStyles.required}>*</span>
                </label>
                <div className={styles.readonlyInputGroup}>
                  <input
                    type="text"
                    value={formData.idgrado || ''}
                    readOnly
                    className={styles.readonlyInput}
                    placeholder="Selecciona grados..."
                  />
                  <button
                    type="button"
                    onClick={handleAbrirModalGrados}
                    className={styles.selectButton}
                  >
                    Seleccionar
                  </button>
                </div>
                {errors.idgrado && (
                  <span className={modalStyles.error}>{errors.idgrado}</span>
                )}
              </div>

              {/* Campo Valores (solo lectura con botón) */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Valores
                </label>
                <div className={styles.readonlyInputGroup}>
                  <input
                    type="text"
                    value={formData.idvalores || ''}
                    readOnly
                    className={styles.readonlyInput}
                    placeholder="Selecciona valores..."
                  />
                  <button
                    type="button"
                    onClick={handleAbrirModalValores}
                    className={styles.selectButton}
                  >
                    Seleccionar
                  </button>
                </div>
                {formData.idvalores && (
                  <div className={styles.selectedItems}>
                    {valores
                      .filter(v => formData.idvalores?.split(',').includes(v.idvalor.toString()))
                      .map(v => v.descripcion)
                      .join(', ')}
                  </div>
                )}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingEnfoque(null)
                    setFormData({})
                    setNivelesSeleccionados([])
                    setGradosSeleccionados([])
                    setValoresSeleccionados([])
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

      {/* Modal para seleccionar niveles */}
      {modalSeleccionNiveles && (
        <div className={styles.overlay} onClick={handleCerrarModalNiveles}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Seleccionar Niveles</h2>
              <button onClick={handleCerrarModalNiveles} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              {niveles.map((nivel) => (
                <div key={nivel.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`nivel-${nivel.id}`}
                    checked={nivelesSeleccionados.includes(nivel.id)}
                    onChange={() => handleToggleNivel(nivel.id)}
                    className={styles.checkbox}
                  />
                  <label htmlFor={`nivel-${nivel.id}`} className={styles.checkboxLabel}>
                    {nivel.id} - {nivel.descripcion}
                  </label>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCerrarModalNiveles}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAceptarNiveles}
                className={styles.acceptButton}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar grados */}
      {modalSeleccionGrados && (
        <div className={styles.overlay} onClick={handleCerrarModalGrados}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Seleccionar Grados</h2>
              <button onClick={handleCerrarModalGrados} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              {grados.map((grado) => (
                <div key={grado.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`grado-${grado.id}`}
                    checked={gradosSeleccionados.includes(grado.id)}
                    onChange={() => handleToggleGrado(grado.id)}
                    className={styles.checkbox}
                  />
                  <label htmlFor={`grado-${grado.id}`} className={styles.checkboxLabel}>
                    {grado.id} - {grado.descripcion || `Grado ${grado.id}`}
                  </label>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCerrarModalGrados}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAceptarGrados}
                className={styles.acceptButton}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar valores */}
      {modalSeleccionValores && (
        <div className={styles.overlay} onClick={handleCerrarModalValores}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Seleccionar Valores</h2>
              <button onClick={handleCerrarModalValores} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              {valores.map((valor) => (
                <div key={valor.idvalor} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    id={`valor-${valor.idvalor}`}
                    checked={valoresSeleccionados.includes(valor.idvalor)}
                    onChange={() => handleToggleValor(valor.idvalor)}
                    className={styles.checkbox}
                  />
                  <label htmlFor={`valor-${valor.idvalor}`} className={styles.checkboxLabel}>
                    {valor.idvalor} - {valor.descripcion}
                  </label>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleCerrarModalValores}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAceptarValores}
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

