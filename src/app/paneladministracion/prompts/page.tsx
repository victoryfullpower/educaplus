'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/admin/prompts')
      console.log('Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Prompts recibidos:', data.prompts?.length || 0, data.prompts)
        setPrompts(data.prompts || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        alert(`Error al cargar prompts: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error al cargar prompts:', error)
      alert('Error al cargar prompts: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  const handleCreate = () => {
    setEditingPrompt(null)
    setModalOpen(true)
  }

  const handleEdit = (prompt: any) => {
    setEditingPrompt(prompt)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este prompt?')) return
    try {
      const response = await fetch(`/api/admin/prompts?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchPrompts()
      else alert('Error al eliminar prompt')
    } catch (error) {
      alert('Error al eliminar prompt')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/prompts'
      const method = editingPrompt ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchPrompts()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar prompt')
      }
    } catch (error) {
      alert('Error al guardar prompt')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'idprompt', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado', label: 'Estado' },
    { key: 'fechacreacion', label: 'Fecha Creación' },
    { key: 'fechamodificacion', label: 'Fecha Modificación' }
  ]

  const fields = [
    { key: 'idprompt', label: 'ID', type: 'number' as const, required: false, disabled: true },
    { key: 'descripcion', label: 'Descripción', type: 'text' as const, required: true },
    { 
      key: 'contenido', 
      label: 'Contenido del Prompt', 
      type: 'textarea' as const, 
      required: true,
      rows: 15
    },
    { 
      key: 'estado', 
      label: 'Estado', 
      type: 'select' as const, 
      required: true,
      options: [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' }
      ]
    }
  ]

  // Formatear fechas para mostrar y agregar campo id para compatibilidad con CRUDTable
  const formattedPrompts = prompts.map(prompt => ({
    ...prompt,
    id: prompt.idprompt, // CRUDTable espera 'id' para las acciones
    fechacreacion: new Date(prompt.fechacreacion).toLocaleString('es-PE'),
    fechamodificacion: new Date(prompt.fechamodificacion).toLocaleString('es-PE')
  }))

  return (
    <>
      <CRUDTable
        title="Gestión de Prompts"
        columns={columns}
        data={formattedPrompts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPrompt(null) }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingPrompt}
        title={editingPrompt ? 'Editar Prompt' : 'Crear Prompt'}
        loading={saving}
      />
    </>
  )
}

