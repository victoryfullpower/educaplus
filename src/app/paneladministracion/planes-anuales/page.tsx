'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'

export default function PlanesAnualesPage() {
  const [planes, setPlanes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlanes = async () => {
    try {
      const response = await fetch('/api/admin/planes-anuales')
      if (response.ok) {
        const data = await response.json()
        setPlanes(data.planes || [])
      }
    } catch (error) {
      console.error('Error al cargar planes anuales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlanes()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este plan anual?')) return
    try {
      const response = await fetch(`/api/admin/planes-anuales?id=${id}`, { method: 'DELETE' })
      if (response.ok) fetchPlanes()
      else alert('Error al eliminar plan anual')
    } catch (error) {
      alert('Error al eliminar plan anual')
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'usuario',
      label: 'Usuario',
      render: (value: any) => value?.email || `ID: ${value?.id}`
    },
    { key: 'anio', label: 'Año' },
    {
      key: 'fechaHora',
      label: 'Fecha Creación',
      render: (value: string) => new Date(value).toLocaleString('es-ES')
    },
    {
      key: 'area',
      label: 'Área',
      render: (value: string) => value || '-'
    },
    {
      key: 'grado',
      label: 'Grado',
      render: (value: string) => value || '-'
    }
  ]

  return (
    <CRUDTable
      title="Gestión de Planes Anuales"
      columns={columns}
      data={planes}
      onEdit={() => alert('La edición de planes anuales se realiza desde la aplicación principal')}
      onDelete={handleDelete}
      onCreate={() => alert('Los planes anuales se crean desde la aplicación principal')}
      loading={loading}
    />
  )
}

