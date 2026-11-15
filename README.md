# Mapa-Marciano

Aplicación web con **React** en el FrontEnd y **Node.js** en el BackEnd.

---

## Requisitos Previos

Asegúrate de tener instalado en tu computadora:
* [Node.js](https://nodejs.org/) (versión 18 o superior recomendada; verificado en v24)
* [npm](https://www.npmjs.com/) (incluido automáticamente con Node.js)

Puedes verificar si los tienes instalados ejecutando en tu terminal:
```bash
node -v
npm -v
```

---

## Instalación de Dependencias

Si clonas este repositorio en otra máquina o necesitas reinstalar los paquetes, ejecuta:

### Opción 1: Todo desde la raíz
```bash
# Instala dependencias globales del proyecto
npm install

# Instala dependencias del FrontEnd
npm install --prefix FrontEnd

# Instala dependencias del BackEnd
npm install --prefix BackEnd
```

### Opción 2: Carpeta por carpeta
```bash
# Dependencias de React
cd FrontEnd
npm install
cd ..

# Dependencias de Node.js
cd BackEnd
npm install
cd ..
```

---

## Cómo Correr la Aplicación

Puedes iniciar los entornos tanto desde la raíz del proyecto como entrando individualmente a cada carpeta.

### Modo 1: Desde la raíz del proyecto (`Mapa-Marciano/`)

* **Iniciar solo React (FrontEnd):**
  ```bash
  npm run dev
  # o también:
  npm start
  ```
  La aplicación abrirá en: **[http://localhost:5173](http://localhost:5173)**

* **Iniciar solo Node.js (BackEnd):**
  ```bash
  npm run backend
  ```
  El servidor estará escuchando en: **[http://localhost:4000](http://localhost:4000)**

* **Iniciar ambos simultáneamente (FrontEnd + BackEnd):**
  ```bash
  npm run dev:all
  ```

---

### Modo 2: Entrando a cada carpeta de forma independiente

* **FrontEnd (React):**
  ```bash
  cd FrontEnd
  npm run dev
  ```
  > Abre tu navegador en `http://localhost:5173` para ver el "Hola Mundo".

* **BackEnd (Node.js):**
  ```bash
  cd BackEnd
  npm run dev
  ```
  > Puedes probar la API abriendo `http://localhost:4000` o `http://localhost:4000/api/saludo`.

---

## Compilar para Producción (Build)

Para generar la versión optimizada de React:
```bash
# Desde la raíz:
npm run build

# O dentro de FrontEnd:
cd FrontEnd && npm run build
```
Los archivos de distribución se generarán en la carpeta `FrontEnd/dist/`.

---

## Estructura del Proyecto

```
Mapa-Marciano/
├── FrontEnd/                 # Aplicación Cliente (React 19 + Vite)
│   ├── src/
│   │   ├── App.jsx           # Componente básico "Hola Mundo"
│   │   ├── main.jsx          # Punto de entrada de React
│   │   └── index.css         # Estilos globales mínimos
│   ├── index.html            # Plantilla HTML
│   └── package.json          # Dependencias y scripts de React
├── BackEnd/                  # Servidor de API (Node.js + Express)
│   ├── src/
│   │   └── index.js          # Servidor Express básico en puerto 4000
│   └── package.json          # Dependencias y scripts de Node.js
├── package.json              # Scripts para orquestar la raíz
├── .gitignore                # Exclusión de node_modules, dist y temporales
└── README.md                 # Documentación completa del proyecto
```
