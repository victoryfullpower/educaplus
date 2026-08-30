export function validateAuthEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Ingresa tu correo electrónico.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Ingresa un correo válido (ejemplo: tu@email.com).'
  }
  return null
}

export function validateAuthPassword(
  value: string,
  options?: { minLength?: number; requiredMessage?: string }
): string | null {
  const minLength = options?.minLength ?? 1
  const requiredMessage = options?.requiredMessage ?? 'Ingresa tu contraseña.'

  if (!value) return requiredMessage
  if (value.length < minLength) {
    return `La contraseña debe tener al menos ${minLength} caracteres.`
  }
  return null
}
