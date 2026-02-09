'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'

export default function CapacidadtransversalPage() {
  const [capacidadtransversales, setCapacidadtransversales] = useState<any[]>([])
  const [comptransversales, setComptransversales] = useState<any[]>([])
  const [comptransversalesFiltradasModal, setComptransversalesFiltradasModal] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false)
  const [editingCapacidadtransversal, setEditingCapacidadtransversal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Filtros para el listado principal
  const [filtroComptransversal, setFiltroComptransversal] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [comptransversalesFiltradasListado, setComptransversalesFiltradasListado] = useState<any[]>([])
  
  // Filtros para el modal de selección de competencia transversal
  const [filtroGradoModal, setFiltroGradoModal] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/comptransversal').then(r => r.json()).then(d => {
      setComptransversales(d.comptransversales || [])
      setComptransversalesFiltradasModal(d.comptransversales || [])
      setComptransversalesFiltradasListado(d.comptransversales || [])
    })
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
  }, [])

  const fetchCapacidadtransversales = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroComptransversal) params.append('idcomtransversal', filtroComptransversal)
      
      const url = `/api/admin/capacidadtransversal${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Mapear para agregar campo 'id' que CRUDTable espera
        const mapped = (data.capacidadtransversales || []).map((item: any) => ({
          ...item,
          id: item.idcapacidadtransversal
        }))
        setCapacidadtransversales(mapped)
      }
    } catch (error) {
      console.error('Error al cargar capacidades transversales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCapacidadtransversales()
  }, [filtroComptransversal])

  // Cargar competencias transversales filtradas cuando cambia el filtro de grado
  useEffect(() => {
    const cargarComptransversalesFiltradas = async () => {
      const params = new URLSearchParams()
      if (filtroGrado) params.append('idgrado', filtroGrado)
      
      const url = `/api/admin/comptransversal${params.toString() ? '?' + params.toString() : ''}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setComptransversalesFiltradasListado(data.comptransversales || [])
          // Si hay una competencia transversal seleccionada que no está en las filtradas, limpiarla
          if (filtroComptransversal && !data.comptransversales.find((ct: any) => ct.idcomtransversal === parseInt(filtroComptransversal))) {
            setFiltroComptransversal('')
          }
        }
      } catch (error) {
        console.error('Error al cargar competencias transversales filtradas:', error)
      }
    }
    cargarComptransversalesFiltradas()
  }, [filtroGrado])

  const handleCreate = () => {
    setEditingCapacidadtransversal(null)
    setFormData({})
    setErrors({})
    setFiltroGradoModal('')
    setComptransversalesFiltradasModal(comptransversales)
    setModalOpen(true)
  }

  const handleEdit = (capacidadtransversal: any) => {
    setEditingCapacidadtransversal(capacidadtransversal)
    setFormData({
      idcapacidadtransversal: capacidadtransversal.idcapacidadtransversal,
      descripcion: capacidadtransversal.descripcion,
      idcomtransversal: capacidadtransversal.idcomtransversal
    })
    setErrors({})
    
    // Si hay una competencia transversal seleccionada, cargar sus datos y establecer los filtros
    if (capacidadtransversal.idcomtransversal && capacidadtransversal.comptransversal) {
      const ct = capacidadtransversal.comptransversal
      setFiltroGradoModal(ct.idgrado ? ct.idgrado.toString() : '')
      
      // Cargar competencias transversales filtradas con este grado
      const params = new URLSearchParams()
      if (ct.idgrado) params.append('idgrado', ct.idgrado.toString())
      
      const url = `/api/admin/comptransversal${params.toString() ? '?' + params.toString() : ''}`
      fetch(url)
        .then(r => r.json())
        .then(d => setComptransversalesFiltradasModal(d.comptransversales || []))
        .catch(err => {
          console.error('Error al cargar competencias transversales filtradas:', err)
          setComptransversalesFiltradasModal(comptransversales)
        })
    } else {
      setFiltroGradoModal('')
      setComptransversalesFiltradasModal(comptransversales)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (idcapacidadtransversal: number) => {
    if (!confirm('¿Estás seguro de eliminar esta capacidad transversal?')) return
    try {
      const response = await fetch(`/api/admin/capacidadtransversal?idcapacidadtransversal=${idcapacidadtransversal}`, { method: 'DELETE' })
      if (response.ok) fetchCapacidadtransversales()
      else alert('Error al eliminar capacidad transversal')
    } catch (error) {
      alert('Error al eliminar capacidad transversal')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (editingCapacidadtransversal && !formData.idcapacidadtransversal) newErrors.idcapacidadtransversal = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.idcomtransversal) newErrors.idcomtransversal = 'Competencia Transversal es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/capacidadtransversal'
      const method = editingCapacidadtransversal ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que se genera automáticamente o se especifica manualmente
      const dataToSend = { ...formData }
      if (!editingCapacidadtransversal) {
        delete dataToSend.idcapacidadtransversal
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchCapacidadtransversales()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar capacidad transversal')
      }
    } catch (error) {
      alert('Error al guardar capacidad transversal')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const columns = [
    { key: 'idcapacidadtransversal', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { 
      key: 'comptransversal', 
      label: 'Competencia Transversal', 
      render: (value: any) => value?.descripcion || '-' 
    }
  ]

  const handleClearFilters = () => {
    setFiltroComptransversal('')
    setFiltroGrado('')
  }

  return (
    <>
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Grado</label>
            <select
              value={filtroGrado}
              onChange={(e) => setFiltroGrado(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todos los grados</option>
              {grados.map(grado => (
                <option key={grado.id} value={grado.id.toString()}>{grado.descripcion || `Grado ${grado.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Competencia Transversal</label>
            <select
              value={filtroComptransversal}
              onChange={(e) => setFiltroComptransversal(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todas las competencias transversales</option>
              {comptransversalesFiltradasListado.map(ct => (
                <option key={ct.idcomtransversal} value={ct.idcomtransversal.toString()}>
                  {ct.descripcion.substring(0, 60)}{ct.descripcion.length > 60 ? '...' : ''} (Grado {ct.grado?.descripcion || ct.idgrado})
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleClearFilters}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
        {(filtroGrado || filtroComptransversal) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {capacidadtransversales.length} capacidad{capacidadtransversales.length !== 1 ? 'es' : ''} transversal{capacidadtransversales.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
      <CRUDTable
        title="Gestión de Capacidades Transversales"
        columns={columns}
        data={capacidadtransversales}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingCapacidadtransversal(null)
          setFormData({})
          setErrors({})
          setFiltroGradoModal('')
          setComptransversalesFiltradasModal(comptransversales)
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingCapacidadtransversal ? 'Editar Capacidad Transversal' : 'Crear Capacidad Transversal'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingCapacidadtransversal(null)
                  setFormData({})
                  setErrors({})
                  setFiltroGradoModal('')
                  setComptransversalesFiltradasModal(comptransversales)
                }} 
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* ID - Solo mostrar al editar */}
              {editingCapacidadtransversal && (
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>
                    ID
                  </label>
                  <input
                    type="number"
                    value={formData.idcapacidadtransversal || ''}
                    onChange={(e) => handleChange('idcapacidadtransversal', e.target.value === '' ? '' : Number(e.target.value))}
                    className={modalStyles.input}
                    disabled={true}
                  />
                  {errors.idcapacidadtransversal && <span className={modalStyles.error}>{errors.idcapacidadtransversal}</span>}
                </div>
              )}

              {/* Descripción */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Descripción
                  <span className={modalStyles.required}>*</span>
                </label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className={modalStyles.input}
                  rows={4}
                />
                {errors.descripcion && <span className={modalStyles.error}>{errors.descripcion}</span>}
              </div>

              {/* Competencia Transversal con botón para abrir modal de selección */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Competencia Transversal
                  <span className={modalStyles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.idcomtransversal ? (comptransversales.find(c => c.idcomtransversal === parseInt(formData.idcomtransversal))?.descripcion || `ID: ${formData.idcomtransversal}`) : ''}
                    readOnly
                    className={modalStyles.input}
                    placeholder="Selecciona una competencia transversal"
                    style={{ flex: 1, cursor: 'pointer', backgroundColor: '#f8fafc' }}
                    onClick={() => setModalFiltroOpen(true)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setModalFiltroOpen(true)
                    }}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Seleccionar
                  </button>
                </div>
                {errors.idcomtransversal && <span className={modalStyles.error}>{errors.idcomtransversal}</span>}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingCapacidadtransversal(null)
                    setFormData({})
                    setErrors({})
                    setFiltroGradoModal('')
                    setComptransversalesFiltradasModal(comptransversales)
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
      
      {/* Modal de selección de competencia transversal */}
      {modalFiltroOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalFiltroOpen(false)
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                Seleccionar Competencia Transversal
              </h2>
              <button
                type="button"
                onClick={() => setModalFiltroOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9'
                  e.currentTarget.style.color = '#64748b'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Grado
              </label>
              <select
                value={filtroGradoModal}
                onChange={(e) => {
                  setFiltroGradoModal(e.target.value)
                  // Aplicar filtros automáticamente al cambiar
                  const newFiltroGrado = e.target.value
                  const params = new URLSearchParams()
                  if (newFiltroGrado) params.append('idgrado', newFiltroGrado)
                  
                  fetch(`/api/admin/comptransversal${params.toString() ? '?' + params.toString() : ''}`)
                    .then(r => r.json())
                    .then(d => setComptransversalesFiltradasModal(d.comptransversales || []))
                    .catch(err => console.error('Error al filtrar competencias transversales:', err))
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos los grados</option>
                {grados.map(grado => (
                  <option key={grado.id} value={grado.id.toString()}>{grado.descripcion || `Grado ${grado.id}`}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Competencia Transversal
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <select
                value={formData.idcomtransversal || ''}
                onChange={(e) => {
                  handleChange('idcomtransversal', e.target.value)
                  if (e.target.value) {
                    // Cerrar el modal cuando se selecciona una competencia transversal
                    setModalFiltroOpen(false)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleccionar competencia transversal...</option>
                {comptransversalesFiltradasModal.map(ct => (
                  <option key={ct.idcomtransversal} value={ct.idcomtransversal}>
                    {ct.idcomtransversal} - {ct.descripcion} (Grado {ct.grado?.descripcion || ct.idgrado})
                  </option>
                ))}
              </select>
              {comptransversalesFiltradasModal.length === 0 && filtroGradoModal && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  No se encontraron competencias transversales con los filtros seleccionados
                </div>
              )}
              {comptransversalesFiltradasModal.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {comptransversalesFiltradasModal.length} competencia{comptransversalesFiltradasModal.length !== 1 ? 's' : ''} transversal{comptransversalesFiltradasModal.length !== 1 ? 'es' : ''} encontrada{comptransversalesFiltradasModal.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => {
                  setFiltroGradoModal('')
                  setComptransversalesFiltradasModal(comptransversales)
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Limpiar Filtros
              </button>
              <button
                type="button"
                onClick={() => setModalFiltroOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

