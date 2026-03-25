'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import CRUDModal from '@/components/admin/CRUDModal'
import CRUDTable from '@/components/admin/CRUDTable'

type AreaComercialRow = {
  idareacomercial: number
  descripcion: string
  areaIds: number[]
  estado: 'activo' | 'inactivo'
  createdAt: string
  updatedAt: string
}

type AreaCatalogo = { id: number; descripcion: string }

export default function AreasComercialesPage() {
  const [areasComerciales, setAreasComerciales] = useState<AreaComercialRow[]>([])
  const [areasCatalogo, setAreasCatalogo] = useState<AreaCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAreaComercial, setEditingAreaComercial] = useState<any>(null)

  const descripcionPorAreaId = useMemo(() => {
    const m = new Map<number, string>()
    for (const a of areasCatalogo) m.set(a.id, a.descripcion)
    return m
  }, [areasCatalogo])

  const fetchData = useCallback(async () => {
    try {
      const [resC, resA] = await Promise.all([
        fetch('/api/admin/areas-comerciales'),
        fetch('/api/admin/areas')
      ])
      if (resC.ok) {
        const data = await resC.json()
        setAreasComerciales(data.areasComerciales || [])
      } else {
        alert('Error al cargar áreas comerciales')
      }
      if (resA.ok) {
        const data = await resA.json()
        setAreasCatalogo(data.areas || [])
      }
    } catch {
      alert('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const areaOptions = useMemo(
    () =>
      areasCatalogo.map((a) => ({
        value: a.id,
        label: a.descripcion
      })),
    [areasCatalogo]
  )

  const emptyCreateDefaults = useMemo(
    () => ({ areaIds: [] as number[], estado: 'activo' as const }),
    []
  )

  const handleCreate = () => {
    setEditingAreaComercial(null)
    setModalOpen(true)
  }

  const handleEdit = (item: any) => {
    const ids = Array.isArray(item.areaIds)
      ? item.areaIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n))
      : []
    setEditingAreaComercial({
      ...item,
      areaIds: ids
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta área comercial?')) return
    try {
      const response = await fetch(`/api/admin/areas-comerciales?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchData()
      else alert('Error al eliminar área comercial')
    } catch {
      alert('Error al eliminar área comercial')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/areas-comerciales'
      const method = editingAreaComercial ? 'PUT' : 'POST'
      const payload = { ...data }
      if (!editingAreaComercial) {
        delete payload.idareacomercial
      }
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setModalOpen(false)
        setEditingAreaComercial(null)
        fetchData()
        return
      }
      const errorData = await response.json().catch(() => ({}))
      alert(errorData.error || 'Error al guardar área comercial')
      throw new Error('__AREACOMERCIAL_SAVE_FAILED__')
    } catch (err) {
      if (err instanceof Error && err.message === '__AREACOMERCIAL_SAVE_FAILED__') {
        // ya se mostró alert arriba
      } else {
        alert('Error al guardar área comercial')
      }
    } finally {
      setSaving(false)
    }
  }

  const getFields = () => {
    const baseFields = [
      { key: 'descripcion', label: 'Descripción', type: 'text' as const, required: true },
      {
        key: 'areaIds',
        label: 'Áreas',
        type: 'multiselect' as const,
        required: true,
        options: areaOptions
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
    if (editingAreaComercial) {
      return [
        {
          key: 'idareacomercial',
          label: 'ID',
          type: 'number' as const,
          required: false,
          disabled: true
        },
        ...baseFields
      ]
    }
    return baseFields
  }

  const columns = [
    { key: 'idareacomercial', label: 'ID' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'areaIds',
      label: 'Áreas',
      render: (value: number[]) => {
        if (!Array.isArray(value) || value.length === 0) return '-'
        return value
          .map((id) => descripcionPorAreaId.get(Number(id)) ?? `(${id})`)
          .join(', ')
      }
    },
    { key: 'estado', label: 'Estado' }
  ]

  const dataForTable = areasComerciales.map((item) => ({
    ...item,
    id: item.idareacomercial
  }))

  const modalInitial = editingAreaComercial ?? emptyCreateDefaults

  return (
    <>
      <CRUDTable
        title="Gestión de Áreas Comerciales"
        columns={columns}
        data={dataForTable}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
      />
      <CRUDModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAreaComercial(null)
        }}
        onSubmit={handleSubmit}
        fields={getFields()}
        initialData={modalInitial}
        title={editingAreaComercial ? 'Editar Área Comercial' : 'Crear Área Comercial'}
        loading={saving}
      />
    </>
  )
}
