# SecureVault

SecureVault es una boveda interna para IT/Admin con frontend React + Vite y backend Express.

## Requisitos

- Node.js 20+
- npm 10+

## Configuracion

1. Copia `/.env.example` a `/.env`.
2. Copia `/server/.env.example` a `/server/.env`.
3. Define valores reales para `CLIENT_VAULT_KEY`, `CLIENT_NOTES_KEY`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`, `DATABASE_URL` y `BOOTSTRAP_ADMIN_PASSWORD`.
4. Ajusta `CORS_ORIGINS` al origen interno permitido.

El acceso ahora tiene dos capas:

- `login web`: sesion `HttpOnly` + CSRF + 2FA
- `unlock local`: cada usuario configura una `master password` propia para desbloquear las claves reales de su boveda y sus notas

El backend ya no devuelve claves de datos en `login` ni en `GET /api/auth/me`. Solo entrega metadata envuelta para que el desbloqueo ocurra localmente en el navegador.

`CLIENT_VAULT_KEY` y `CLIENT_NOTES_KEY` se mantienen solo para migrar cuentas y backups del esquema legado anterior. En despliegues nuevos sin datos heredados, la boveda ya no depende de secretos globales del frontend.

La autenticacion web usa cookie de sesion `HttpOnly` con proteccion CSRF por doble cookie y comprobacion de `Origin`. El frontend ya no guarda JWT en `localStorage`.

Para cuentas sensibles, 2FA es obligatorio segun `MANDATORY_2FA_ROLES` y `MANDATORY_2FA_EMAILS`. Por defecto se exige a `admin`.

Para generar y custodiar secretos de despliegue una sola vez:

```bash
node scripts/generate-deployment-secrets.mjs
```

Esto crea `deploy/securevault.secrets.env`, que debes conservar entre despliegues. Si cambias `BACKUP_ENCRYPTION_KEY`, los backups anteriores dejaran de poder restaurarse. El mismo fichero incluye `POSTGRES_PASSWORD` para el stack Docker.

## Desarrollo local

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd server
npm install
npm start
```

Valores habituales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- API desde frontend: `VITE_API_URL=/api` con proxy reverso, o URL absoluta si se sirve separado
- En despliegue se recomienda PostgreSQL como base de datos principal. SQLite queda para desarrollo local y pruebas.

En el primer acceso de cada usuario:

1. inicia sesion con su cuenta
2. configura una `master password`
3. si tiene datos del esquema anterior, la app los migra al nuevo cifrado por usuario

Tras eso, una recarga del navegador o un bloqueo manual exigiran volver a introducir la master password para desbloquear la boveda.

## Bootstrap inicial

El admin inicial solo se crea si existen:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Si faltan, el backend arranca sin crear ningun usuario.

## Validacion

```bash
npm run lint
npm run build
npm test -- --run
npm run test:e2e
```

Backend aislado:

```bash
cd server
npm test -- --run
```

## Backups y Restore

El backup automatico diario ahora incluye todas las tablas de aplicacion, incluidos adjuntos cifrados, sesiones, shares, grupos, inventario y configuracion.

Los backups se escriben cifrados con `AES-256-GCM` usando `BACKUP_ENCRYPTION_KEY`. El fichero resultante es un sobre JSON cifrado con extension `.enc`.

- Backups automaticos: `server/backups/` o la ruta indicada por `BACKUP_PATH`
- Backup manual:

```bash
cd server
npm run backup
```

- Restore completo desde backup cifrado:

```bash
cd server
npm run restore-backup -- ./backups/backup-YYYY-MM-DDTHH-MM-SS.json.enc
```

El restore es destructivo: vacia la base actual y repone todas las tablas del backup. El backup cifrado guarda fingerprints de las claves cliente y el restore falla si intentas cargarlo con otras claves. Tambien fallara si `BACKUP_ENCRYPTION_KEY` no coincide con la usada al crear el backup.

Importante:

- si el backup contiene usuarios o datos aun sin migrar al esquema por usuario, necesitara tambien las claves legado `CLIENT_VAULT_KEY` y `CLIENT_NOTES_KEY`
- si toda la instalacion ya esta migrada, el backup depende de las claves envueltas guardadas por usuario y de `BACKUP_ENCRYPTION_KEY`, no de un secreto global del frontend

## Docker Compose

Levanta frontend, backend y PostgreSQL:

```bash
node scripts/generate-deployment-secrets.mjs
docker compose up --build
```

Puertos por defecto:

- Frontend: `http://localhost:8080`
- Backend interno del stack: `http://backend:3000`
- PostgreSQL interno del stack: `postgres:5432`

## Notas operativas

- El registro publico no esta habilitado fuera de test.
- `POST /api/shares` requiere autenticacion.
- No se cachean secretos desencriptados ni sesiones en `localStorage`.
- El share interno clasico queda deshabilitado para cuentas con master password por usuario; usa shares publicos temporales para entregas puntuales.
- El stack Docker usa PostgreSQL por defecto y persiste tambien backups y manifiesto criptografico fuera del contenedor.
