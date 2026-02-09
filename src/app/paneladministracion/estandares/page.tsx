'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'

export default function EstandaresPage() {
  const [estandares, setEstandares] = useState<any[]>([])
  const [estandaresFiltrados, setEstandaresFiltrados] = useState<any[]>([])
  const [competencias, setCompetencias] = useState<any[]>([])
  const [competenciasFiltradas, setCompetenciasFiltradas] = useState<any[]>([])
  const [competenciasFiltradasModal, setCompetenciasFiltradasModal] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [niveles, setNiveles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false)
  const [editingEstandar, setEditingEstandar] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Filtros para el modal de selección de competencias
  const [filtroAreaModal, setFiltroAreaModal] = useState<string>('')
  const [filtroGradoModal, setFiltroGradoModal] = useState<string>('')
  const [filtroNivelModal, setFiltroNivelModal] = useState<string>('')

  // Filtros
  const [filtroArea, setFiltroArea] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/areas').then(r => r.json()).then(d => setAreas(d.areas || []))
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
    fetch('/api/admin/niveles').then(r => r.json()).then(d => setNiveles(d.niveles || []))
    fetch('/api/admin/competencias').then(r => r.json()).then(d => {
      setCompetencias(d.competencias || [])
      setCompetenciasFiltradas(d.competencias || [])
      setCompetenciasFiltradasModal(d.competencias || [])
    })
  }, [])

  // Cargar competencias filtradas cuando cambian área/grado/nivel
  useEffect(() => {
    const cargarCompetencias = async () => {
      const params = new URLSearchParams()
      if (filtroArea) params.append('idarea', filtroArea)
      if (filtroGrado) params.append('idgrado', filtroGrado)
      if (filtroNivel) params.append('idnivel', filtroNivel)
      
      const url = `/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCompetenciasFiltradas(data.competencias || [])
          if (filtroCompetencia && !data.competencias.find((c: any) => c.id === parseInt(filtroCompetencia))) {
            setFiltroCompetencia('')
          }
        }
      } catch (error) {
        console.error('Error al cargar competencias filtradas:', error)
      }
    }
    cargarCompetencias()
  }, [filtroArea, filtroGrado, filtroNivel])

  const fetchEstandares = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroCompetencia) params.append('idcompetencia', filtroCompetencia)
      
      const url = `/api/admin/estandares${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEstandares(data.estandares || [])
        setEstandaresFiltrados(data.estandares || [])
      }
    } catch (error) {
      console.error('Error al cargar estándares:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEstandares()
  }, [filtroCompetencia])

  const handleCreate = () => {
    setEditingEstandar(null)
    setFormData({})
    setErrors({})
    setFiltroAreaModal('')
    setFiltroGradoModal('')
    setFiltroNivelModal('')
    setCompetenciasFiltradasModal(competencias)
    setModalOpen(true)
  }

  const handleEdit = async (estandar: any) => {
    setEditingEstandar(estandar)
    setFormData(estandar)
    setErrors({})
    
    // Si hay una competencia seleccionada, cargar sus datos y establecer los filtros
    if (estandar.idcompetencia && estandar.competencia) {
      const comp = estandar.competencia
      setFiltroAreaModal(comp.idarea ? comp.idarea.toString() : '')
      setFiltroGradoModal(comp.idgrado ? comp.idgrado.toString() : '')
      setFiltroNivelModal(comp.idnivel ? comp.idnivel.toString() : '')
      
      // Cargar competencias filtradas con estos valores
      const params = new URLSearchParams()
      if (comp.idarea) params.append('idarea', comp.idarea.toString())
      if (comp.idgrado) params.append('idgrado', comp.idgrado.toString())
      if (comp.idnivel) params.append('idnivel', comp.idnivel.toString())
      
      const url = `/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCompetenciasFiltradasModal(data.competencias || [])
        }
      } catch (error) {
        console.error('Error al cargar competencias filtradas:', error)
        setCompetenciasFiltradasModal(competencias)
      }
    } else {
      setFiltroAreaModal('')
      setFiltroGradoModal('')
      setFiltroNivelModal('')
      setCompetenciasFiltradasModal(competencias)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este estándar?')) return
    try {
      const response = await fetch(`/api/admin/estandares?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchEstandares()
      else alert('Error al eliminar estándar')
    } catch (error) {
      alert('Error al eliminar estándar')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (formData.ordenamiento === undefined || formData.ordenamiento === '') newErrors.ordenamiento = 'Ordenamiento es requerido'
    if (!formData.idcompetencia) newErrors.idcompetencia = 'Competencia es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/estandares'
      const method = editingEstandar ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      const dataToSend = { ...formData }
      if (!editingEstandar) {
        delete dataToSend.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchEstandares()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar estándar')
      }
    } catch (error) {
      alert('Error al guardar estándar')
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
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'ordenamiento', label: 'Ordenamiento' },
    { key: 'competencia', label: 'Competencia', render: (value: any) => value?.descripcion?.substring(0, 50) || '-' }
  ]


  const handleClearFilters = () => {
    setFiltroArea('')
    setFiltroGrado('')
    setFiltroNivel('')
    setFiltroCompetencia('')
  }

  return (
    <>
      {/* Filtros */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Área</label>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todas las áreas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id.toString()}>{area.descripcion}</option>
              ))}
            </select>
          </div>
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Nivel</label>
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todos los niveles</option>
              {niveles.map(nivel => (
                <option key={nivel.id} value={nivel.id.toString()}>{nivel.descripcion}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Competencia</label>
            <select
              value={filtroCompetencia}
              onChange={(e) => setFiltroCompetencia(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={!filtroArea && !filtroGrado && !filtroNivel}
            >
              <option value="">Todas las competencias</option>
              {competenciasFiltradas.map(comp => (
                <option key={comp.id} value={comp.id.toString()}>
                  {comp.id} - {comp.descripcion.substring(0, 60)}
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
        {(filtroArea || filtroGrado || filtroNivel || filtroCompetencia) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {estandaresFiltrados.length} estándar{estandaresFiltrados.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      <CRUDTable
        title="Gestión de Estándares"
        columns={columns}
        data={estandaresFiltrados}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingEstandar(null)
          setFiltroAreaModal('')
          setFiltroGradoModal('')
          setFiltroNivelModal('')
          setCompetenciasFiltradasModal(competencias)
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingEstandar ? 'Editar Estándar' : 'Crear Estándar'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingEstandar(null)
                  setFiltroAreaModal('')
                  setFiltroGradoModal('')
                  setFiltroNivelModal('')
                  setCompetenciasFiltradasModal(competencias)
                }} 
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* ID - Solo mostrar al editar */}
              {editingEstandar && (
                <div className={modalStyles.field}>
                  <label className={modalStyles.label}>
                    ID
                  </label>
                  <input
                    type="number"
                    value={formData.id || ''}
                    onChange={(e) => handleChange('id', e.target.value === '' ? '' : Number(e.target.value))}
                    className={modalStyles.input}
                    disabled={true}
                  />
                  {errors.id && <span className={modalStyles.error}>{errors.id}</span>}
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

              {/* Ordenamiento */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Ordenamiento
                  <span className={modalStyles.required}>*</span>
                </label>
                <input
                  type="number"
                  value={formData.ordenamiento || ''}
                  onChange={(e) => handleChange('ordenamiento', e.target.value === '' ? '' : Number(e.target.value))}
                  className={modalStyles.input}
                />
                {errors.ordenamiento && <span className={modalStyles.error}>{errors.ordenamiento}</span>}
              </div>

              {/* Competencia con botón para abrir modal de selección */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Competencia
                  <span className={modalStyles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.idcompetencia ? (competencias.find(c => c.id === parseInt(formData.idcompetencia))?.descripcion || `ID: ${formData.idcompetencia}`) : ''}
                    readOnly
                    className={modalStyles.input}
                    placeholder="Selecciona una competencia"
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
                {errors.idcompetencia && <span className={modalStyles.error}>{errors.idcompetencia}</span>}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingEstandar(null)
                    setFiltroAreaModal('')
                    setFiltroGradoModal('')
                    setFiltroNivelModal('')
                    setCompetenciasFiltradasModal(competencias)
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

      {/* Modal de selección de competencias */}
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
                Seleccionar Competencia
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
                Área
              </label>
              <select
                value={filtroAreaModal}
                onChange={(e) => {
                  setFiltroAreaModal(e.target.value)
                  const params = new URLSearchParams()
                  if (e.target.value) params.append('idarea', e.target.value)
                  if (filtroGradoModal) params.append('idgrado', filtroGradoModal)
                  if (filtroNivelModal) params.append('idnivel', filtroNivelModal)
                  
                  fetch(`/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`)
                    .then(r => r.json())
                    .then(d => setCompetenciasFiltradasModal(d.competencias || []))
                    .catch(err => console.error('Error al filtrar competencias:', err))
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todas las áreas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id.toString()}>{area.descripcion}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Grado
              </label>
              <select
                value={filtroGradoModal}
                onChange={(e) => {
                  setFiltroGradoModal(e.target.value)
                  const params = new URLSearchParams()
                  if (filtroAreaModal) params.append('idarea', filtroAreaModal)
                  if (e.target.value) params.append('idgrado', e.target.value)
                  if (filtroNivelModal) params.append('idnivel', filtroNivelModal)
                  
                  fetch(`/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`)
                    .then(r => r.json())
                    .then(d => setCompetenciasFiltradasModal(d.competencias || []))
                    .catch(err => console.error('Error al filtrar competencias:', err))
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
                Nivel
              </label>
              <select
                value={filtroNivelModal}
                onChange={(e) => {
                  setFiltroNivelModal(e.target.value)
                  const params = new URLSearchParams()
                  if (filtroAreaModal) params.append('idarea', filtroAreaModal)
                  if (filtroGradoModal) params.append('idgrado', filtroGradoModal)
                  if (e.target.value) params.append('idnivel', e.target.value)
                  
                  fetch(`/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`)
                    .then(r => r.json())
                    .then(d => setCompetenciasFiltradasModal(d.competencias || []))
                    .catch(err => console.error('Error al filtrar competencias:', err))
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos los niveles</option>
                {niveles.map(nivel => (
                  <option key={nivel.id} value={nivel.id.toString()}>{nivel.descripcion}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Competencia
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <select
                value={formData.idcompetencia || ''}
                onChange={(e) => {
                  handleChange('idcompetencia', e.target.value)
                  if (e.target.value) {
                    // Cerrar el modal cuando se selecciona una competencia
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
                <option value="">Seleccionar competencia...</option>
                {competenciasFiltradasModal.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.descripcion}
                  </option>
                ))}
              </select>
              {competenciasFiltradasModal.length === 0 && (filtroAreaModal || filtroGradoModal || filtroNivelModal) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  No se encontraron competencias con los filtros seleccionados
                </div>
              )}
              {competenciasFiltradasModal.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {competenciasFiltradasModal.length} competencia{competenciasFiltradasModal.length !== 1 ? 's' : ''} encontrada{competenciasFiltradasModal.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => {
                  setFiltroAreaModal('')
                  setFiltroGradoModal('')
                  setFiltroNivelModal('')
                  setCompetenciasFiltradasModal(competencias)
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

