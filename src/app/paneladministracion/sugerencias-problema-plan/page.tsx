'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function SugerenciasProblemaPlanPage() {
  const [sugerencias, setSugerencias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchSugerencias = async () => {
    try {
      const response = await fetch('/api/admin/sugerencias-problema-plan')
      if (response.ok) {
        const data = await response.json()
        setSugerencias(data.sugerencias || [])
      }
    } catch (error) {
      console.error('Error al cargar sugerencias:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSugerencias()
  }, [])

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditing(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta sugerencia?')) return
    try {
      const response = await fetch(`/api/admin/sugerencias-problema-plan?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) fetchSugerencias()
      else alert('Error al eliminar sugerencia')
    } catch {
      alert('Error al eliminar sugerencia')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      if (!editing) delete data.id

      const response = await fetch('/api/admin/sugerencias-problema-plan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setModalOpen(false)
        fetchSugerencias()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar sugerencia')
      }
    } catch {
      alert('Error al guardar sugerencia')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) =>
        value?.length > 120 ? `${value.substring(0, 120)}…` : value || '-'
    }
  ]

  const fields = editing
    ? [
        { key: 'id', label: 'ID', type: 'number' as const, required: false, disabled: true },
        {
          key: 'descripcion',
          label: 'Descripción',
          type: 'textarea' as const,
          required: true,
          rows: 5
        }
      ]
    : [
        {
          key: 'descripcion',
          label: 'Descripción',
          type: 'textarea' as const,
          required: true,
          rows: 5
        }
      ]

  return (
    <>
      <CRUDTable
        title="Sugerencias — Problema / Campo temático (Plan anual)"
        columns={columns}
        data={sugerencias}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editing}
        title={editing ? 'Editar sugerencia' : 'Crear sugerencia'}
        loading={saving}
      />
    </>
  )
}
