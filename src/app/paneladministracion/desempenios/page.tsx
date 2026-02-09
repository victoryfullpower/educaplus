'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import modalStyles from '@/components/admin/CRUDModal.module.css'

export default function DesempeniosPage() {
  const [desempenios, setDesempenios] = useState<any[]>([])
  const [desempeniosFiltrados, setDesempeniosFiltrados] = useState<any[]>([])
  const [capacidades, setCapacidades] = useState<any[]>([])
  const [capacidadesFiltradas, setCapacidadesFiltradas] = useState<any[]>([])
  const [capacidadesFiltradasModal, setCapacidadesFiltradasModal] = useState<any[]>([])
  const [competencias, setCompetencias] = useState<any[]>([])
  const [competenciasFiltradas, setCompetenciasFiltradas] = useState<any[]>([])
  const [competenciasFiltradasModal, setCompetenciasFiltradasModal] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [niveles, setNiveles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false)
  const [editingDesempenio, setEditingDesempenio] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filtros del listado principal
  const [filtroArea, setFiltroArea] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [filtroNivel, setFiltroNivel] = useState<string>('')
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('')
  const [filtroCapacidad, setFiltroCapacidad] = useState<string>('')

  // Filtros para el modal de selección de capacidades
  const [filtroAreaModal, setFiltroAreaModal] = useState<string>('')
  const [filtroGradoModal, setFiltroGradoModal] = useState<string>('')
  const [filtroNivelModal, setFiltroNivelModal] = useState<string>('')
  const [filtroCompetenciaModal, setFiltroCompetenciaModal] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/areas').then(r => r.json()).then(d => setAreas(d.areas || []))
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
    fetch('/api/admin/niveles').then(r => r.json()).then(d => setNiveles(d.niveles || []))
    fetch('/api/admin/competencias').then(r => r.json()).then(d => {
      setCompetencias(d.competencias || [])
      setCompetenciasFiltradas(d.competencias || [])
      setCompetenciasFiltradasModal(d.competencias || [])
    })
    fetch('/api/admin/capacidades').then(r => r.json()).then(d => setCapacidades(d.capacidades || []))
  }, [])

  // Cargar competencias filtradas cuando cambian área/grado/nivel (listado)
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

  // Cargar capacidades filtradas cuando cambia la competencia (listado)
  useEffect(() => {
    const cargarCapacidades = async () => {
      if (!filtroCompetencia) {
        setCapacidadesFiltradas([])
        return
      }

      const params = new URLSearchParams()
      params.append('idcompetencia', filtroCompetencia)
      
      const url = `/api/admin/capacidades?${params.toString()}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCapacidadesFiltradas(data.capacidades || [])
          if (filtroCapacidad && !data.capacidades.find((c: any) => c.id === parseInt(filtroCapacidad))) {
            setFiltroCapacidad('')
          }
        }
      } catch (error) {
        console.error('Error al cargar capacidades filtradas:', error)
      }
    }
    cargarCapacidades()
  }, [filtroCompetencia])

  // Cargar competencias filtradas cuando cambian área/grado/nivel (modal)
  useEffect(() => {
    if (!modalFiltroOpen) return

    const cargarCompetenciasModal = async () => {
      const params = new URLSearchParams()
      if (filtroAreaModal) params.append('idarea', filtroAreaModal)
      if (filtroGradoModal) params.append('idgrado', filtroGradoModal)
      if (filtroNivelModal) params.append('idnivel', filtroNivelModal)
      
      const url = `/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCompetenciasFiltradasModal(data.competencias || [])
          if (filtroCompetenciaModal && !data.competencias.find((c: any) => c.id === parseInt(filtroCompetenciaModal))) {
            setFiltroCompetenciaModal('')
          }
        }
      } catch (error) {
        console.error('Error al cargar competencias filtradas:', error)
      }
    }
    cargarCompetenciasModal()
  }, [filtroAreaModal, filtroGradoModal, filtroNivelModal, modalFiltroOpen])

  // Cargar capacidades filtradas cuando cambia la competencia (modal)
  useEffect(() => {
    if (!modalFiltroOpen) return

    const cargarCapacidadesModal = async () => {
      if (!filtroCompetenciaModal) {
        setCapacidadesFiltradasModal([])
        return
      }

      const params = new URLSearchParams()
      params.append('idcompetencia', filtroCompetenciaModal)
      
      const url = `/api/admin/capacidades?${params.toString()}`
      try {
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setCapacidadesFiltradasModal(data.capacidades || [])
        }
      } catch (error) {
        console.error('Error al cargar capacidades filtradas:', error)
      }
    }
    cargarCapacidadesModal()
  }, [filtroCompetenciaModal, modalFiltroOpen])

  const fetchDesempenios = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroCapacidad) params.append('idcapacidad', filtroCapacidad)
      
      const url = `/api/admin/desempenios${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDesempenios(data.desempenios || [])
        setDesempeniosFiltrados(data.desempenios || [])
      }
    } catch (error) {
      console.error('Error al cargar desempeños:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDesempenios()
  }, [filtroCapacidad])

  const handleCreate = () => {
    setEditingDesempenio(null)
    setFormData({})
    setErrors({})
    setFiltroAreaModal('')
    setFiltroGradoModal('')
    setFiltroNivelModal('')
    setFiltroCompetenciaModal('')
    setCapacidadesFiltradasModal(capacidades)
    setModalOpen(true)
  }

  const handleEdit = async (desempenio: any) => {
    setEditingDesempenio(desempenio)
    setFormData({
      id: desempenio.id,
      descripcion: desempenio.descripcion,
      idcapacidad: desempenio.idcapacidad
    })
    setErrors({})
    
    // Si hay una capacidad seleccionada, establecer los filtros según su competencia
    if (desempenio.idcapacidad && desempenio.capacidad && desempenio.capacidad.competencia) {
      const comp = desempenio.capacidad.competencia
      setFiltroAreaModal(comp.idarea ? comp.idarea.toString() : '')
      setFiltroGradoModal(comp.idgrado ? comp.idgrado.toString() : '')
      setFiltroNivelModal(comp.idnivel ? comp.idnivel.toString() : '')
      setFiltroCompetenciaModal(comp.id ? comp.id.toString() : '')
      
      // Cargar competencias filtradas
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
          
          // Cargar capacidades filtradas
          const paramsCap = new URLSearchParams()
          paramsCap.append('idcompetencia', comp.id.toString())
          const urlCap = `/api/admin/capacidades?${paramsCap.toString()}`
          const responseCap = await fetch(urlCap)
          if (responseCap.ok) {
            const dataCap = await responseCap.json()
            setCapacidadesFiltradasModal(dataCap.capacidades || [])
          }
        }
      } catch (error) {
        console.error('Error al cargar datos filtrados:', error)
        setCompetenciasFiltradasModal(competencias)
        setCapacidadesFiltradasModal(capacidades)
      }
    } else {
      setFiltroAreaModal('')
      setFiltroGradoModal('')
      setFiltroNivelModal('')
      setFiltroCompetenciaModal('')
      setCompetenciasFiltradasModal(competencias)
      setCapacidadesFiltradasModal(capacidades)
    }
    
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este desempeño?')) return
    try {
      const response = await fetch(`/api/admin/desempenios?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchDesempenios()
      else alert('Error al eliminar desempeño')
    } catch (error) {
      alert('Error al eliminar desempeño')
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.id) newErrors.id = 'ID es requerido'
    if (!formData.descripcion) newErrors.descripcion = 'Descripción es requerida'
    if (!formData.idcapacidad) newErrors.idcapacidad = 'Capacidad es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const url = '/api/admin/desempenios'
      const method = editingDesempenio ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      const dataToSend = { ...formData }
      if (!editingDesempenio) {
        delete dataToSend.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchDesempenios()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar desempeño')
      }
    } catch (error) {
      alert('Error al guardar desempeño')
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

  const handleLimpiarFiltros = () => {
    setFiltroArea('')
    setFiltroGrado('')
    setFiltroNivel('')
    setFiltroCompetencia('')
    setFiltroCapacidad('')
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'capacidad', label: 'Capacidad', render: (value: any) => value?.descripcion?.substring(0, 50) || '-' }
  ]

  return (
    <>
      {/* Filtros del listado principal */}
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Capacidad</label>
            <select
              value={filtroCapacidad}
              onChange={(e) => setFiltroCapacidad(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              disabled={!filtroCompetencia}
            >
              <option value="">Todas las capacidades</option>
              {capacidadesFiltradas.map(cap => (
                <option key={cap.id} value={cap.id.toString()}>
                  {cap.id} - {cap.descripcion.substring(0, 60)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleLimpiarFiltros}
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
        {(filtroArea || filtroGrado || filtroNivel || filtroCompetencia || filtroCapacidad) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {desempeniosFiltrados.length} desempeño{desempeniosFiltrados.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <CRUDTable
        title="Gestión de Desempeños"
        columns={columns}
        data={desempeniosFiltrados}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />

      {/* Modal personalizado */}
      {modalOpen && (
        <div className={modalStyles.overlay} onClick={() => {
          setModalOpen(false)
          setEditingDesempenio(null)
          setFiltroAreaModal('')
          setFiltroGradoModal('')
          setFiltroNivelModal('')
          setFiltroCompetenciaModal('')
          setCapacidadesFiltradasModal(capacidades)
        }}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h2 className={modalStyles.title}>
                {editingDesempenio ? 'Editar Desempeño' : 'Crear Desempeño'}
              </h2>
              <button 
                onClick={() => {
                  setModalOpen(false)
                  setEditingDesempenio(null)
                  setFiltroAreaModal('')
                  setFiltroGradoModal('')
                  setFiltroNivelModal('')
                  setFiltroCompetenciaModal('')
                  setCapacidadesFiltradasModal(capacidades)
                }} 
                className={modalStyles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={modalStyles.form}>
              {/* ID - Solo mostrar al editar */}
              {editingDesempenio && (
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

              {/* Capacidad con botón para abrir modal de selección */}
              <div className={modalStyles.field}>
                <label className={modalStyles.label}>
                  Capacidad
                  <span className={modalStyles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.idcapacidad ? (capacidades.find(c => c.id === parseInt(formData.idcapacidad))?.descripcion || `ID: ${formData.idcapacidad}`) : ''}
                    readOnly
                    className={modalStyles.input}
                    placeholder="Selecciona una capacidad"
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
                {errors.idcapacidad && <span className={modalStyles.error}>{errors.idcapacidad}</span>}
              </div>

              <div className={modalStyles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    setEditingDesempenio(null)
                    setFiltroAreaModal('')
                    setFiltroGradoModal('')
                    setFiltroNivelModal('')
                    setFiltroCompetenciaModal('')
                    setCapacidadesFiltradasModal(capacidades)
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

      {/* Modal de selección de capacidad */}
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
                Seleccionar Capacidad
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
              </label>
              <select
                value={filtroCompetenciaModal}
                onChange={(e) => {
                  setFiltroCompetenciaModal(e.target.value)
                  if (e.target.value) {
                    const params = new URLSearchParams()
                    params.append('idcompetencia', e.target.value)
                    
                    fetch(`/api/admin/capacidades?${params.toString()}`)
                      .then(r => r.json())
                      .then(d => setCapacidadesFiltradasModal(d.capacidades || []))
                      .catch(err => console.error('Error al filtrar capacidades:', err))
                  } else {
                    setCapacidadesFiltradasModal([])
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
                {competenciasFiltradasModal.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.id} - {comp.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Capacidad
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <select
                value={formData.idcapacidad || ''}
                onChange={(e) => {
                  handleChange('idcapacidad', e.target.value)
                  if (e.target.value) {
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
                disabled={!filtroCompetenciaModal}
              >
                <option value="">Seleccionar capacidad...</option>
                {capacidadesFiltradasModal.map(cap => (
                  <option key={cap.id} value={cap.id}>
                    {cap.id} - {cap.descripcion}
                  </option>
                ))}
              </select>
              {capacidadesFiltradasModal.length === 0 && filtroCompetenciaModal && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  No se encontraron capacidades con los filtros seleccionados
                </div>
              )}
              {capacidadesFiltradasModal.length > 0 && filtroCompetenciaModal && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  {capacidadesFiltradasModal.length} capacidad{capacidadesFiltradasModal.length !== 1 ? 'es' : ''} encontrada{capacidadesFiltradasModal.length !== 1 ? 's' : ''}
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
                  setFiltroCompetenciaModal('')
                  setCompetenciasFiltradasModal(competencias)
                  setCapacidadesFiltradasModal(capacidades)
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
