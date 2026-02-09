'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'

export default function CapacidadesPage() {
  const [capacidades, setCapacidades] = useState<any[]>([])
  const [capacidadesFiltradas, setCapacidadesFiltradas] = useState<any[]>([])
  const [competencias, setCompetencias] = useState<any[]>([])
  const [competenciasFiltradasListado, setCompetenciasFiltradasListado] = useState<any[]>([]) // Para el listado principal
  const [competenciasFiltradasModal, setCompetenciasFiltradasModal] = useState<any[]>([]) // Para el modal
  const [estandares, setEstandares] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [niveles, setNiveles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false)
  const [editingCapacidad, setEditingCapacidad] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Filtros para el listado principal
  const [filtroAreaListado, setFiltroAreaListado] = useState<string>('')
  const [filtroGradoListado, setFiltroGradoListado] = useState<string>('')
  const [filtroNivelListado, setFiltroNivelListado] = useState<string>('')
  const [filtroCompetenciaListado, setFiltroCompetenciaListado] = useState<string>('')
  
  // Filtros para el modal de selección de competencias
  const [filtroArea, setFiltroArea] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [filtroNivel, setFiltroNivel] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/areas').then(r => r.json()).then(d => setAreas(d.areas || []))
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
    fetch('/api/admin/niveles').then(r => r.json()).then(d => setNiveles(d.niveles || []))
    fetch('/api/admin/competencias').then(r => r.json()).then(d => {
      setCompetencias(d.competencias || [])
      setCompetenciasFiltradasListado(d.competencias || [])
      setCompetenciasFiltradasModal(d.competencias || [])
    })
    fetch('/api/admin/estandares').then(r => r.json()).then(d => setEstandares(d.estandares || []))
  }, [])


  const fetchCapacidades = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroCompetenciaListado) params.append('idcompetencia', filtroCompetenciaListado)
      
      const url = `/api/admin/capacidades${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCapacidades(data.capacidades || [])
        setCapacidadesFiltradas(data.capacidades || [])
      }
    } catch (error) {
      console.error('Error al cargar capacidades:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCapacidades()
  }, [filtroCompetenciaListado])

  // Cargar competencias filtradas cuando cambian los filtros del listado
  useEffect(() => {
    const cargarCompetenciasFiltradas = async () => {
      const params = new URLSearchParams()
      if (filtroAreaListado) params.append('idarea', filtroAreaListado)
      if (filtroGradoListado) params.append('idgrado', filtroGradoListado)
      if (filtroNivelListado) params.append('idnivel', filtroNivelListado)
      
      const url = `/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCompetenciasFiltradasListado(data.competencias || [])
          // Si hay una competencia seleccionada que no está en las filtradas, limpiarla
          if (filtroCompetenciaListado && !data.competencias.find((c: any) => c.id === parseInt(filtroCompetenciaListado))) {
            setFiltroCompetenciaListado('')
          }
        }
      } catch (error) {
        console.error('Error al cargar competencias filtradas:', error)
      }
    }
    cargarCompetenciasFiltradas()
  }, [filtroAreaListado, filtroGradoListado, filtroNivelListado])

  const handleCreate = () => {
    setEditingCapacidad(null)
    setFormData({})
    setErrors({})
    setFiltroArea('')
    setFiltroGrado('')
    setFiltroNivel('')
    setCompetenciasFiltradasModal(competencias)
    setModalOpen(true)
  }

  const handleEdit = async (capacidad: any) => {
    setEditingCapacidad(capacidad)
    setFormData({
      id: capacidad.id,
      descripcion: capacidad.descripcion,
      idcompetencia: capacidad.idcompetencia,
      idstandar: capacidad.idstandar
    })
    setErrors({})
    
    // Si hay una competencia seleccionada, cargar sus datos y establecer los filtros
    if (capacidad.idcompetencia && capacidad.competencia) {
      const comp = capacidad.competencia
      setFiltroArea(comp.idarea ? comp.idarea.toString() : '')
      setFiltroGrado(comp.idgrado ? comp.idgrado.toString() : '')
      setFiltroNivel(comp.idnivel ? comp.idnivel.toString() : '')
      
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
      setFiltroArea('')
      setFiltroGrado('')
      setFiltroNivel('')
      setCompetenciasFiltradasModal(competencias)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta capacidad?')) return
    try {
      const response = await fetch(`/api/admin/capacidades?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchCapacidades()
      else alert('Error al eliminar capacidad')
    } catch (error) {
      alert('Error al eliminar capacidad')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    // ID solo es requerido al editar
    if (editingCapacidad && !formData.id) newErrors.id = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.idcompetencia) newErrors.idcompetencia = 'Competencia es requerida'
    if (!formData.idstandar) newErrors.idstandar = 'Estándar es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/capacidades'
      const method = editingCapacidad ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      const dataToSend = { ...formData }
      if (!editingCapacidad) {
        delete dataToSend.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchCapacidades()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar capacidad')
      }
    } catch (error) {
      alert('Error al guardar capacidad')
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
    { key: 'competencia', label: 'Competencia', render: (value: any) => value?.descripcion?.substring(0, 40) || '-' },
    { key: 'estandar', label: 'Estándar', render: (value: any) => value?.descripcion?.substring(0, 40) || '-' }
  ]

  const handleLimpiarFiltrosListado = () => {
    setFiltroAreaListado('')
    setFiltroGradoListado('')
    setFiltroNivelListado('')
    setFiltroCompetenciaListado('')
  }

  return (
    <>
      {/* Filtros del listado principal */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Área</label>
            <select
              value={filtroAreaListado}
              onChange={(e) => setFiltroAreaListado(e.target.value)}
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
              value={filtroGradoListado}
              onChange={(e) => setFiltroGradoListado(e.target.value)}
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
              value={filtroNivelListado}
              onChange={(e) => setFiltroNivelListado(e.target.value)}
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
              value={filtroCompetenciaListado}
              onChange={(e) => setFiltroCompetenciaListado(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Todas las competencias</option>
              {competenciasFiltradasListado.map(comp => (
                <option key={comp.id} value={comp.id.toString()}>
                  {comp.id} - {comp.descripcion.substring(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleLimpiarFiltrosListado}
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
        {(filtroAreaListado || filtroGradoListado || filtroNivelListado || filtroCompetenciaListado) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {capacidadesFiltradas.length} capacidad{capacidadesFiltradas.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
      
      <CRUDTable
        title="Gestión de Capacidades"
        columns={columns}
        data={capacidadesFiltradas}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      
      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingCapacidad(null)
          setFiltroArea('')
          setFiltroGrado('')
          setFiltroNivel('')
          setCompetenciasFiltradasModal(competencias)
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingCapacidad ? 'Editar Capacidad' : 'Crear Capacidad'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingCapacidad(null)
                  setFiltroArea('')
                  setFiltroGrado('')
                  setFiltroNivel('')
                  setCompetenciasFiltradasModal(competencias)
                }} 
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* ID - Solo mostrar al editar */}
              {editingCapacidad && (
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

              {/* Estándar */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Estándar
                  <span className={modalStyles.required}>*</span>
                </label>
                <select
                  value={formData.idstandar || ''}
                  onChange={(e) => handleChange('idstandar', e.target.value)}
                  className={modalStyles.input}
                >
                  <option value="">Seleccionar...</option>
                  {estandares.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.id} - {e.descripcion.substring(0, 50)}
                    </option>
                  ))}
                </select>
                {errors.idstandar && <span className={modalStyles.error}>{errors.idstandar}</span>}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingCapacidad(null)
                    setFiltroArea('')
                    setFiltroGrado('')
                    setFiltroNivel('')
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
                value={filtroArea}
                onChange={(e) => {
                  setFiltroArea(e.target.value)
                  // Aplicar filtros automáticamente al cambiar
                  const newFiltroArea = e.target.value
                  const params = new URLSearchParams()
                  if (newFiltroArea) params.append('idarea', newFiltroArea)
                  if (filtroGrado) params.append('idgrado', filtroGrado)
                  if (filtroNivel) params.append('idnivel', filtroNivel)
                  
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
                value={filtroGrado}
                onChange={(e) => {
                  setFiltroGrado(e.target.value)
                  // Aplicar filtros automáticamente al cambiar
                  const newFiltroGrado = e.target.value
                  const params = new URLSearchParams()
                  if (filtroArea) params.append('idarea', filtroArea)
                  if (newFiltroGrado) params.append('idgrado', newFiltroGrado)
                  if (filtroNivel) params.append('idnivel', filtroNivel)
                  
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
                value={filtroNivel}
                onChange={(e) => {
                  setFiltroNivel(e.target.value)
                  // Aplicar filtros automáticamente al cambiar
                  const newFiltroNivel = e.target.value
                  const params = new URLSearchParams()
                  if (filtroArea) params.append('idarea', filtroArea)
                  if (filtroGrado) params.append('idgrado', filtroGrado)
                  if (newFiltroNivel) params.append('idnivel', newFiltroNivel)
                  
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
              {competenciasFiltradasModal.length === 0 && (filtroArea || filtroGrado || filtroNivel) && (
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
                  setFiltroArea('')
                  setFiltroGrado('')
                  setFiltroNivel('')
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
