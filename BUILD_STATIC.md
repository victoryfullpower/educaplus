# 📦 Guía para Generar Versión Estática (GitHub Pages)

Esta guía te explica cómo generar solo la parte visual estática de tu proyecto para publicarlo en GitHub Pages usando la rama `gh-pages`.

## ⚠️ Limitaciones de la Versión Estática

La versión estática **NO incluye**:
- ❌ Autenticación (login/registro funcional)
- ❌ Rutas de API (`/api/*`)
- ❌ Generación de materiales con IA
- ❌ Base de datos
- ❌ Chat con IA

La versión estática **SÍ incluye**:
- ✅ Todas las páginas visuales (Inicio, Nosotros, Servicios, etc.)
- ✅ Navegación y diseño completo
- ✅ Formularios (sin funcionalidad de backend)
- ✅ Diseño responsive

---

## 🚀 Opción 1: Automático con GitHub Actions (RECOMENDADO)

### Pasos:

1. **Asegúrate de tener el workflow configurado** (ya está creado en `.github/workflows/deploy-static.yml`)

2. **Configura GitHub Pages en tu repositorio**:
   - Ve a tu repositorio en GitHub
   - Settings → Pages
   - Source: selecciona "GitHub Actions"
   - Guarda

3. **Configura el nombre de tu repositorio**:
   - Edita `next.config.static.ts`
   - Cambia `/proyectoeducacion` por el nombre de tu repositorio:
   ```typescript
   basePath: process.env.NODE_ENV === 'production' ? '/nombre-de-tu-repo' : '',
   assetPrefix: process.env.NODE_ENV === 'production' ? '/nombre-de-tu-repo/' : ''
   ```

4. **Haz push a tu rama principal** (main o master):
   ```bash
   git push origin main
   ```

5. **El workflow se ejecutará automáticamente** y desplegará tu sitio.

Tu sitio estará disponible en: `https://tu-usuario.github.io/nombre-de-tu-repo/`

---

## 🔧 Opción 2: Manual (Build Local)

### Pasos:

1. **Genera el build estático**:
   ```bash
   npm run build:static
   ```

   Esto generará una carpeta `out/` con todos los archivos estáticos.

2. **Sube solo la carpeta `out/` a la rama `gh-pages`**:

   ```bash
   # Opción A: Crear rama gh-pages desde out/
   cd out
   git init
   git add .
   git commit -m "Deploy static site"
   git branch -M gh-pages
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git push -u origin gh-pages --force
   
   # Opción B: Usar git subtree (desde la raíz del proyecto)
   git subtree push --prefix out origin gh-pages
   ```

3. **Configura GitHub Pages**:
   - Settings → Pages
   - Source: selecciona la rama `gh-pages` y carpeta `/ (root)`
   - Guarda

---

## 📝 Configuración del Nombre del Repositorio

**IMPORTANTE**: Si tu repositorio se llama diferente a `proyectoeducacion`, debes actualizar `next.config.static.ts`:

```typescript
// Si tu repositorio se llama, por ejemplo, "educaplus-web"
basePath: process.env.NODE_ENV === 'production' ? '/educaplus-web' : '',
assetPrefix: process.env.NODE_ENV === 'production' ? '/educaplus-web/' : ''
```

Si tu repositorio es `usuario.github.io` (un sitio de usuario/organización), entonces usa:
```typescript
basePath: '',
assetPrefix: ''
```

---

## 🔄 Restaurar Versión Original

Después de generar la versión estática, los archivos originales se restauran automáticamente. Si necesitas restaurarlos manualmente:

```bash
# Los backups están en .backup/
cp .backup/home-page.original.tsx src/app/home/page.tsx
cp .backup/login-page.original.tsx src/app/login/page.tsx
cp .backup/register-page.original.tsx src/app/register/page.tsx
cp .backup/next.config.original.ts next.config.ts
```

---

## ✅ Checklist

- [ ] Actualizar `next.config.static.ts` con el nombre correcto de tu repositorio
- [ ] Configurar GitHub Pages en Settings → Pages (usar "GitHub Actions" como source)
- [ ] Ejecutar `npm run build:static` (si es manual) o hacer push a main/master (si es automático)
- [ ] Verificar que se creó la carpeta `out/` con los archivos estáticos
- [ ] Verificar que se creó el archivo `out/.nojekyll`
- [ ] Probar el sitio en `https://tu-usuario.github.io/nombre-de-tu-repo/`

---

## 🐛 Solución de Problemas

**Error: "basePath not found"**
- Verifica que el `basePath` en `next.config.static.ts` coincida con el nombre de tu repositorio.

**Los estilos no cargan**
- Asegúrate de que `assetPrefix` esté configurado correctamente.
- Verifica que el archivo `.nojekyll` exista en `out/`.

**Las rutas no funcionan**
- GitHub Pages requiere `trailingSlash: true` (ya está configurado).
- Usa enlaces relativos en lugar de absolutos.

---

## 📚 Recursos Adicionales

- [Documentación de Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---

¿Necesitas ayuda con algún paso? ¡Pregunta!
