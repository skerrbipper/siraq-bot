/**
 * Registra los slash commands en Discord.
 * Ejecutar una vez con: node deploy-commands.js
 */
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error('❌ Faltan DISCORD_TOKEN o CLIENT_ID en el .env');
    process.exit(1);
}

const commands = [];
const commandFiles = fs
    .readdirSync(path.join(__dirname, 'src/commands'))
    .filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'src/commands', file));
    if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`📦 Preparando: /${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n🔄 Registrando slash commands...');

        let data;
        if (GUILD_ID) {
            // Registro por servidor (instantáneo, para desarrollo)
            data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
                body: commands,
            });
            console.log(`✅ ${data.length} comandos registrados en el servidor (GUILD_ID: ${GUILD_ID})`);
        } else {
            // Registro global (puede tardar hasta 1 hora en propagarse)
            data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log(`✅ ${data.length} comandos registrados globalmente`);
        }
    } catch (err) {
        console.error('❌ Error registrando comandos:', err);
    }
})();
