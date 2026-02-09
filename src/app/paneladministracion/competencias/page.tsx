'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function CompetenciasPage() {
  const [competencias, setCompetencias] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [grados, setGrados] = useState<any[]>([])
  const [niveles, setNiveles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCompetencia, setEditingCompetencia] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  
  // Filtros
  const [filtroArea, setFiltroArea] = useState<string>('')
  const [filtroGrado, setFiltroGrado] = useState<string>('')
  const [filtroNivel, setFiltroNivel] = useState<string>('')

  useEffect(() => {
    fetch('/api/admin/areas').then(r => r.json()).then(d => setAreas(d.areas || []))
    fetch('/api/admin/grados').then(r => r.json()).then(d => setGrados(d.grados || []))
    fetch('/api/admin/niveles').then(r => r.json()).then(d => setNiveles(d.niveles || []))
  }, [])

  const fetchCompetencias = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroArea) params.append('idarea', filtroArea)
      if (filtroGrado) params.append('idgrado', filtroGrado)
      if (filtroNivel) params.append('idnivel', filtroNivel)
      
      const url = `/api/admin/competencias${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCompetencias(data.competencias || [])
      }
    } catch (error) {
      console.error('Error al cargar competencias:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompetencias()
  }, [filtroArea, filtroGrado, filtroNivel])

  const handleCreate = () => {
    setEditingCompetencia(null)
    setModalOpen(true)
  }

  const handleEdit = (competencia: any) => {
    setEditingCompetencia(competencia)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta competencia?')) return
    try {
      const response = await fetch(`/api/admin/competencias?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchCompetencias()
      else alert('Error al eliminar competencia')
    } catch (error) {
      alert('Error al eliminar competencia')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/competencias'
      const method = editingCompetencia ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      if (!editingCompetencia) {
        delete data.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchCompetencias()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar competencia')
      }
    } catch (error) {
      alert('Error al guardar competencia')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'numeroCompetencia', label: 'N° Competencia' },
    { key: 'transversal', label: 'Transversal', render: (value: any) => value ? 'Sí' : 'No' },
    { key: 'area', label: 'Área', render: (value: any) => value?.descripcion || '-' },
    { key: 'grado', label: 'Grado', render: (value: any) => value?.descripcion || '-' },
    { key: 'nivel', label: 'Nivel', render: (value: any) => value?.descripcion || '-' }
  ]

  // Filtrar campos: ocultar ID al crear, mostrar solo al editar
  const getFields = () => {
    const baseFields = [
      { key: 'descripcion', label: 'Descripción', type: 'textarea' as const, required: true },
      { key: 'numeroCompetencia', label: 'Número Competencia', type: 'number' as const, required: true },
      { key: 'transversal', label: 'Transversal', type: 'checkbox' as const, required: false },
      {
        key: 'idarea',
        label: 'Área',
        type: 'select' as const,
        required: true,
        options: areas.map(a => ({ value: a.id, label: a.descripcion }))
      },
      {
        key: 'idgrado',
        label: 'Grado',
        type: 'select' as const,
        required: true,
        options: grados.map(g => ({ value: g.id, label: g.descripcion || `Grado ${g.id}` }))
      },
      {
        key: 'idnivel',
        label: 'Nivel',
        type: 'select' as const,
        required: true,
        options: niveles.map(n => ({ value: n.id, label: n.descripcion }))
      }
    ]
    
    // Solo agregar ID cuando se está editando
    if (editingCompetencia) {
      return [
        { key: 'id', label: 'ID', type: 'number' as const, required: false, disabled: true },
        ...baseFields
      ]
    }
    
    return baseFields
  }
  
  const fields = getFields()

  const handleClearFilters = () => {
    setFiltroArea('')
    setFiltroGrado('')
    setFiltroNivel('')
  }

  return (
    <>
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
        {(filtroArea || filtroGrado || filtroNivel) && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
            Mostrando {competencias.length} competencia{competencias.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      <CRUDTable
        title="Gestión de Competencias"
        columns={columns}
        data={competencias}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCompetencia(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingCompetencia}
        title={editingCompetencia ? 'Editar Competencia' : 'Crear Competencia'}
        loading={saving}
      />
    </>
  )
}

