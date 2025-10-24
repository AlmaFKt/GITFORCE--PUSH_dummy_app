# KAVAK Demo — Sistema de Logs & Observabilidad

Este repositorio contiene una demo autónoma (cliente estático) y un backend ligero para persistencia y exportación de eventos y errores. Está pensada como un prototipo que cualquier persona puede ejecutar localmente para inspeccionar, reproducir y mejorar la observabilidad de una aplicación frontend.

## Contenido principal

- Frontend estático (HTML/CSS/JS)
	- `index.html`, `comprar.html`, `vender.html`, `login.html` — páginas de demo instrumentadas para generar eventos y errores.
	- `logs.html` — dashboard que agrega entradas desde `localStorage`, permite filtrar, ver estadísticas y enviar errores al backend.
	- `ayuda.html` — ayuda/FAQ con un script de inyección de logs de ejemplo.
- Backend ligero: `server.js` (Node + Express + SQLite) — endpoints de ingestión y export.
- Base de datos local: `data/logs.db` (SQLite, creada por el servidor) y `data/logs.json` (fallback / ejemplo).
- Herramientas: `tools/inspect_db.js` — inspección de filas recientes en `data/logs.db`.

## Objetivo

Demostrar un flujo simple de observabilidad end-to-end para aplicaciones cliente:

- Instrumentación en el frontend para capturar eventos y errores en `localStorage`.
- Un dashboard local (`logs.html`) que centraliza eventos desde múltiples páginas y permite filtrado, export y reintentos.
- Persistencia remota en un backend sencillo (Node + SQLite) para análisis y archivado.

Es útil como prototipo para equipos que necesiten capturar errores reproducibles desde clientes y coordinar la corrección y mejora continua.

## Arquitectura del sistema

Componentes principales:

- Frontend (archivos estáticos)
	- Cada página escribe logs en `localStorage` bajo claves con prefijo `kavak_logs_<page>` (ej.: `kavak_logs_index`).
	- `logs.html` agrega todas las claves `kavak_logs_*`, deduplica por el campo `raw` y muestra resultados.
	- `logs.html` envía automáticamente registros de nivel `ERROR` al servidor (`POST /api/logs`) y mantiene una cola local (`kavak_remote_queue`) para reintentos.

- Backend (Node + Express + SQLite)
	- Inserta registros en `data/logs.db` (tabla `logs`) usando INSERT OR IGNORE sobre `raw` para evitar duplicados.
	- Endpoints clave:
		- `GET /api/health` — health check
		- `POST /api/logs` — ingest (objeto o array)
		- `GET /api/logs` — consulta con filtros (nivel, página, búsqueda, since, limit, offset)
		- `GET /api/logs/export` — exporta NDJSON o CSV

Diagrama (ASCII):

```
Frontend pages --> localStorage (kavak_logs_*)
											 |
											 v
									 logs.html (dashboard + retry queue)
											 |
				(POST /api/logs via fetch) -- HTTP --> Node/Express server
																							 |
																							 v
																					SQLite (data/logs.db)
```

## Flujo típico

1. Usuario navega o reproduce un caso en `index.html` / `comprar.html` / etc.
2. La página añade eventos a `localStorage` (clave `kavak_logs_<page>`).
3. El administrador abre `logs.html` — agrupa todas las claves `kavak_logs_*` y muestra logs.
4. `logs.html` intenta enviar errores (`ERROR`) al servidor; si falla, los encola en `kavak_remote_queue` y se reintentan periódicamente.
5. Analista puede usar `/api/logs/export` o `tools/inspect_db.js` para descargar o inspeccionar registros.

## Modelo de datos (ejemplo de un log)

Un objeto de log típico contiene campos como:

```json
{
	"timestamp": "2025-10-23T12:34:56.789Z",
	"level": "ERROR",
	"service": "help-service",
	"userId": "USR1234",
	"sessionId": "SESSION_1234",
	"message": "Failed to render FAQ list: TypeError ...",
	"metadata": {"section":"faq"},
	"page": "ayuda",
	"raw": "2025-...|help-service|ERROR|Failed to render FAQ list"
}
```

`raw` se usa como detector de duplicados al insertar en la DB.

## Instrucciones de ejecución (PowerShell)

### Prerrequisitos

- Node.js (recomendado 16.x o 18.x)
- Un navegador para abrir las páginas estáticas

### Instalar dependencias del servidor

Abre PowerShell en la raíz del repo y ejecuta:

```powershell
npm install
```

### Ejecutar el servidor

```powershell
npm start
```

Por defecto el servidor queda en `http://localhost:3000` y creará `data/logs.db` si no existe.

### Abrir la UI

- Abre `file:///C:/ruta/al/repositorio/index.html` en tu navegador y navega entre páginas.
- Abre `file:///C:/ruta/al/repositorio/logs.html` para ver y administrar los logs.
- `ayuda.html` incluye un script de inyección de logs de ejemplo (solo la primera carga por perfil de navegador).

### Inspeccionar la base de datos

```powershell
node tools/inspect_db.js 20
```

### Exportar logs

```powershell
curl "http://localhost:3000/api/logs/export?format=ndjson" -o kavak_logs.ndjson
```

o como CSV:

```powershell
curl "http://localhost:3000/api/logs/export?format=csv" -o kavak_logs.csv
```

## Endpoints (resumen)

- `GET /api/health` — estado
- `POST /api/logs` — ingest (acepta objeto o array)
- `GET /api/logs` — consulta con filtros (level, page, search, since, limit, offset)
- `GET /api/logs/export?format=ndjson|csv` — export

Nota: el endpoint de exportación está pensado para stream y manejar datasets grandes sin cargar todo en memoria.

## Llaves y storage en el cliente

- `kavak_logs_<page>` — array JSON de logs por página
- `kavak_remote_queue` — cola de logs pendientes de envío al servidor
- `kavak_saved_remote` — array de `raw` ya guardados remotamente (evita reenvío)
- `kavak_injected_bugs_<page>` — flags que marcan que las páginas inyectaron logs de ejemplo

## Archivos importantes

- `index.html`, `comprar.html`, `vender.html`, `login.html`, `logs.html`, `ayuda.html` — frontend
- `server.js` — servidor Express
- `package.json` — dependencias y script `npm start`
- `data/logs.db` — SQLite DB (generada por el servidor)
- `data/logs.json` — fallback / ejemplo
- `tools/inspect_db.js` — utilidad para mostrar las últimas N filas

## Métricas y evidencia cuantificable

Recomendaciones de métricas:

- Tasa de error: número de logs con `level=ERROR` por periodo
- Tiempo hasta mitigación (MTTI)
- Reducción de duplicados: porcentaje de eventos ignorados por `raw`
- Porcentaje de persistencia remota: logs ERROR detectados en UI vs insertados en DB

Ejemplo (PowerShell) para contar errores en la DB:

```powershell
node -e "const sqlite3=require('sqlite3').verbose();const db=new sqlite3.Database('data/logs.db');db.get('SELECT COUNT(*) c FROM logs WHERE level=\'ERROR\'',(e,r)=>{console.log(r);db.close()})"
```

## Ciclo de auto-mejora

1. Captura — las páginas instrumentan eventos y errores en `localStorage`.
2. Centralización — `logs.html` agrega y muestra los eventos.
3. Persistencia remota — `logs.html` intenta enviar a `/api/logs` y mantiene reintentos locales.
4. Análisis — analistas revisan DB o export y priorizan correcciones.
5. Corrección — se aplica un parche / deploy.
6. Validación — comparar métricas pre/post para verificar la mejora.

## Mejoras propuestas / próximas tareas

1. Añadir autenticación al endpoint de ingestión.
2. Implementar fallback robusto para entornos sin `sqlite3` (usar `data/logs.json` o SQLite precompilado).
3. Agregar tests de integración y CI para validar endpoints.
4. Añadir `compare_metrics.ps1` para automatizar comparaciones pre/post usando exportaciones NDJSON.
5. Añadir botón en `logs.html` para forzar envío de la cola y mostrar métricas en tiempo real.

## Entrega y nota final

Este README describe la solución, cómo ejecutarla, cómo analizarla y cómo probar mejoras. Si quieres, puedo generar los artefactos opcionales mencionados (por ejemplo `compare_metrics.ps1`, tests + GitHub Actions, o un token simple para proteger el endpoint de exportación).

Fecha: 2025-10-23
