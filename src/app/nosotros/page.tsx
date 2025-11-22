import Header from '@/components/Header'
import styles from './nosotros.module.css'

export default function NosotrosPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Sección 1: Quiénes Somos */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h1 className={styles.title}>QUIÉNES SOMOS</h1>
            <p className={styles.text}>
              <strong>EDUCAPLUS</strong> es una plataforma educativa peruana especializada en la creación de materiales pedagógicos para docentes de educación secundaria. Nuestro propósito es acompañar a miles de docentes en su labor diaria, brindándoles recursos claros, actualizados y listos para usar, totalmente alineados al Currículo Nacional y normativas vigentes del MINEDU.
            </p>
            <p className={styles.text}>
              Sabemos que la labor docente exige tiempo, organización y claridad pedagógica. Por eso, diseñamos materiales que simplifican tu trabajo y potencian tu enseñanza, permitiéndote dedicar más tiempo a lo que realmente importa: tus estudiantes.
            </p>
            <p className={styles.text}>
              En EDUCAPLUS, unimos experiencia, pedagogía y tecnología para transformar la educación desde el aula.
            </p>
          </div>
        </section>

        {/* Sección 2: Misión */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>NUESTRA MISIÓN</h2>
            <p className={styles.text}>
              Brindar a los docentes de secundaria del Perú soluciones pedagógicas prácticas, actualizadas y de alta calidad, que faciliten su planificación diaria, optimicen su tiempo y contribuyan a mejorar los aprendizajes en el aula. A través de materiales listos para usar, creando tu propio material con herramientas inteligentes y acompañamiento constante, buscamos empoderar al docente para que enseñe con confianza, claridad y propósito.
            </p>
          </div>
        </section>

        {/* Sección 3: Visión */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>NUESTRA VISIÓN</h2>
            <p className={styles.text}>
              Ser la plataforma líder en innovación pedagógica del Perú, reconocida por transformar la experiencia educativa de los docentes de secundaria mediante recursos confiables, pertinentes y alineados al MINEDU. Aspiramos a construir una comunidad docente fortalecida, autónoma y creativa, que encuentre en EDUCAPLUS un aliado para enseñar mejor, crecer profesionalmente y dejar huella en sus estudiantes.
            </p>
          </div>
        </section>

        {/* Sección 4: Equipo */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>NUESTRO EQUIPO</h2>
            <p className={styles.text}>
              EducaPlus está conformada por un equipo multidisciplinario integrado por:
            </p>
            <ul className={styles.list}>
              <li>Especialistas en educación secundaria</li>
              <li>Docentes con experiencia en aula</li>
              <li>Expertos en diseño curricular</li>
              <li>Diseñadores educativos</li>
              <li>Editores y revisores pedagógicos</li>
              <li>Equipo de soporte y atención docente</li>
            </ul>
            <p className={styles.text}>
              Cada material que entregamos pasa por procesos rigurosos de revisión técnica y pedagógica, garantizando claridad, coherencia y pertinencia curricular.
            </p>
          </div>
        </section>

        {/* Sección 5: Por qué elegirnos */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>¿POR QUÉ ELEGIRNOS?</h2>
            <p className={styles.text}>
              Los docentes nos prefieren porque ofrecemos:
            </p>
            <div className={styles.benefitsGrid}>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Material 100% alineado al Currículo Nacional</h3>
                  <p>Actualizado según R.M. vigentes y orientado a la evaluación por competencias.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Recursos claros y listos para usar</h3>
                  <p>Programaciones, unidades, sesiones, fichas, rúbricas y listas, todo en un solo lugar.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Plantillas editables</h3>
                  <p>Material versátil para adaptarlo a tu contexto.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Ahorro de tiempo y reducción del estrés docente</h3>
                  <p>Menos horas planificando, más tiempo enseñando.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Atención personalizada</h3>
                  <p>Soporte directo y asesoría pedagógica continua.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Actualización permanente</h3>
                  <p>Actualizamos nuestros materiales de manera progresiva durante el año escolar.</p>
                </div>
              </div>
              <div className={styles.benefit}>
                <span className={styles.checkmark}>✔</span>
                <div>
                  <h3>Comunidad docente EDUCAPLUS</h3>
                  <p>Miles de docentes mejorando su práctica con nosotros.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 6: Testimonios */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>TESTIMONIOS</h2>
            <div className={styles.testimonialsGrid}>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"EducaPlus me ha simplificado la vida. Las sesiones están claras, actualizadas y listas para aplicar en el aula."</p>
                <p className={styles.author}>– María Luisa, docente de Comunicación</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Sus unidades están muy bien estructuradas. Me ayudan a entender mejor el enfoque por competencias."</p>
                <p className={styles.author}>– Carlos Celi, docente de Ciencias Sociales</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Excelente servicio. Rápidos, confiables y con materiales de calidad."</p>
                <p className={styles.author}>– Daniela Alvarado, docente de Matemática</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Agradezco mucho el soporte que brindan. Siempre responden cuando los necesito y eso da confianza."</p>
                <p className={styles.author}>– Luis Enrique, docente de Ciencia y Tecnología</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Las sesiones están tan bien organizadas que me ahorran horas de trabajo. ¡Gracias por pensar en nosotros!"</p>
                <p className={styles.author}>– Rosa Elena, docente de Educación para el Trabajo</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"He probado otros grupos, pero EDUCAPLUS es el único que cumple lo que promete. Aquí no hay estafas."</p>
                <p className={styles.author}>– Jorge Medina, docente de DPCC</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Me encanta que el material esté alineado al currículo y sea editable. Puedo adaptarlo fácilmente a mi realidad."</p>
                <p className={styles.author}>– Silvia Torres, docente de INGLÉS</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Gracias a EDUCAPLUS he podido afrontar los monitoreos con tranquilidad. Todo está listo y bien sustentado."</p>
                <p className={styles.author}>– Pedro Ríos, docente de Arte y Cultura</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Lo recomiendo a todos mis colegas. Es una plataforma seria, con materiales útiles y atención personalizada."</p>
                <p className={styles.author}>– Ana Cecilia, docente de inglés</p>
              </div>
              <div className={styles.testimonial}>
                <p className={styles.quote}>"Desde que uso EDUCAPLUS, planificar ya no es un dolor de cabeza. Me siento acompañada y segura."</p>
                <p className={styles.author}>– Martha Gutiérrez, docente de Comunicación</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sección 7: Política de Calidad */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>POLÍTICA DE CALIDAD</h2>
            <p className={styles.text}>
              En EducaPlus nos comprometemos a:
            </p>
            <ul className={styles.commitmentList}>
              <li>Asegurar materiales pertinentes y alineados a los documentos normativos del MINEDU.</li>
              <li>Mantener procesos de revisión pedagógica, técnica y curricular en cada recurso.</li>
              <li>Garantizar la actualización progresiva de nuestros contenidos durante todo el año escolar.</li>
              <li>Responder con rapidez las consultas docentes y brindar acompañamiento constante.</li>
              <li>Ofrecer recursos originales, funcionales y pensados para la práctica real en aula.</li>
            </ul>
          </div>
        </section>

        {/* Sección 8: Contáctanos */}
        <section className={styles.section}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>CONTÁCTANOS</h2>
            <p className={styles.text}>
              ¿Tienes consultas, sugerencias o necesitas asesoría?
            </p>
            <div className={styles.contactInfo}>
              <p><strong>📩 Correo:</strong> contacto@educaplus.pe</p>
              <p><strong>📱 WhatsApp:</strong> 933277007 - 938535736</p>
              <p><strong>📘 Facebook:</strong> <a href="https://www.facebook.com/profile.php?id=61570568559041" target="_blank" rel="noopener noreferrer">EducaPlus</a></p>
              <p><strong>🕒 Horarios de atención:</strong> Lunes a sábado, 7:00 a.m. – 10:00 p.m.</p>
            </div>
            <p className={styles.finalMessage}>
              <strong>Tu crecimiento docente es nuestra prioridad.</strong> Estamos aquí para acompañarte en cada paso.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}

