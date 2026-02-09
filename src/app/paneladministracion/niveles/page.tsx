'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function NivelesPage() {
  const [niveles, setNiveles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingNivel, setEditingNivel] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchNiveles = async () => {
    try {
      const response = await fetch('/api/admin/niveles')
      if (response.ok) {
        const data = await response.json()
        setNiveles(data.niveles || [])
      }
    } catch (error) {
      console.error('Error al cargar niveles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNiveles()
  }, [])

  const handleCreate = () => {
    setEditingNivel(null)
    setModalOpen(true)
  }

  const handleEdit = (nivel: any) => {
    setEditingNivel(nivel)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este nivel?')) return
    try {
      const response = await fetch(`/api/admin/niveles?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchNiveles()
      else alert('Error al eliminar nivel')
    } catch (error) {
      alert('Error al eliminar nivel')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/niveles'
      const method = editingNivel ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      if (!editingNivel) {
        delete data.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchNiveles()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar nivel')
      }
    } catch (error) {
      alert('Error al guardar nivel')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' }
  ]

  // Filtrar campos: ocultar ID al crear, mostrar solo al editar
  const getFields = () => {
    const baseFields = [
      { key: 'descripcion', label: 'Descripción', type: 'text' as const, required: true }
    ]
    
    // Solo agregar ID cuando se está editando
    if (editingNivel) {
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
        title="Gestión de Niveles"
        columns={columns}
        data={niveles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingNivel(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingNivel}
        title={editingNivel ? 'Editar Nivel' : 'Crear Nivel'}
        loading={saving}
      />
    </>
  )
}

