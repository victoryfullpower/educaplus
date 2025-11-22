import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import ChatGPT from '@/components/ChatGPT'
import Gemini from '@/components/Gemini'
import styles from './home.module.css'

async function getUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user-id')?.value

  if (!userId) {
    redirect('/login')
  }

  const userIdNumber = parseInt(userId, 10)
  if (isNaN(userIdNumber)) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  return user
}

export default async function HomePage() {
  const user = await getUser()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Bienvenido</h1>
        <LogoutButton />
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <h2>Información del Usuario</h2>
          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Nombre:</span>
              <span className={styles.value}>{user.name || 'No especificado'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Miembro desde:</span>
              <span className={styles.value}>
                {new Date(user.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
        
        <div className={styles.chatSection}>
          <div className={styles.chatGrid}>
            <ChatGPT />
            <Gemini />
          </div>
        </div>
      </div>
    </div>
  )
}

