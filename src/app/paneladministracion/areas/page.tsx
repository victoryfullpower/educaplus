'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function AreasPage() {
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchAreas = async () => {
    try {
      const response = await fetch('/api/admin/areas')
      if (response.ok) {
        const data = await response.json()
        setAreas(data.areas || [])
      }
    } catch (error) {
      console.error('Error al cargar áreas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAreas()
  }, [])

  const handleCreate = () => {
    setEditingArea(null)
    setModalOpen(true)
  }

  const handleEdit = (area: any) => {
    setEditingArea(area)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta área?')) return
    try {
      const response = await fetch(`/api/admin/areas?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchAreas()
      else alert('Error al eliminar área')
    } catch (error) {
      alert('Error al eliminar área')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/areas'
      const method = editingArea ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      if (!editingArea) {
        delete data.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchAreas()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar área')
      }
    } catch (error) {
      alert('Error al guardar área')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'sesionx2', label: 'Sesión x2', render: (value: boolean) => value === true ? 'Sí' : 'No' }
  ]

  // Filtrar campos: ocultar ID al crear, mostrar solo al editar
  const getFields = () => {
    const baseFields = [
      { key: 'descripcion', label: 'Descripción', type: 'text' as const, required: true },
      { key: 'sesionx2', label: 'Sesión x2', type: 'checkbox' as const, required: false }
    ]
    
    // Solo agregar ID cuando se está editando
    if (editingArea) {
      return [
        { key: 'id', label: 'ID', type: 'number' as const, required: false, disabled: true },
        ...baseFields
      ]
    }
    
    return baseFields
  }
  
  const fields = getFields()

  return (
    <>
      <CRUDTable
        title="Gestión de Áreas"
        columns={columns}
        data={areas}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingArea(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingArea}
        title={editingArea ? 'Editar Área' : 'Crear Área'}
        loading={saving}
      />
    </>
  )
}

