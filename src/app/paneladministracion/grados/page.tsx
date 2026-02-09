'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function GradosPage() {
  const [grados, setGrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGrado, setEditingGrado] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchGrados = async () => {
    try {
      const response = await fetch('/api/admin/grados')
      if (response.ok) {
        const data = await response.json()
        setGrados(data.grados || [])
      }
    } catch (error) {
      console.error('Error al cargar grados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrados()
  }, [])

  const handleCreate = () => {
    setEditingGrado(null)
    setModalOpen(true)
  }

  const handleEdit = (grado: any) => {
    setEditingGrado(grado)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este grado?')) return
    try {
      const response = await fetch(`/api/admin/grados?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchGrados()
      else alert('Error al eliminar grado')
    } catch (error) {
      alert('Error al eliminar grado')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/grados'
      const method = editingGrado ? 'PUT' : 'POST'
      
      // Al crear, no enviar el campo ID ya que es autoincremental
      if (!editingGrado) {
        delete data.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchGrados()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar grado')
      }
    } catch (error) {
      alert('Error al guardar grado')
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
      { key: 'descripcion', label: 'Descripción', type: 'text' as const }
    ]
    
    // Solo agregar ID cuando se está editando
    if (editingGrado) {
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
        title="Gestión de Grados"
        columns={columns}
        data={grados}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGrado(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingGrado}
        title={editingGrado ? 'Editar Grado' : 'Crear Grado'}
        loading={saving}
      />
    </>
  )
}

