require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
//  Validación de variables de entorno
// ──────────────────────────────────────────────
const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of required) {
    if (!process.env[key]) {
        console.error(`❌ Falta la variable de entorno: ${key}`);
        process.exit(1);
    }
}

// ──────────────────────────────────────────────
//  Cliente de Discord
// ──────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel],
});

// ──────────────────────────────────────────────
//  Carga de comandos
// ──────────────────────────────────────────────
client.commands = new Collection();

const commandFiles = fs
    .readdirSync(path.join(__dirname, 'commands'))
    .filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'commands', file));
    if (command.data) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Comando cargado: /${command.data.name}`);
    }
}

// ──────────────────────────────────────────────
//  Carga de eventos
// ──────────────────────────────────────────────
const eventFiles = fs
    .readdirSync(path.join(__dirname, 'events'))
    .filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Evento cargado: ${event.name}`);
}

// ──────────────────────────────────────────────
//  Autocomplete
// ──────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isAutocomplete()) return;
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
        try {
            await command.autocomplete(interaction);
        } catch (err) {
            console.error('[Autocomplete Error]:', err);
        }
    }
});

// ──────────────────────────────────────────────
//  Login
// ──────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
    console.error('❌ Error al conectar con Discord:', err.message);
    process.exit(1);
});
