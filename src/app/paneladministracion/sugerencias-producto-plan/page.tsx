'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'

export default function SugerenciasProductoPlanPage() {
  const [sugerencias, setSugerencias] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filtroArea, setFiltroArea] = useState('')

  useEffect(() => {
    fetch('/api/admin/areas')
      .then((r) => r.json())
      .then((d) => setAreas(d.areas || []))
      .catch(() => setAreas([]))
  }, [])

  const fetchSugerencias = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroArea) params.append('idarea', filtroArea)
      const url = `/api/admin/sugerencias-producto-plan${
        params.toString() ? `?${params.toString()}` : ''
      }`
      const response = await fetch(url)
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
  }, [filtroArea])

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditing({
      ...item,
      idarea: item.idarea ?? item.area?.id ?? ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta sugerencia?')) return
    try {
      const response = await fetch(`/api/admin/sugerencias-producto-plan?id=${id}`, {
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
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        descripcion: data.descripcion,
        idarea: data.idarea
      }

      const response = await fetch('/api/admin/sugerencias-producto-plan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        setModalOpen(false)
        setEditing(null)
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
      key: 'area',
      label: 'Área',
      render: (_: unknown, row: any) => row.area?.descripcion || '—'
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (value: string) =>
        value?.length > 120 ? `${value.substring(0, 120)}…` : value || '-'
    }
  ]

  const areaOptions = areas.map((a) => ({ value: a.id, label: a.descripcion }))

  const fields = editing
    ? [
        { key: 'id', label: 'ID', type: 'number' as const, required: false, disabled: true },
        {
          key: 'idarea',
          label: 'Área',
          type: 'select' as const,
          required: true,
          options: areaOptions
        },
        {
          key: 'descripcion',
          label: 'Descripción',
          type: 'textarea' as const,
          required: true,
          rows: 4
        }
      ]
    : [
        {
          key: 'idarea',
          label: 'Área',
          type: 'select' as const,
          required: true,
          options: areaOptions
        },
        {
          key: 'descripcion',
          label: 'Descripción',
          type: 'textarea' as const,
          required: true,
          rows: 4
        }
      ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label htmlFor="filtro-area-producto" style={{ fontWeight: 600 }}>
          Filtrar por área:
        </label>
        <select
          id="filtro-area-producto"
          value={filtroArea}
          onChange={(e) => setFiltroArea(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, minWidth: 220 }}
        >
          <option value="">Todas las áreas</option>
          {areas.map((area) => (
            <option key={area.id} value={String(area.id)}>
              {area.descripcion}
            </option>
          ))}
        </select>
      </div>
      <CRUDTable
        title="Sugerencias — Producto (Plan anual)"
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
