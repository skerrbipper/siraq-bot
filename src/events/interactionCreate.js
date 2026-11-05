const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const client = interaction.client;

        // ── Slash commands ──────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(`[Command Error] /${interaction.commandName}:`, err);
                const msg = { content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg).catch(() => null);
                } else {
                    await interaction.reply(msg).catch(() => null);
                }
            }
            return;
        }

        // ── Botones ─────────────────────────────────────────────
        if (interaction.isButton()) {
            const command = client.commands.get(interaction.customId.split(':')[0]);
            if (command?.handleButton) {
                try {
                    await command.handleButton(interaction);
                } catch (err) {
                    console.error('[Button Error]:', err);
                }
            }
            return;
        }

        // ── Select menus ────────────────────────────────────────
        if (interaction.isStringSelectMenu()) {
            const command = client.commands.get(interaction.customId.split(':')[0]);
            if (command?.handleSelect) {
                try {
                    await command.handleSelect(interaction);
                } catch (err) {
                    console.error('[Select Error]:', err);
                }
            }
            return;
        }

        // ── Modales ─────────────────────────────────────────────
        if (interaction.isModalSubmit()) {
            const prefix = interaction.customId.split(':')[0];
            const command = client.commands.get(prefix);
            if (command?.handleModal) {
                try {
                    await command.handleModal(interaction);
                } catch (err) {
                    console.error('[Modal Error]:', err);
                }
            }
        }
    },
};
