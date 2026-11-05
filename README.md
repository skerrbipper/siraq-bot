# 🔫 Armario Bot — FiveM Discord

Bot de Discord para gestionar el armario del barrio: controla entradas y salidas de material con logs automáticos y un inventario siempre actualizado.

---

## 📋 Requisitos

- Node.js 18 o superior
- Una aplicación de bot en [Discord Developer Portal](https://discord.com/developers/applications)
- Intents habilitados en el portal: **Message Content Intent**, **Server Members Intent**

---

## 🚀 Instalación

```bash
# 1. Instala dependencias
npm install

# 2. Crea el archivo de configuración
copy .env.example .env
```

Edita `.env` con tus datos:
```
DISCORD_TOKEN=tu_token_aqui
CLIENT_ID=tu_client_id_aqui
GUILD_ID=tu_guild_id_aqui   # opcional, para comandos instantáneos en un servidor
```

```bash
# 3. Registra los slash commands
node deploy-commands.js

# 4. Arranca el bot
npm start
```

---

## ⚙️ Configuración inicial

Usa el comando `/config` en Discord (necesitas ser Admin del servidor).

El panel te permite configurar:
- **Canal de Logs** → donde escribirás `+ item` o `- item`
- **Canal de Inventario** → donde el bot mostrará la lista actualizada automáticamente
- **Roles con acceso** → quién puede añadir/quitar items
- **Roles de admin** → quién puede usar `/config`
- **Apariencia** → título, color, footer del embed

---

## 📝 Cómo usar los logs

Escribe en el canal de logs con este formato:

| Mensaje | Efecto |
|---------|--------|
| `+ 10 AK47` | Añade 10 AK47 a General |
| `+ 10 AK47 [Armas]` | Añade 10 AK47 a la categoría Armas |
| `- 5 AK47` | Retira 5 AK47 |
| `- 5 Chaleco [Chalecos]` | Retira 5 Chalecos |

El bot responde con un embed de confirmación y actualiza el inventario automáticamente.

---

## 🎮 Comandos Slash

| Comando | Descripción |
|---------|-------------|
| `/config` | Abre el panel de configuración (GUI) |
| `/inventario ver` | Muestra el inventario aquí mismo |
| `/inventario actualizar` | Fuerza la actualización del mensaje |
| `/item añadir` | Añade un item manualmente con autocompletado de categoría |
| `/item retirar` | Retira un item (autocompletado de nombres) |
| `/item info` | Consulta stock y detalles de un item |

---

## 📁 Estructura

```
armario bot/
├── src/
│   ├── commands/
│   │   ├── config.js       ← Panel GUI de configuración
│   │   ├── inventario.js   ← Ver/actualizar inventario
│   │   └── item.js         ← Añadir/retirar items manualmente
│   ├── events/
│   │   ├── ready.js
│   │   ├── messageCreate.js  ← Procesa logs del canal
│   │   └── interactionCreate.js
│   └── utils/
│       ├── database.js       ← Persistencia en JSON
│       ├── inventoryEmbed.js ← Construye y actualiza el embed
│       └── parseLog.js       ← Parsea el formato + / -
├── data/                     ← Generado automáticamente
│   ├── config.json
│   └── inventory.json
├── deploy-commands.js
├── .env.example
└── package.json
```

---

## 📦 Categorías disponibles

Armas · Munición · Drogas · Explosivos · Chalecos · Vehículos · Documentos · Dinero · General
