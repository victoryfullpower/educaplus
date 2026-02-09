import styles from './paneladministracion.module.css'

export default function PanelAdministracionPage() {
  return (
    <>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>Panel de Administración</h1>
        <p className={styles.pageSubtitle}>
          Gestiona todos los mantenedores del sistema desde el menú lateral
        </p>
      </div>

      <div className={styles.welcomeCard}>
        <h2>Bienvenido al Panel de Administración</h2>
        <p>Selecciona un mantenedor del menú lateral para comenzar a gestionar los datos del sistema.</p>
        
        <div className={styles.quickStats}>
          <div className={styles.statCard}>
            <h3>Mantenedores Disponibles</h3>
            <p className={styles.statNumber}>9</p>
          </div>
        </div>
      </div>
    </>
  )
}

