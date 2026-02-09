'use client'

import { useState } from 'react'
import styles from './CRUDTable.module.css'

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface CRUDTableProps {
  title: string
  columns: Column[]
  data: any[]
  onEdit: (item: any) => void
  onDelete: (id: number) => void
  onCreate: () => void
  loading?: boolean
  searchPlaceholder?: string
}

export default function CRUDTable({
  title,
  columns,
  data,
  onEdit,
  onDelete,
  onCreate,
  loading = false,
  searchPlaceholder = 'Buscar...'
}: CRUDTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const filteredData = data.filter(item =>
    columns.some(col => {
      const value = item[col.key]
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  )

  const handleDelete = (id: number) => {
    if (deleteConfirm === id) {
      onDelete(id)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <button onClick={onCreate} className={styles.createButton}>
          + Crear Nuevo
        </button>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.count}>
          {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className={styles.empty}>
                    No hay registros
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr key={row.id || index}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]?.toString() || '-'}
                      </td>
                    ))}
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => onEdit(row)}
                          className={styles.editButton}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className={
                            deleteConfirm === row.id
                              ? styles.deleteButtonConfirm
                              : styles.deleteButton
                          }
                          title={deleteConfirm === row.id ? 'Confirmar eliminación' : 'Eliminar'}
                        >
                          {deleteConfirm === row.id ? '✓' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

