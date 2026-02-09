'use client'

import { useState, useEffect } from 'react'
import CRUDTable from '@/components/admin/CRUDTable'
import CRUDModal from '@/components/admin/CRUDModal'
import styles from '../paneladministracion.module.css'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const fetchUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      if (response.ok) {
        const data = await response.json()
        setUsuarios(data.usuarios || [])
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const handleCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      const response = await fetch(`/api/admin/usuarios?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUsuarios()
      } else {
        alert('Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      alert('Error al eliminar usuario')
    }
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const url = '/api/admin/usuarios'
      const method = editingUser ? 'PUT' : 'POST'
      const body = editingUser ? { ...data, id: editingUser.id } : data

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setModalOpen(false)
        fetchUsuarios()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar usuario')
      }
    } catch (error) {
      console.error('Error al guardar usuario:', error)
      alert('Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Nombre' },
    {
      key: 'rol',
      label: 'Rol',
      render: (value: string) => (
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: value === 'Administrador' ? '#dbeafe' : '#e0e7ff',
          color: value === 'Administrador' ? '#1e40af' : '#3730a3'
        }}>
          {value}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Fecha Creación',
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    }
  ]

  const fields = [
    { key: 'email', label: 'Email', type: 'email' as const, required: true },
    { key: 'password', label: 'Contraseña', type: 'password' as const, required: !editingUser },
    { key: 'name', label: 'Nombre', type: 'text' as const },
    {
      key: 'rol',
      label: 'Rol',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'Usuario', label: 'Usuario' },
        { value: 'Administrador', label: 'Administrador' }
      ]
    }
  ]

  return (
    <>
      <CRUDTable
        title="Gestión de Usuarios"
        columns={columns}
        data={usuarios}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        loading={loading}
        searchPlaceholder="Buscar por email, nombre..."
      />

      <CRUDModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingUser(null)
        }}
        onSubmit={handleSubmit}
        fields={fields}
        initialData={editingUser}
        title={editingUser ? 'Editar Usuario' : 'Crear Usuario'}
        loading={saving}
      />
    </>
  )
}

