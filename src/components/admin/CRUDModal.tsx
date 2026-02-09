'use client'

import { useState, useEffect } from 'react'
import styles from './CRUDModal.module.css'

interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: { value: string | number; label: string }[]
  placeholder?: string
  rows?: number
  disabled?: boolean
}

interface CRUDModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  fields: Field[]
  initialData?: any
  title: string
  loading?: boolean
}

export default function CRUDModal({
  isOpen,
  onClose,
  onSubmit,
  fields,
  initialData,
  title,
  loading = false
}: CRUDModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {})
      setErrors({})
    }
  }, [isOpen, initialData])

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} es requerido`
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error al guardar:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {fields.map((field) => (
            <div key={field.key} className={field.type === 'checkbox' ? styles.fieldCheckbox : styles.field}>
              {field.type === 'checkbox' ? (
                <>
                  <input
                    type="checkbox"
                    id={field.key}
                    checked={formData[field.key] || false}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                    className={styles.checkbox}
                    disabled={field.disabled}
                  />
                  <label htmlFor={field.key} className={styles.label}>
                    {field.label}
                    {field.required && <span className={styles.required}>*</span>}
                  </label>
                </>
              ) : (
                <>
                  <label className={styles.label}>
                    {field.label}
                    {field.required && <span className={styles.required}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={styles.input}
                      placeholder={field.placeholder}
                      rows={field.rows || 4}
                      disabled={field.disabled}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={styles.input}
                      disabled={field.disabled}
                    >
                      <option value="">Seleccionar...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) =>
                        handleChange(
                          field.key,
                          field.type === 'number'
                            ? e.target.value === ''
                              ? ''
                              : Number(e.target.value)
                            : e.target.value
                        )
                      }
                      className={styles.input}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                    />
                  )}
                </>
              )}
              {errors[field.key] && (
                <span className={styles.error}>{errors[field.key]}</span>
              )}
            </div>
          ))}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

