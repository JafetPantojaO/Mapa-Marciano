# Mapa-Marciano 🚀🔴

Aplicación web para planificación de rutas, cartografía marciana y telemetría de rovers en Marte. Desarrollada con **React (Vite)** en el FrontEnd, **Node.js (Express)** en el BackEnd y **MySQL 8.0** en un contenedor **Docker** aislado para la base de datos.

---

## 🏗️ Arquitectura del Entorno de Desarrollo

* **Base de Datos (Dockerizada):** Motor **MySQL 8.0** ejecutándose en un contenedor Docker (`mapa_marciano_db`) con persistencia en un volumen nombrado y migración inicial automática (`./database/init.sql`).
* **BackEnd (Host Local):** Servidor API REST con **Node.js + Express** corriendo en tu máquina local (`http://localhost:4000`).
* **FrontEnd (Host Local):** Aplicación cliente SPA con **React + Vite** corriendo en tu máquina local (`http://localhost:5173`).

---

## 📋 Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas:
1. [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
2. [npm](https://www.npmjs.com/) (incluido automáticamente con Node.js).
3. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (debe estar abierto y en ejecución).

Comprueba las versiones en tu terminal:
```bash
node -v
npm -v
docker --version
docker compose version
```

---

## ⚙️ Paso 1: Configurar Variables de Entorno

Antes de iniciar el contenedor o los servidores, crea el archivo `.env` a partir de la plantilla `.env.example`:

### En Windows (PowerShell):
```powershell
Copy-Item .env.example .env
Copy-Item BackEnd/.env.example BackEnd/.env
```

### En Linux / macOS / Git Bash:
```bash
cp .env.example .env
cp BackEnd/.env.example BackEnd/.env
```

El archivo `.env` por defecto contiene:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mapa_marciano
DB_USER=root
DB_PASSWORD=root_password
PORT=4000
```

---

## 🐳 Paso 2: Iniciar la Base de Datos con Docker

Únicamente la base de datos corre dentro de Docker. Para iniciar el contenedor de MySQL 8.0:

```bash
docker compose up -d
```

### ¿Qué hace este comando automáticamente?
1. Descarga la imagen oficial `mysql:8.0` (si no existe localmente).
2. Crea el contenedor `mapa_marciano_db` exponiendo el puerto `3306` hacia tu máquina.
3. **Persistencia:** Monta el volumen persistente `mapa_marciano_mysql_data`, garantizando que los datos no se borren cuando apagues o reinicies el contenedor.
4. **Migración Inicial Automática:** La primera vez que el volumen se crea, Docker ejecuta automáticamente el script [`./database/init.sql`](database/init.sql), el cual:
   * Crea la base de datos `mapa_marciano`.
   * Crea la tabla `astronautas`.
   * Crea la tabla `rutas`.
   * Crea la tabla intermedia muchos a muchos `astronauta_rutas`.
   * Inserta datos iniciales de prueba (seed data).

### Comandos útiles de Docker:

* **Ver estado del contenedor:**
  ```bash
  docker compose ps
  ```

* **Ver los registros (logs) de MySQL:**
  ```bash
  docker compose logs -f database
  ```

* **Detener el contenedor (mantiene los datos intactos):**
  ```bash
  docker compose down
  ```

* **Reiniciar desde cero (borrar datos y reejecutar migración inicial):**
  > ⚠️ **Precaución:** Esto eliminará todos los registros de la base de datos.
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

## ⚠️ Resolución de Conflictos de Puertos (MySQL Local)

Si ya tienes una instancia de MySQL o MariaDB instalada directamente en tu sistema operativo (o mediante XAMPP/WAMP), el puerto `3306` estará ocupado y Docker fallará con el error `Bind for 0.0.0.0:3306 failed: port is already allocated`.

Tienes dos soluciones:

### Opción A (Recomendada): Detener el servicio local de MySQL
* **En Windows (PowerShell como Administrador):**
  ```powershell
  net stop MySQL80
  # o si el servicio se llama simplemente MySQL:
  net stop MySQL
  ```
  *(También puedes abrir `services.msc`, buscar **MySQL** y hacer clic en **Detener**).*

### Opción B: Cambiar el puerto en el archivo `.env`
Sin modificar `docker-compose.yml`, abre tu archivo `.env` y cambia el puerto del host:
```env
DB_PORT=3307
```
Luego levanta el contenedor normalmente:
```bash
docker compose up -d
```
Docker mapeará el puerto `3307` de tu host al `3306` interno del contenedor, y tu backend se conectará al puerto `3307` sin conflicto.

---

## 📦 Paso 3: Instalación de Dependencias

Con la base de datos levantada, instala los paquetes de Node.js:

```bash
# Dependencias raíz
npm install

# Dependencias del FrontEnd
npm install --prefix FrontEnd

# Dependencias del BackEnd
npm install --prefix BackEnd
```

---

## 🚀 Paso 4: Cómo Correr la Aplicación

Tanto React como Node.js se ejecutan localmente en tu host (sin Docker).

### Modo Simultáneo (Recomendado):
Inicia el FrontEnd y el BackEnd al mismo tiempo desde la raíz del proyecto:
```bash
npm run dev:all
```

### Modos Individuales:
* **Solo FrontEnd (React):**
  ```bash
  npm run dev
  # o también: npm start
  ```
  Accede en tu navegador a: **[http://localhost:5173](http://localhost:5173)**

* **Solo BackEnd (Node.js):**
  ```bash
  npm run backend
  ```
  El servidor escuchará en: **[http://localhost:4000](http://localhost:4000)**  
  Comprobación de salud: **[http://localhost:4000/api/saludo](http://localhost:4000/api/saludo)**

---

## 🛠️ Compilar para Producción (Build)

Para generar el bundle optimizado de React:
```bash
npm run build
```
Los artefactos estáticos se compilarán en `FrontEnd/dist/`.

---

## 📁 Estructura del Proyecto

```
Mapa-Marciano/
├── .env                      # Variables de entorno locales (ignorado por git)
├── .env.example              # Plantilla pública de variables de entorno
├── .gitignore                # Reglas de exclusión de Git (node_modules, .env, etc.)
├── docker-compose.yml        # Orquestación de MySQL 8.0 en contenedor
├── package.json              # Scripts orquestadores del repositorio
├── README.md                 # Documentación técnica del proyecto
├── database/
│   └── init.sql              # Script SQL inicial (tablas astronautas, rutas, astronauta_rutas + seed)
├── BackEnd/                  # Servidor de API (Node.js + Express)
│   ├── .env                  # Variables locales del backend
│   ├── .env.example          # Plantilla de variables del backend
│   ├── package.json          # Dependencias y scripts de Node.js (mysql2, dotenv, express, etc.)
│   └── src/
│       ├── index.js          # Servidor Express básico en puerto 4000
│       ├── constants/        # Puntos y constantes geográficas marcianas
│       ├── routes/           # Endpoints de API (/api/mapa, etc.)
│       └── services/         # Algoritmos Dijkstra, geodesia y muestreo satelital
└── FrontEnd/                 # Aplicación Cliente SPA (React 19 + Vite)
    ├── package.json          # Dependencias de React
    ├── vite.config.js        # Configuración de Vite
    ├── index.html            # Entrypoint HTML
    └── src/
        ├── App.jsx           # Componente principal con consola de comando marciana
        ├── components/       # Mapas Leaflet, minimapas y paneles espectrales
        ├── constants/        # Capas WMTS oficiales de NASA Mars Trek
        └── services/         # Conexión con endpoints del BackEnd
```
