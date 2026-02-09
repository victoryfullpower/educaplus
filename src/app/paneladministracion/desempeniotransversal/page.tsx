'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'

export default function DesempeniotransversalPage() {
  const [desempeniotransversales, setDesempeniotransversales] = useState<any[]>([])
  const [capacidadtransversales, setCapacidadtransversales] = useState<any[]>([])
  const [capacidadtransversalesFiltradasModal, setCapacidadtransversalesFiltradasModal] = useState<any[]>([])
  const [comptransversales, setComptransversales] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false)
  const [editingDesempeniotransversal, setEditingDesempeniotransversal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Filtros para el listado principal
  const [filtroCapacidadtransversal, setFiltroCapacidadtransversal] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [filtroComptransversal, setFiltroComptransversal] = useState<string>('')
  const [comptransversalesFiltradasListado, setComptransversalesFiltradasListado] = useState<any[]>([])
  const [capacidadtransversalesFiltradasListado, setCapacidadtransversalesFiltradasListado] = useState<any[]>([])
  
  // Filtros para el modal de selección de capacidad transversal
  const [filtroGradoModal, setFiltroGradoModal] = useState<string>('')
  const [filtroComptransversalModal, setFiltroComptransversalModal] = useState<string>('')
  const [comptransversalesFiltradasModalSelect, setComptransversalesFiltradasModalSelect] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/capacidadtransversal').then(r => r.json()).then(d => {
      setCapacidadtransversales(d.capacidadtransversales || [])
      setCapacidadtransversalesFiltradasModal(d.capacidadtransversales || [])
      setCapacidadtransversalesFiltradasListado(d.capacidadtransversales || [])
    })
    fetch('/api/admin/comptransversal').then(r => r.json()).then(d => {
      setComptransversales(d.comptransversales || [])
      setComptransversalesFiltradasListado(d.comptransversales || [])
      setComptransversalesFiltradasModalSelect(d.comptransversales || [])
    })
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
  }, [])

  const fetchDesempeniotransversales = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroCapacidadtransversal) params.append('idcapacidadtransversal', filtroCapacidadtransversal)
      
      const url = `/api/admin/desempeniotransversal${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        // Mapear para agregar campo 'id' que CRUDTable espera
        const mapped = (data.desempeniotransversales || []).map((item: any) => ({
          ...item,
          id: item.iddesempeniotransversal
        }))
        setDesempeniotransversales(mapped)
      }
    } catch (error) {
      console.error('Error al cargar desempeños transversales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesempeniotransversales()
  }, [filtroCapacidadtransversal])

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

  // Cargar capacidades transversales filtradas cuando cambia la competencia transversal
  useEffect(() => {
    const cargarCapacidadtransversalesFiltradas = async () => {
      if (!filtroComptransversal) {
        setCapacidadtransversalesFiltradasListado([])
        return
      }

      const params = new URLSearchParams()
      params.append('idcomtransversal', filtroComptransversal)
      
      const url = `/api/admin/capacidadtransversal?${params.toString()}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCapacidadtransversalesFiltradasListado(data.capacidadtransversales || [])
          if (filtroCapacidadtransversal && !data.capacidadtransversales.find((ct: any) => ct.idcapacidadtransversal === parseInt(filtroCapacidadtransversal))) {
            setFiltroCapacidadtransversal('')
          }
        }
      } catch (error) {
        console.error('Error al cargar capacidades transversales filtradas:', error)
      }
    }
    cargarCapacidadtransversalesFiltradas()
  }, [filtroComptransversal])

  const handleCreate = () => {
    setEditingDesempeniotransversal(null)
    setFormData({})
    setErrors({})
    setFiltroGradoModal('')
    setFiltroComptransversalModal('')
    setComptransversalesFiltradasModalSelect(comptransversales)
    setCapacidadtransversalesFiltradasModal(capacidadtransversales)
    setModalOpen(true)
  }

  const handleEdit = (desempeniotransversal: any) => {
    setEditingDesempeniotransversal(desempeniotransversal)
    setFormData({
      iddesempeniotransversal: desempeniotransversal.iddesempeniotransversal,
      descripcion: desempeniotransversal.descripcion,
      idcapacidadtransversal: desempeniotransversal.idcapacidadtransversal
    })
    setErrors({})
    
    // Si hay una capacidad transversal seleccionada, cargar sus datos y establecer los filtros
    if (desempeniotransversal.idcapacidadtransversal && desempeniotransversal.capacidadtransversal) {
      const ct = desempeniotransversal.capacidadtransversal
      const compTransv = ct.comptransversal
      setFiltroGradoModal(compTransv.idgrado ? compTransv.idgrado.toString() : '')
      setFiltroComptransversalModal(ct.idcomtransversal ? ct.idcomtransversal.toString() : '')
      
      // Cargar competencias transversales filtradas
      const paramsComp = new URLSearchParams()
      if (compTransv.idgrado) paramsComp.append('idgrado', compTransv.idgrado.toString())
      fetch(`/api/admin/comptransversal${paramsComp.toString() ? '?' + paramsComp.toString() : ''}`)
        .then(r => r.json())
        .then(d => setComptransversalesFiltradasModalSelect(d.comptransversales || []))
        .catch(err => setComptransversalesFiltradasModalSelect(comptransversales))
      
      // Cargar capacidades transversales filtradas
      const paramsCap = new URLSearchParams()
      paramsCap.append('idcomtransversal', ct.idcomtransversal.toString())
      fetch(`/api/admin/capacidadtransversal?${paramsCap.toString()}`)
        .then(r => r.json())
        .then(d => setCapacidadtransversalesFiltradasModal(d.capacidadtransversales || []))
        .catch(err => setCapacidadtransversalesFiltradasModal(capacidadtransversales))
    } else {
      setFiltroGradoModal('')
      setFiltroComptransversalModal('')
      setComptransversalesFiltradasModalSelect(comptransversales)
      setCapacidadtransversalesFiltradasModal(capacidadtransversales)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (iddesempeniotransversal: number) => {
    if (!confirm('¿Estás seguro de eliminar este desempeño transversal?')) return
    try {
      const response = await fetch(`/api/admin/desempeniotransversal?iddesempeniotransversal=${iddesempeniotransversal}`, { method: 'DELETE' })
      if (response.ok) fetchDesempeniotransversales()
      else alert('Error al eliminar desempeño transversal')
    } catch (error) {
      alert('Error al eliminar desempeño transversal')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (editingDesempeniotransversal && !formData.iddesempeniotransversal) newErrors.iddesempeniotransversal = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.idcapacidadtransversal) newErrors.idcapacidadtransversal = 'Capacidad Transversal es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/desempeniotransversal'
      const method = editingDesempeniotransversal ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que se genera automáticamente o se especifica manualmente
      const dataToSend = { ...formData }
      if (!editingDesempeniotransversal) {
        delete dataToSend.iddesempeniotransversal
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchDesempeniotransversales()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar desempeño transversal')
      }
    } catch (error) {
      alert('Error al guardar desempeño transversal')
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
    { key: 'iddesempeniotransversal', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { 
      key: 'capacidadtransversal', 
      label: 'Capacidad Transversal', 
      render: (value: any) => value?.descripcion || '-' 
    }
  ]

  const handleClearFilters = () => {
    setFiltroCapacidadtransversal('')
    setFiltroGrado('')
    setFiltroComptransversal('')
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Capacidad Transversal</label>
            <select
              value={filtroCapacidadtransversal}
              onChange={(e) => setFiltroCapacidadtransversal(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todas las capacidades transversales</option>
              {capacidadtransversalesFiltradasListado.map(ct => (
                <option key={ct.idcapacidadtransversal} value={ct.idcapacidadtransversal.toString()}>
                  {ct.descripcion.substring(0, 60)}{ct.descripcion.length > 60 ? '...' : ''}
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
        {(filtroGrado || filtroComptransversal || filtroCapacidadtransversal) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {desempeniotransversales.length} desempeño{desempeniotransversales.length !== 1 ? 's' : ''} transversal{desempeniotransversales.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
      <CRUDTable
        title="Gestión de Desempeños Transversales"
        columns={columns}
        data={desempeniotransversales}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingDesempeniotransversal(null)
          setFormData({})
          setErrors({})
          setFiltroGradoModal('')
          setFiltroComptransversalModal('')
          setComptransversalesFiltradasModalSelect(comptransversales)
          setCapacidadtransversalesFiltradasModal(capacidadtransversales)
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingDesempeniotransversal ? 'Editar Desempeño Transversal' : 'Crear Desempeño Transversal'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingDesempeniotransversal(null)
                  setFormData({})
                  setErrors({})
                  setFiltroGradoModal('')
                  setFiltroComptransversalModal('')
                  setComptransversalesFiltradasModalSelect(comptransversales)
                  setCapacidadtransversalesFiltradasModal(capacidadtransversales)
                }} 
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* ID - Solo mostrar al editar */}
              {editingDesempeniotransversal && (
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>
                    ID
                  </label>
                  <input
                    type="number"
                    value={formData.iddesempeniotransversal || ''}
                    onChange={(e) => handleChange('iddesempeniotransversal', e.target.value === '' ? '' : Number(e.target.value))}
                    className={modalStyles.input}
                    disabled={true}
                  />
                  {errors.iddesempeniotransversal && <span className={modalStyles.error}>{errors.iddesempeniotransversal}</span>}
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

              {/* Capacidad Transversal con botón para abrir modal de selección */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Capacidad Transversal
                  <span className={modalStyles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.idcapacidadtransversal ? (capacidadtransversales.find(c => c.idcapacidadtransversal === parseInt(formData.idcapacidadtransversal))?.descripcion || `ID: ${formData.idcapacidadtransversal}`) : ''}
                    readOnly
                    className={modalStyles.input}
                    placeholder="Selecciona una capacidad transversal"
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
                {errors.idcapacidadtransversal && <span className={modalStyles.error}>{errors.idcapacidadtransversal}</span>}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingDesempeniotransversal(null)
                    setFormData({})
                    setErrors({})
                    setFiltroGradoModal('')
                    setFiltroComptransversalModal('')
                    setComptransversalesFiltradasModalSelect(comptransversales)
                    setCapacidadtransversalesFiltradasModal(capacidadtransversales)
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
      
      {/* Modal de selección de capacidad transversal */}
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
                Seleccionar Capacidad Transversal
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
                  const newFiltroGrado = e.target.value
                  const params = new URLSearchParams()
                  if (newFiltroGrado) params.append('idgrado', newFiltroGrado)
                  
                  fetch(`/api/admin/comptransversal${params.toString() ? '?' + params.toString() : ''}`)
                    .then(r => r.json())
                    .then(d => {
                      setComptransversalesFiltradasModalSelect(d.comptransversales || [])
                      if (filtroComptransversalModal && !d.comptransversales.find((ct: any) => ct.idcomtransversal === parseInt(filtroComptransversalModal))) {
                        setFiltroComptransversalModal('')
                        setCapacidadtransversalesFiltradasModal([])
                      }
                    })
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
              </label>
              <select
                value={filtroComptransversalModal}
                onChange={(e) => {
                  setFiltroComptransversalModal(e.target.value)
                  if (!e.target.value) {
                    setCapacidadtransversalesFiltradasModal([])
                    return
                  }
                  
                  const params = new URLSearchParams()
                  params.append('idcomtransversal', e.target.value)
                  
                  fetch(`/api/admin/capacidadtransversal?${params.toString()}`)
                    .then(r => r.json())
                    .then(d => setCapacidadtransversalesFiltradasModal(d.capacidadtransversales || []))
                    .catch(err => console.error('Error al filtrar capacidades transversales:', err))
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todas las competencias transversales</option>
                {comptransversalesFiltradasModalSelect.map(ct => (
                  <option key={ct.idcomtransversal} value={ct.idcomtransversal}>
                    {ct.idcomtransversal} - {ct.descripcion} (Grado {ct.grado?.descripcion || ct.idgrado})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Capacidad Transversal
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <select
                value={formData.idcapacidadtransversal || ''}
                onChange={(e) => {
                  handleChange('idcapacidadtransversal', e.target.value)
                  if (e.target.value) {
                    // Cerrar el modal cuando se selecciona una capacidad transversal
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
                <option value="">Seleccionar capacidad transversal...</option>
                {capacidadtransversalesFiltradasModal.map(ct => (
                  <option key={ct.idcapacidadtransversal} value={ct.idcapacidadtransversal}>
                    {ct.idcapacidadtransversal} - {ct.descripcion}
                  </option>
                ))}
              </select>
              {capacidadtransversalesFiltradasModal.length === 0 && filtroComptransversalModal && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  No se encontraron capacidades transversales con los filtros seleccionados
                </div>
              )}
              {capacidadtransversalesFiltradasModal.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {capacidadtransversalesFiltradasModal.length} capacidad{capacidadtransversalesFiltradasModal.length !== 1 ? 'es' : ''} transversal{capacidadtransversalesFiltradasModal.length !== 1 ? 'es' : ''} encontrada{capacidadtransversalesFiltradasModal.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => {
                  setFiltroGradoModal('')
                  setFiltroComptransversalModal('')
                  setComptransversalesFiltradasModalSelect(comptransversales)
                  setCapacidadtransversalesFiltradasModal(capacidadtransversales)
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

