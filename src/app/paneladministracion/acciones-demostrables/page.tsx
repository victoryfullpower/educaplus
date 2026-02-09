'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function AccionesDemostrablesPage() {
  const [acciones, setAcciones] = useState<any[]>([])
  const [valores, setValores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccion, setEditingAccion] = useState<any>(null)
  const [saving, setSaving] = useState(false)

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

  const fetchAcciones = async () => {
    try {
      const response = await fetch('/api/admin/acciones-demostrables')
      if (response.ok) {
        const data = await response.json()
        setAcciones(data.acciones || [])
      }
    } catch (error) {
      console.error('Error al cargar acciones demostrables:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchValores()
    fetchAcciones()
  }, [])

  const handleCreate = () => {
    setEditingAccion(null)
    setModalOpen(true)
  }

  const handleEdit = (accion: any) => {
    setEditingAccion(accion)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta acción demostrable?')) return
    try {
      const response = await fetch(`/api/admin/acciones-demostrables?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchAcciones()
      else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar acción demostrable')
      }
    } catch (error) {
      alert('Error al eliminar acción demostrable')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/acciones-demostrables'
      const method = editingAccion ? 'PUT' : 'POST'
      // Asegurar que idvalor sea un número
      const submitData = {
        ...data,
        idvalor: typeof data.idvalor === 'string' ? parseInt(data.idvalor) : (data.idvalor || 1)
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchAcciones()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar acción demostrable')
      }
    } catch (error) {
      alert('Error al guardar acción demostrable')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'idactdemostrable', label: 'ID' },
    { key: 'descripcion', label: 'Descripción', render: (value: string) => value?.substring(0, 150) + (value?.length > 150 ? '...' : '') },
    { key: 'valor', label: 'Valor', render: (value: any) => value?.descripcion || '-' }
  ]

  const fields = [
    { key: 'idactdemostrable', label: 'ID', type: 'number' as const, required: false, disabled: true },
    { 
      key: 'descripcion', 
      label: 'Descripción', 
      type: 'textarea' as const, 
      required: true,
      rows: 5
    },
    { 
      key: 'idvalor', 
      label: 'Valor', 
      type: 'select' as const, 
      required: true,
      options: valores.map(v => ({ value: v.idvalor.toString(), label: `${v.idvalor} - ${v.descripcion}` }))
    }
  ]

  // Agregar campo id para compatibilidad con CRUDTable y convertir idvalor a string para el select
  const formattedAcciones = acciones.map(accion => ({
    ...accion,
    id: accion.idactdemostrable, // CRUDTable espera 'id' para las acciones
    idvalor: accion.idvalor?.toString() || accion.valor?.idvalor?.toString() || '1'
  }))

  return (
    <>
      <CRUDTable
        title="Gestión de Acciones Demostrables"
        columns={columns}
        data={formattedAcciones}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAccion(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingAccion}
        title={editingAccion ? 'Editar Acción Demostrable' : 'Crear Acción Demostrable'}
        loading={saving}
      />
    </>
  )
}

