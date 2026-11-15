# Mapa-Marciano 

Aplicación web para planificación de rutas, cartografía marciana y telemetría de rovers en Marte. Desarrollada con **React** en el FrontEnd, **Node.js (Express)** en el BackEnd y **MySQL 8.0** en un contenedor **Docker** aislado para la base de datos.

---

## Arquitectura del Entorno de Desarrollo

* **Base de Datos :** Motor **MySQL 8.0** ejecutándose en un contenedor Docker (`mapa_marciano_db`) con persistencia en un volumen nombrado y migración inicial automática (`./database/init.sql`).
* **BackEnd:** Servidor API REST con **Node.js + Express** corriendo en tu máquina local (`http://localhost:4000`).
* **FrontEnd:** Aplicación cliente SPA con **React + Vite** corriendo en tu máquina local (`http://localhost:5173`).

---

##  Requisitos Previos

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

##  Paso 1: Configurar Variables de Entorno

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

## Paso 2: Iniciar la Base de Datos con Docker

Únicamente la base de datos corre dentro de Docker. Para iniciar el contenedor de MySQL 8.0:

```bash
docker compose up -d
```

### Credenciales Oficiales de Prueba (Autenticación MySQL)

Puedes iniciar sesión con cualquiera de los siguientes operadores creados en la base de datos:

| Identificador | Usuario | Clave de Acceso | Nombre del Astronauta |
|---|---|---|---|
| `ASTRO-01` | `eramos` | `Ares2026Pass!` | Elena Ramos (Comandante de Misión) |
| `ASTRO-02` | `mwatney` | `BotanistMars42!` | Mark Watney (Especialista Botánico / Geología) |
| `ASTRO-03` | `cherrera` | `RoverPilot33!` | Carlos Herrera (Piloto Principal de Rover) |


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
  >  **Precaución:** Esto eliminará todos los registros de la base de datos.
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

##  Resolución de Conflictos de Puertos (MySQL Local)

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

##  Paso 3: Instalación de Dependencias

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

## Paso 4: Cómo Correr la Aplicación

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

##  Compilar para Producción (Build)

Para generar el bundle optimizado de React:
```bash
npm run build
```
Los artefactos estáticos se compilarán en `FrontEnd/dist/`.

---
