const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { loadConfig } = require('../utils/database');

module.exports = {
    name: Events.MessageCreate,
    // Este handler lo registramos con un nombre distinto para no colisionar con messageCreate.js
    // Lo manejamos desde messageCreate.js directamente
    _isAbsenceHandler: true,
};

/**
 * Llamado desde messageCreate.js cuando el mensaje es en el canal de ausencias.
 */
async function handleAbsenceChannel(message) {
    if (message.author.bot) return;

    // Responde con botón para registrar la ausencia
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ausencia:register:${message.author.id}`)
            .setLabel('📅 Registrar mi ausencia')
            .setStyle(ButtonStyle.Primary),
    );

    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setDescription(
            `👋 <@${message.author.id}>, he visto tu mensaje.\n` +
            `Pulsa el botón para registrar las fechas y te asignaré el rol de ausente automáticamente.`
        );

    await message.reply({
        embeds: [embed],
        components: [row],
        allowedMentions: { repliedUser: false },
    });
}

module.exports = { handleAbsenceChannel };
