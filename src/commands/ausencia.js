const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
} = require('discord.js');
const {
    loadConfig,
    saveConfig,
    addAbsence,
    removeAbsence,
    loadAbsences,
    getActiveAbsences,
} = require('../utils/database');

// ──────────────────────────────────────────────────────────────
//  Utilidades de fecha
// ──────────────────────────────────────────────────────────────

/**
 * Parsea una fecha en formato DD/MM/YYYY o DD-MM-YYYY.
 * Devuelve un objeto Date o null si el formato es inválido.
 */
function parseDate(str) {
    const clean = str.trim().replace(/-/g, '/');
    const parts = clean.split('/');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    // Año de 2 dígitos → 2000+
    const fullYear = year < 100 ? 2000 + year : year;
    const date = new Date(fullYear, month - 1, day, 23, 59, 59);

    if (isNaN(date.getTime())) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return date;
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ──────────────────────────────────────────────────────────────
//  Comando slash
// ──────────────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ausencia')
        .setDescription('Gestiona las ausencias del servidor')
        .addSubcommand((sub) =>
            sub.setName('ver').setDescription('Ver todas las ausencias activas')
        )
        .addSubcommand((sub) =>
            sub
                .setName('cancelar')
                .setDescription('Cancela tu ausencia activa')
        )
        .addSubcommand((sub) =>
            sub
                .setName('config')
                .setDescription('Configura el canal y rol de ausencias (solo admins)')
                .addStringOption((opt) =>
                    opt.setName('canal_id').setDescription('ID del canal de ausencias').setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName('rol_id').setDescription('ID del rol de ausente').setRequired(true)
                )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const config = loadConfig();

        // ── Config ──
        if (sub === 'config') {
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                const adminOk = config.adminRoleIds?.some((id) => interaction.member?.roles.cache.has(id));
                if (!adminOk) {
                    return interaction.reply({ content: '❌ Solo los admins pueden configurar esto.', ephemeral: true });
                }
            }

            const channelId = interaction.options.getString('canal_id').trim();
            const roleId = interaction.options.getString('rol_id').trim();

            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);

            if (!channel) return interaction.reply({ content: `❌ Canal no encontrado: \`${channelId}\``, ephemeral: true });
            if (!role) return interaction.reply({ content: `❌ Rol no encontrado: \`${roleId}\``, ephemeral: true });

            config.absenceChannelId = channelId;
            config.absenceRoleId = roleId;
            saveConfig(config);

            return interaction.reply({
                content: `✅ Canal de ausencias: <#${channelId}>\n✅ Rol de ausente: <@&${roleId}>`,
                ephemeral: true,
            });
        }

        // ── Ver ausencias ──
        if (sub === 'ver') {
            const active = getActiveAbsences();

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('😴 Ausencias activas')
                .setTimestamp();

            if (active.length === 0) {
                embed.setDescription('No hay ninguna ausencia activa actualmente.');
            } else {
                for (const a of active) {
                    embed.addFields({
                        name: `👤 ${a.username}`,
                        value: [
                            `📅 Desde: **${formatDate(a.startDate)}**`,
                            `📅 Hasta: **${formatDate(a.endDate)}**`,
                            a.reason ? `📝 Motivo: ${a.reason}` : '',
                        ]
                            .filter(Boolean)
                            .join('\n'),
                        inline: false,
                    });
                }
            }

            return interaction.reply({ embeds: [embed] });
        }

        // ── Cancelar ausencia ──
        if (sub === 'cancelar') {
            const data = loadAbsences();
            const absence = data.absences.find((a) => a.userId === interaction.user.id);

            if (!absence) {
                return interaction.reply({ content: '❌ No tienes ninguna ausencia registrada.', ephemeral: true });
            }

            // Quita el rol si lo tiene
            if (config.absenceRoleId) {
                await interaction.member?.roles.remove(config.absenceRoleId).catch(() => null);
            }

            removeAbsence(interaction.user.id);

            return interaction.reply({
                content: '✅ Tu ausencia ha sido cancelada y se te ha quitado el rol.',
                ephemeral: true,
            });
        }
    },

    // ──────────────────────────────────────────────────────────
    //  Botones — llamado desde interactionCreate.js
    // ──────────────────────────────────────────────────────────
    async handleButton(interaction) {
        const parts = interaction.customId.split(':');
        // customId: ausencia:register:<userId>  o  ausencia:cancel:<userId>
        const action = parts[1];
        const targetUserId = parts[2];

        if (action === 'register') {
            // Solo el propio usuario puede registrar su ausencia
            if (interaction.user.id !== targetUserId) {
                return interaction.reply({
                    content: '❌ Este botón no es tuyo.',
                    ephemeral: true,
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`ausencia:modalRegister:${targetUserId}`)
                .setTitle('📅 Registrar Ausencia');

            const startInput = new TextInputBuilder()
                .setCustomId('startDate')
                .setLabel('Fecha de inicio (DD/MM/AAAA)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('05/11/2026')
                .setRequired(true);

            const endInput = new TextInputBuilder()
                .setCustomId('endDate')
                .setLabel('Fecha de vuelta (DD/MM/AAAA)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('10/11/2026')
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Motivo (opcional)')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Personal, trabajo, viaje...')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(startInput),
                new ActionRowBuilder().addComponents(endInput),
                new ActionRowBuilder().addComponents(reasonInput),
            );

            return interaction.showModal(modal);
        }
    },

    // ──────────────────────────────────────────────────────────
    //  Modales
    // ──────────────────────────────────────────────────────────
    async handleModal(interaction) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const targetUserId = parts[2];

        if (action === 'modalRegister') {
            const config = loadConfig();

            const startStr = interaction.fields.getTextInputValue('startDate');
            const endStr = interaction.fields.getTextInputValue('endDate');
            const reason = interaction.fields.getTextInputValue('reason') || null;

            const startDate = parseDate(startStr);
            const endDate = parseDate(endStr);

            if (!startDate) {
                return interaction.reply({
                    content: `❌ Fecha de inicio inválida: \`${startStr}\`. Usa el formato **DD/MM/AAAA**.`,
                    ephemeral: true,
                });
            }

            if (!endDate) {
                return interaction.reply({
                    content: `❌ Fecha de vuelta inválida: \`${endStr}\`. Usa el formato **DD/MM/AAAA**.`,
                    ephemeral: true,
                });
            }

            if (endDate <= startDate) {
                return interaction.reply({
                    content: '❌ La fecha de vuelta debe ser posterior a la de inicio.',
                    ephemeral: true,
                });
            }

            const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!member) {
                return interaction.reply({ content: '❌ No encontré tu perfil en el servidor.', ephemeral: true });
            }

            // Asigna el rol de ausente
            if (config.absenceRoleId) {
                await member.roles.add(config.absenceRoleId).catch((err) => {
                    console.error('[Ausencia] Error asignando rol:', err.message);
                });
            }

            // Guarda la ausencia
            addAbsence(
                targetUserId,
                member.displayName || member.user.username,
                reason,
                startDate.toISOString(),
                endDate.toISOString(),
                interaction.message?.id || null,
            );

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('✅ Ausencia registrada')
                .addFields(
                    { name: '👤 Miembro', value: `<@${targetUserId}>`, inline: true },
                    { name: '📅 Inicio', value: formatDate(startDate.toISOString()), inline: true },
                    { name: '📅 Vuelta', value: formatDate(endDate.toISOString()), inline: true },
                )
                .setTimestamp();

            if (reason) embed.addFields({ name: '📝 Motivo', value: reason, inline: false });

            embed.setFooter({ text: 'El rol de ausente se quitará automáticamente en la fecha de vuelta' });

            // Edita el mensaje original quitando el botón
            await interaction.message?.edit({ components: [] }).catch(() => null);

            return interaction.reply({ embeds: [embed] });
        }
    },
};
