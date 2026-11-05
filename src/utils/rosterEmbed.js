const { EmbedBuilder } = require('discord.js');
const { loadConfig, loadRoster } = require('./database');

const RANK_ORDER = ['Jefe', 'Subjefe', 'Oficial', 'Camello'];

const RANK_ICONS = {
    'Jefe': '👑',
    'Subjefe': '🥈',
    'Oficial': '⭐',
    'Camello': '🐪',
};

/**
 * Construye el embed de la plantilla agrupado por rango.
 */
function buildRosterEmbed() {
    const config = loadConfig();
    const roster = loadRoster();
    const members = roster.members || [];

    const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('👥 Plantilla de la Banda')
        .setTimestamp()
        .setFooter({ text: `${members.length} miembro${members.length !== 1 ? 's' : ''} en total · Última actualización` });

    if (members.length === 0) {
        embed.setDescription('> No hay ningún miembro registrado.');
        return embed;
    }

    // Agrupa por rango
    const grouped = {};
    for (const rank of RANK_ORDER) grouped[rank] = [];
    for (const m of members) {
        const rank = RANK_ORDER.includes(m.rank) ? m.rank : 'Camello';
        grouped[rank].push(m);
    }

    let totalShown = 0;
    for (const rank of RANK_ORDER) {
        const list = grouped[rank];
        if (list.length === 0) continue;

        const icon = RANK_ICONS[rank] || '•';
        const lines = list.map((m, i) => {
            totalShown++;
            const status = m.absent ? ' *(ausente)*' : '';
            const mention = m.discordId ? ` <@${m.discordId}>` : '';
            return `> \`${String(totalShown).padStart(2, '0')}\` **${m.name}**${mention}${status}`;
        });

        embed.addFields({
            name: `${icon} ${rank} — ${list.length}`,
            value: lines.join('\n'),
            inline: false,
        });
    }

    return embed;
}

/**
 * Actualiza (o crea) el mensaje de la plantilla en el canal configurado.
 */
async function updateRosterMessage(client) {
    const config = loadConfig();
    if (!config.rosterChannelId) return;

    const channel = await client.channels.fetch(config.rosterChannelId).catch(() => null);
    if (!channel) return;

    const embed = buildRosterEmbed();

    try {
        if (config.rosterMessageId) {
            const msg = await channel.messages.fetch(config.rosterMessageId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed] });
                return;
            }
        }

        const { saveConfig } = require('./database');
        const newMsg = await channel.send({ embeds: [embed] });
        config.rosterMessageId = newMsg.id;
        saveConfig(config);
    } catch (err) {
        console.error('[RosterEmbed] Error actualizando plantilla:', err.message);
    }
}

module.exports = { buildRosterEmbed, updateRosterMessage };
