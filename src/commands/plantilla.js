const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const {
    loadConfig,
    addMember,
    removeMember,
    updateMember,
    loadRoster,
} = require('../utils/database');
const { buildRosterEmbed, updateRosterMessage } = require('../utils/rosterEmbed');

const RANKS = ['Jefe', 'Subjefe', 'Oficial', 'Camello'];

function hasAdminAccess(interaction) {
    const config = loadConfig();
    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
    return config.adminRoleIds?.some((id) => interaction.member?.roles.cache.has(id));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plantilla')
        .setDescription('Gestiona la plantilla de la banda')
        .addSubcommand((sub) =>
            sub.setName('ver').setDescription('Ver la plantilla actual')
        )
        .addSubcommand((sub) =>
            sub
                .setName('añadir')
                .setDescription('Añade un miembro a la plantilla')
                .addUserOption((opt) =>
                    opt.setName('miembro').setDescription('Usuario de Discord').setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('nombre')
                        .setDescription('Nombre en el juego')
                        .setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('rango')
                        .setDescription('Rango en la banda')
                        .setRequired(true)
                        .addChoices(
                            { name: '👑 Jefe', value: 'Jefe' },
                            { name: '🥈 Subjefe', value: 'Subjefe' },
                            { name: '⭐ Oficial', value: 'Oficial' },
                            { name: '🐪 Camello', value: 'Camello' },
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('quitar')
                .setDescription('Elimina un miembro de la plantilla')
                .addUserOption((opt) =>
                    opt.setName('miembro').setDescription('Usuario de Discord').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('rango')
                .setDescription('Cambia el rango de un miembro')
                .addUserOption((opt) =>
                    opt.setName('miembro').setDescription('Usuario de Discord').setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName('rango')
                        .setDescription('Nuevo rango')
                        .setRequired(true)
                        .addChoices(
                            { name: '👑 Jefe', value: 'Jefe' },
                            { name: '🥈 Subjefe', value: 'Subjefe' },
                            { name: '⭐ Oficial', value: 'Oficial' },
                            { name: '🐪 Camello', value: 'Camello' },
                        )
                )
        )
        .addSubcommand((sub) =>
            sub.setName('actualizar').setDescription('Fuerza la actualización del mensaje de plantilla')
        ),

    async execute(interaction) {
        // Todos los subcomandos requieren acceso admin
        if (!hasAdminAccess(interaction)) {
            return interaction.reply({
                content: '❌ No tienes permiso para gestionar la plantilla.',
                ephemeral: true,
            });
        }

        const sub = interaction.options.getSubcommand();
        const config = loadConfig();

        // ── Actualizar ──
        if (sub === 'actualizar') {
            await interaction.deferReply({ ephemeral: true });
            if (!config.rosterChannelId) {
                return interaction.editReply({
                    content: '❌ No hay canal de plantilla configurado. Usa `/config` para configurarlo.',
                });
            }
            await updateRosterMessage(interaction.client);
            return interaction.editReply({ content: '✅ Plantilla actualizada.' });
        }

        // ── Ver ──
        if (sub === 'ver') {
            const embed = buildRosterEmbed();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── Añadir ──
        if (sub === 'añadir') {
            const user = interaction.options.getUser('miembro');
            const name = interaction.options.getString('nombre');
            const rank = interaction.options.getString('rango');
            const addedBy = interaction.user.username;

            addMember(user.id, name, rank, addedBy);

            const embed = new EmbedBuilder()
                .setColor('#00FF7F')
                .setTitle('✅ Miembro añadido')
                .addFields(
                    { name: 'Discord', value: `<@${user.id}>`, inline: true },
                    { name: 'Nombre in-game', value: name, inline: true },
                    { name: 'Rango', value: rank, inline: true },
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            await updateRosterMessage(interaction.client);
            return;
        }

        // ── Quitar ──
        if (sub === 'quitar') {
            const user = interaction.options.getUser('miembro');
            const removed = removeMember(user.id);

            if (!removed) {
                return interaction.reply({
                    content: `❌ <@${user.id}> no está en la plantilla.`,
                    ephemeral: true,
                });
            }

            await interaction.reply({
                content: `✅ <@${user.id}> eliminado de la plantilla.`,
                ephemeral: true,
            });
            await updateRosterMessage(interaction.client);
            return;
        }

        // ── Cambiar rango ──
        if (sub === 'rango') {
            const user = interaction.options.getUser('miembro');
            const newRank = interaction.options.getString('rango');

            const updated = updateMember(user.id, { rank: newRank });
            if (!updated) {
                return interaction.reply({
                    content: `❌ <@${user.id}> no está en la plantilla. Añádelo primero con \`/plantilla añadir\`.`,
                    ephemeral: true,
                });
            }

            await interaction.reply({
                content: `✅ Rango de <@${user.id}> actualizado a **${newRank}**.`,
                ephemeral: true,
            });
            await updateRosterMessage(interaction.client);
            return;
        }
    },
};
