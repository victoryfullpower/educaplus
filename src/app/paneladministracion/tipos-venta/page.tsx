'use client'

import { useMemo, useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

type TipoVentaRow = {
  id: number
  descripcion: string
  estado: string
}

export default function TiposVentaPage() {
  const [tiposVenta, setTiposVenta] = useState<TipoVentaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TipoVentaRow | null>(null)

  const fetchTiposVenta = async () => {
    try {
      const response = await fetch('/api/admin/tipos-venta')
      if (response.ok) {
        const data = await response.json()
        setTiposVenta(data.tiposVenta || [])
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Error al cargar tipos de venta')
      }
    } catch {
      alert('Error al cargar tipos de venta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTiposVenta()
  }, [])

  const baseFields = useMemo(
    () => [
      { key: 'descripcion', label: 'Descripción', type: 'text' as const, required: true },
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
    ],
    []
  )

  const emptyCreate = useMemo(() => ({ estado: 'activo' as const }), [])

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (row: TipoVentaRow) => {
    setEditing(row)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de venta?')) return
    try {
      const response = await fetch(`/api/admin/tipos-venta?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchTiposVenta()
      else alert('Error al eliminar')
    } catch {
      alert('Error al eliminar')
    }
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const url = '/api/admin/tipos-venta'
      const method = editing ? 'PUT' : 'POST'
      const payload = { ...data }
      if (!editing) {
        delete payload.id
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        setModalOpen(false)
        setEditing(null)
        fetchTiposVenta()
        return
      }
      const err = await response.json().catch(() => ({}))
      alert(err.error || 'Error al guardar')
      throw new Error('__TIPOVENTA_SAVE_FAILED__')
    } catch (e) {
      if (e instanceof Error && e.message === '__TIPOVENTA_SAVE_FAILED__') {
        return
      }
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado', label: 'Estado' }
  ]

  const fields = editing
    ? [
        { key: 'id', label: 'ID', type: 'number' as const, required: false, disabled: true },
        ...baseFields
      ]
    : baseFields

  const initialModal = editing ?? emptyCreate

  return (
    <>
      <CRUDTable
        title="Tipos de venta"
        columns={columns}
        data={tiposVenta}
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
        initialData={initialModal}
        title={editing ? 'Editar tipo de venta' : 'Crear tipo de venta'}
        loading={saving}
      />
    </>
  )
}
