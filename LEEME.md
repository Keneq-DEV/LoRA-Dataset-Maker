# LoRA Dataset Maker

Herramienta para organizar datasets de entrenamiento LoRA: renombra, convierte
a PNG y gestiona los prompts `.txt` de cada imagen, todo desde una interfaz
oscura y profesional.

---

## Requisitos

- **Node.js 18 o superior** — descárgalo gratis desde <https://nodejs.org>
  (elige el botón "LTS"). En Windows, el instalador trae todo lo necesario.
- **Internet** — solo para la **primera ejecución** (instala dependencias).
  Después la app funciona **100% offline**.

---

## Cómo usar

### Windows
1. Descomprime el `.zip` en una carpeta (por ejemplo en el Escritorio).
2. Haz **doble clic en `iniciar.bat`**.
3. La primera vez pedirá instalar dependencias (tarda 2-5 min, requiere internet).
4. Se abre automáticamente el navegador en <http://localhost:3000>.
5. ¡Listo! Usa la app.

### Linux / Mac
1. Descomprime el `.zip`.
2. Desde la terminal, dentro de la carpeta:
   ```bash
   ./iniciar.sh
   ```
3. El navegador se abre solo en <http://localhost:3000>.

### Detener la app
- **Windows**: cierra la ventana negra (símbolo del sistema).
- **Linux/Mac**: pulsa `Ctrl+C` en la terminal.

---

## Cómo funciona

### 1. Cargar tu dataset
Tienes tres opciones:
- **Ruta de carpeta**: escribe la ruta absoluta a tu carpeta en el campo
  superior y pulsa "Cargar carpeta". Ej: `C:\Users\tu\Desktop\mi-dataset`
- **Subir archivos**: pulsa "Subir archivos" y selecciona varios.
- **Arrastrar y soltar**: arrastra imágenes `.png`/`.jpg`/`.webp`/etc. y
  archivos `.txt` directamente sobre el panel.

### 2. Procesar y renumerar
Pulsa **"Procesar y renumerar"** y elige el modo de numeración:

- **Automático (recomendado)**: mínimo 3 dígitos (`000.png`...`999.png`).
  Si el dataset pasa de 999 imágenes, **todo el set se re-padrea** a 4 dígitos
  (`0000.png`...`1000.png`), y así sucesivamente.
- **Sin padding**: `0.png`, `1.png`, `2.png`...
- **Fijo 3 / 4 / 5 dígitos**: fuerza un ancho concreto.

Esto también:
- **Convierte a PNG** cualquier JPG/WEBP/GIF/BMP/TIFF/AVIF.
- **Crea `.txt` vacío** para las imágenes que no tengan uno.
- **Preserva los `.txt` ya existentes** — su contenido se mantiene intacto,
  solo se renombra el archivo para coincidir con la imagen.

Resultado: `000.png` + `000.txt`, `001.png` + `001.txt`, etc.

### 3. Editar prompts
- Pulsa cualquier imagen del panel izquierdo para seleccionarla.
- En el panel derecho verás la preview grande y un textarea para el prompt.
- Escribe tus tags / caption y pulsa **Guardar** (o `Ctrl+S` si lo añades).
- **Aplicar a todos**: con un solo prompt puedes:
  - **Sobrescribir todo** — reemplaza todos los `.txt`.
  - **Anexar al final** — agrega el prompt al contenido existente.
  - **Solo los vacíos** — rellena solo los `.txt` sin contenido.

### 4. Eliminar
- Pasa el ratón sobre una tarjeta y pulsa el icono de papelera para borrar
  la imagen y su `.txt`.

---

## Formatos soportados

**Entrada (imágenes)**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`,
`.tif`, `.tiff`, `.avif`, `.jxl`

**Salida**: siempre `.png` (compresión nivel 9).

**Texto**: `.txt` (UTF-8).

---

## ¿Dónde se guardan mis archivos?

Los archivos del dataset se guardan en la carpeta `datasets/` dentro del
directorio de la app. Esa carpeta se crea automáticamente la primera vez
que cargas algo.

Si quieres mover tu dataset a otro lado, simplemente copia la carpeta
`datasets/` completa — todas las imágenes y `.txt` están ahí.

---

## Solución de problemas

### "Node.js no está instalado"
Descárgalo de <https://nodejs.org> (botón LTS) e instala. Después vuelve a
hacer doble clic en `iniciar.bat`.

### "Error al instalar dependencias"
- Verifica tu conexión a internet.
- Si estás detrás de un proxy/corporativo, configura npm:
  ```
  npm config set proxy http://tu-proxy:puerto
  ```
- Borra la carpeta `node_modules` y el archivo `package-lock.json` (si existe)
  y vuelve a intentarlo.

### El puerto 3000 ya está en uso
Otra app está usando ese puerto. Edita `iniciar.bat` y cambia `3000` por otro
puerto (ej: `3001`).

### Las imágenes no se ven
Pulsa el botón "Actualizar" en la barra superior para recargar el listado.

### Quiero resetear todo
Borra el contenido de la carpeta `datasets/`. La app la recreará vacía.

---

## Estructura del proyecto

```
lora-dataset-maker/
├── iniciar.bat          ← Doble clic para ejecutar (Windows)
├── iniciar.sh           ← Lanzador Linux/Mac
├── LEEME.md             ← Este archivo
├── package.json         ← Solo dependencias necesarias (~550 MB instalado)
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
├── eslint.config.mjs
└── src/
    ├── app/
    │   ├── api/dataset/  ← 8 endpoints (scan, upload, list, file, text, process, delete, info, open-folder)
    │   ├── globals.css   ← Tema oscuro
    │   ├── layout.tsx
    │   └── page.tsx      ← UI principal
    ├── components/ui/    ← 10 componentes (solo los usados)
    ├── hooks/            ← use-mobile, use-toast
    └── lib/
        ├── dataset.ts    ← Lógica central (renumerar, convertir, etc.)
        └── utils.ts
└── datasets/             ← Se crea aquí tu dataset (al ejecutar)
```

---

## Stack técnico
- **Next.js 16** con App Router
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** (tema oscuro monocromo)
- **shadcn/ui** (solo 10 componentes necesarios)
- **sharp** para conversión a PNG
- **lucide-react** para iconos
- **react-resizable-panels** para paneles redimensionables

---

## Licencia
Uso libre. Hecho para la comunidad LoRA.
