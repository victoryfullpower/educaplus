# 🚀 Guía de Despliegue - EducaPlus

## ⚠️ GitHub Pages NO funciona para este proyecto

**GitHub Pages solo sirve sitios estáticos** (HTML, CSS, JS puro). Tu proyecto necesita:

- ❌ Rutas de API (`/api/auth/*`, `/api/chat/*`, etc.)
- ❌ Servidor Node.js para ejecutar código del backend
- ❌ Base de datos PostgreSQL
- ❌ Autenticación con sesiones del servidor

**Por lo tanto, NO puedes usar GitHub Pages para este proyecto.**

---

## ✅ Opciones Recomendadas (GRATIS)

### 1. **Vercel** ⭐ (RECOMENDADO)

**Vercel es la plataforma creada por los mismos desarrolladores de Next.js. Es GRATIS y perfecto para este proyecto.**

#### Pasos para desplegar en Vercel:

1. **Sube tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/educaplus.git
   git push -u origin main
   ```

2. **Ve a [vercel.com](https://vercel.com) y crea una cuenta** (puedes usar tu cuenta de GitHub)

3. **Importa tu proyecto desde GitHub**
   - Haz clic en "Add New Project"
   - Selecciona tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js

4. **Configura las variables de entorno**
   - En la configuración del proyecto, ve a "Environment Variables"
   - Añade tu `DATABASE_URL` y otras variables necesarias
   - Ejemplo:
     ```
     DATABASE_URL=postgresql://usuario:password@host:5432/database
     ```

5. **¡Despliega!**
   - Haz clic en "Deploy"
   - En unos minutos tu sitio estará online en una URL como:
     `https://tu-proyecto.vercel.app`

6. **Configura tu base de datos**
   - Vercel ofrece integración gratuita con bases de datos
   - Puedes usar:
     - **Vercel Postgres** (gratis hasta 256 MB)
     - **Supabase** (gratis hasta 500 MB)
     - **Neon** (gratis hasta 0.5 GB)
     - **Railway** (gratis con límite)

#### Ventajas de Vercel:
- ✅ Gratis para proyectos personales
- ✅ Deploy automático con cada push a GitHub
- ✅ SSL/HTTPS automático
- ✅ Optimización automática de Next.js
- ✅ Soporta rutas de API sin configuración
- ✅ CDN global para carga rápida

---

### 2. **Netlify** (Alternativa)

Similar a Vercel, también gratuito:

1. Ve a [netlify.com](https://netlify.com)
2. Conecta tu repositorio de GitHub
3. Configura las variables de entorno
4. Despliega

---

### 3. **Railway** (Incluye base de datos)

Railway ofrece hosting + base de datos PostgreSQL:

1. Ve a [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Crea una base de datos PostgreSQL directamente en Railway
4. Railway te dará automáticamente la `DATABASE_URL`
5. Despliega

**Plan gratuito:** $5 de crédito gratis al mes (suficiente para proyectos pequeños)

---

## 📋 Configuración Necesaria antes de Desplegar

### 1. Variables de Entorno

Crea un archivo `.env.example` para referencia:

```env
DATABASE_URL="postgresql://usuario:password@host:5432/database"
NEXTAUTH_SECRET="tu-secret-key-aqui"
NEXTAUTH_URL="https://tu-dominio.vercel.app"
GOOGLE_API_KEY="tu-api-key-de-google-gemini"
```

### 2. Migrar Base de Datos

Antes de desplegar, asegúrate de ejecutar las migraciones en tu base de datos de producción:

```bash
npx prisma migrate deploy
```

### 3. Actualizar README

Asegúrate de tener un README claro con instrucciones de despliegue.

---

## 🔧 Configuración para Vercel

Crea un archivo `vercel.json` (opcional, para configuración avanzada):

```json
{
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

---

## 📝 Checklist de Despliegue

- [ ] Código subido a GitHub
- [ ] Variables de entorno configuradas en Vercel/Netlify
- [ ] Base de datos configurada (PostgreSQL)
- [ ] Migraciones ejecutadas en producción
- [ ] Prisma Client generado
- [ ] Dominio personalizado configurado (opcional)

---

## ❓ Preguntas Frecuentes

**¿Por qué no funciona en GitHub Pages?**
- GitHub Pages solo sirve archivos estáticos. No puede ejecutar código del servidor ni rutas de API.

**¿Cuánto cuesta Vercel?**
- El plan gratuito (Hobby) es suficiente para proyectos pequeños. Incluye:
  - Deploys ilimitados
  - 100 GB de ancho de banda
  - SSL automático
  - Dominios personalizados

**¿Y la base de datos?**
- Necesitas un servicio separado para PostgreSQL:
  - Vercel Postgres (gratis hasta 256 MB)
  - Supabase (gratis hasta 500 MB)
  - Neon (gratis hasta 0.5 GB)
  - Railway (incluido en su plan)

**¿Puedo usar un dominio propio?**
- Sí, tanto Vercel como Netlify permiten usar dominios personalizados gratis con SSL.

---

## 🎯 Recomendación Final

**Usa Vercel + Supabase (PostgreSQL)** para un setup completamente gratuito y fácil:

1. Deploy en Vercel → Hosting gratis
2. Base de datos en Supabase → PostgreSQL gratis
3. Integración perfecta → Todo funciona sin configuración extra

¿Necesitas ayuda con algún paso específico? ¡Solo pregunta!

