const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
} = require('discord.js');
const { loadConfig, saveConfig } = require('../utils/database');
const { updateInventoryMessage } = require('../utils/inventoryEmbed');

// ──────────────────────────────────────────────────────────────────
//  Helper: comprueba si el usuario puede usar /config
// ──────────────────────────────────────────────────────────────────
function hasAdminAccess(interaction) {
    const config = loadConfig();
    // Si tiene Administrador de servidor, siempre puede
    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
    // Si tiene algún rol admin configurado
    if (config.adminRoleIds?.length > 0) {
        return config.adminRoleIds.some((id) => interaction.member?.roles.cache.has(id));
    }
    return false;
}

// ──────────────────────────────────────────────────────────────────
//  Construye el panel principal
// ──────────────────────────────────────────────────────────────────
function buildMainPanel(config) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚙️ Configuración del Armario')
        .setDescription('Gestiona la configuración del bot desde este panel.')
        .addFields(
            {
                name: '📥 Canal de Logs',
                value: config.logChannelId ? `<#${config.logChannelId}>` : '`No configurado`',
                inline: true,
            },
            {
                name: '📋 Canal de Inventario',
                value: config.inventoryChannelId ? `<#${config.inventoryChannelId}>` : '`No configurado`',
                inline: true,
            },
            {
                name: '🎭 Roles con acceso',
                value:
                    config.allowedRoleIds?.length > 0
                        ? config.allowedRoleIds.map((id) => `<@&${id}>`).join(', ')
                        : '`Todos (sin restricción)`',
                inline: false,
            },
            {
                name: '🛡️ Roles de admin',
                value:
                    config.adminRoleIds?.length > 0
                        ? config.adminRoleIds.map((id) => `<@&${id}>`).join(', ')
                        : '`Solo administradores del servidor`',
                inline: false,
            },
            {
                name: '😴 Canal de Ausencias',
                value: config.absenceChannelId ? `<#${config.absenceChannelId}>` : '`No configurado`',
                inline: true,
            },
            {
                name: '😴 Rol de Ausente',
                value: config.absenceRoleId ? `<@&${config.absenceRoleId}>` : '`No configurado`',
                inline: true,
            },
            {
                name: '🎨 Color del embed',
                value: `\`${config.embedColor}\``,
                inline: true,
            },
            {
                name: '📛 Título del inventario',
                value: `\`${config.title}\``,
                inline: true,
            },
        )
        .setFooter({ text: 'Usa los botones para modificar la configuración' })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config:setLogChannel')
            .setLabel('Canal de Logs')
            .setEmoji('📥')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('config:setInvChannel')
            .setLabel('Canal de Inventario')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('config:setAppearance')
            .setLabel('Apariencia')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config:manageRoles')
            .setLabel('Gestionar Roles')
            .setEmoji('🎭')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('config:setAbsence')
            .setLabel('Ausencias')
            .setEmoji('😴')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('config:refreshInventory')
            .setLabel('Actualizar Inventario')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Success),
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('config:clearInventory')
            .setLabel('Limpiar Inventario')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row1, row2, row3], ephemeral: true };
}

// ──────────────────────────────────────────────────────────────────
//  Comando slash
// ──────────────────────────────────────────────────────────────────
module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Abre el panel de configuración del armario')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!hasAdminAccess(interaction)) {
            return interaction.reply({
                content: '❌ No tienes permiso para usar este comando.',
                ephemeral: true,
            });
        }

        const config = loadConfig();
        await interaction.reply(buildMainPanel(config));
    },

    // ──────────────────────────────────────────────────────────────
    //  Botones
    // ──────────────────────────────────────────────────────────────
    async handleButton(interaction) {
        if (!hasAdminAccess(interaction)) {
            return interaction.reply({ content: '❌ Sin permiso.', ephemeral: true });
        }

        const action = interaction.customId.split(':')[1];

        // ── Canal de Logs ──
        if (action === 'setLogChannel') {
            const modal = new ModalBuilder()
                .setCustomId('config:modalLogChannel')
                .setTitle('📥 Canal de Logs');

            const input = new TextInputBuilder()
                .setCustomId('channelId')
                .setLabel('ID del canal de logs')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('123456789012345678')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        // ── Canal de Inventario ──
        if (action === 'setInvChannel') {
            const modal = new ModalBuilder()
                .setCustomId('config:modalInvChannel')
                .setTitle('📋 Canal de Inventario');

            const input = new TextInputBuilder()
                .setCustomId('channelId')
                .setLabel('ID del canal de inventario')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('123456789012345678')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        // ── Apariencia ──
        if (action === 'setAppearance') {
            const config = loadConfig();
            const modal = new ModalBuilder()
                .setCustomId('config:modalAppearance')
                .setTitle('🎨 Apariencia del Inventario');

            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Título del inventario')
                .setStyle(TextInputStyle.Short)
                .setValue(config.title || '🔫 Armario del Barrio')
                .setRequired(true);

            const colorInput = new TextInputBuilder()
                .setCustomId('color')
                .setLabel('Color del embed (hex)')
                .setStyle(TextInputStyle.Short)
                .setValue(config.embedColor || '#FF0000')
                .setPlaceholder('#FF0000')
                .setRequired(true);

            const footerInput = new TextInputBuilder()
                .setCustomId('footer')
                .setLabel('Texto del footer')
                .setStyle(TextInputStyle.Short)
                .setValue(config.footer || 'Última actualización')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(colorInput),
                new ActionRowBuilder().addComponents(footerInput),
            );
            return interaction.showModal(modal);
        }

        // ── Ausencias ──
        if (action === 'setAbsence') {
            const config = loadConfig();
            const modal = new ModalBuilder()
                .setCustomId('config:modalAbsence')
                .setTitle('😴 Configurar Ausencias');

            const channelInput = new TextInputBuilder()
                .setCustomId('absenceChannelId')
                .setLabel('ID del canal de ausencias')
                .setStyle(TextInputStyle.Short)
                .setValue(config.absenceChannelId || '')
                .setPlaceholder('123456789012345678')
                .setRequired(false);

            const roleInput = new TextInputBuilder()
                .setCustomId('absenceRoleId')
                .setLabel('ID del rol de ausente')
                .setStyle(TextInputStyle.Short)
                .setValue(config.absenceRoleId || '')
                .setPlaceholder('123456789012345678')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(channelInput),
                new ActionRowBuilder().addComponents(roleInput),
            );
            return interaction.showModal(modal);
        }

        // ── Gestionar roles ──
        if (action === 'manageRoles') {
            const modal = new ModalBuilder()
                .setCustomId('config:modalRoles')
                .setTitle('🎭 Gestionar Roles');

            const config = loadConfig();

            const allowedInput = new TextInputBuilder()
                .setCustomId('allowedRoles')
                .setLabel('IDs de roles con acceso (separados por coma)')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(config.allowedRoleIds?.join(', ') || '')
                .setPlaceholder('123456789, 987654321  (vacío = todos)')
                .setRequired(false);

            const adminInput = new TextInputBuilder()
                .setCustomId('adminRoles')
                .setLabel('IDs de roles de admin del bot (separados por coma)')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(config.adminRoleIds?.join(', ') || '')
                .setPlaceholder('123456789  (vacío = solo admins del servidor)')
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(allowedInput),
                new ActionRowBuilder().addComponents(adminInput),
            );
            return interaction.showModal(modal);
        }

        // ── Actualizar inventario ──
        if (action === 'refreshInventory') {
            await interaction.deferUpdate();
            await updateInventoryMessage(interaction.client);
            const config = loadConfig();
            await interaction.editReply({
                ...buildMainPanel(config),
                content: '✅ Inventario actualizado.',
            });
            return;
        }

        // ── Limpiar inventario ──
        if (action === 'clearInventory') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('config:clearConfirm')
                    .setLabel('Sí, limpiar todo')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('config:clearCancel')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary),
            );

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ ¿Limpiar el inventario?')
                        .setDescription('Esto **eliminará todos los items** del armario. ¿Estás seguro?'),
                ],
                components: [confirmRow],
            });
        }

        if (action === 'clearConfirm') {
            const { saveInventory } = require('../utils/database');
            saveInventory({ items: {} });

            // Resetea el mensaje del inventario para que se recree
            const config = loadConfig();
            config.inventoryMessageId = null;
            saveConfig(config);

            await updateInventoryMessage(interaction.client);
            const newConfig = loadConfig();
            return interaction.update({
                ...buildMainPanel(newConfig),
                content: '🗑️ Inventario limpiado.',
            });
        }

        if (action === 'clearCancel') {
            const config = loadConfig();
            return interaction.update(buildMainPanel(config));
        }
    },

    // ──────────────────────────────────────────────────────────────
    //  Modales
    // ──────────────────────────────────────────────────────────────
    async handleModal(interaction) {
        if (!hasAdminAccess(interaction)) {
            return interaction.reply({ content: '❌ Sin permiso.', ephemeral: true });
        }

        const action = interaction.customId.split(':')[1];
        const config = loadConfig();

        // ── Canal de Logs ──
        if (action === 'modalLogChannel') {
            const channelId = interaction.fields.getTextInputValue('channelId').trim();
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (!channel) {
                return interaction.reply({
                    content: `❌ No encontré el canal con ID \`${channelId}\`. Asegúrate de copiar bien el ID.`,
                    ephemeral: true,
                });
            }

            config.logChannelId = channelId;
            saveConfig(config);

            await interaction.update({
                ...buildMainPanel(config),
                content: `✅ Canal de logs configurado: <#${channelId}>`,
            });
            return;
        }

        // ── Canal de Inventario ──
        if (action === 'modalInvChannel') {
            const channelId = interaction.fields.getTextInputValue('channelId').trim();
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (!channel) {
                return interaction.reply({
                    content: `❌ No encontré el canal con ID \`${channelId}\`.`,
                    ephemeral: true,
                });
            }

            config.inventoryChannelId = channelId;
            config.inventoryMessageId = null; // fuerza recrear el mensaje
            saveConfig(config);

            await updateInventoryMessage(interaction.client);
            const newConfig = loadConfig();
            await interaction.update({
                ...buildMainPanel(newConfig),
                content: `✅ Canal de inventario configurado: <#${channelId}>`,
            });
            return;
        }

        // ── Apariencia ──
        if (action === 'modalAppearance') {
            const title = interaction.fields.getTextInputValue('title').trim();
            const color = interaction.fields.getTextInputValue('color').trim();
            const footer = interaction.fields.getTextInputValue('footer').trim();

            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                return interaction.reply({
                    content: '❌ El color debe ser un hex válido como `#FF0000`.',
                    ephemeral: true,
                });
            }

            config.title = title;
            config.embedColor = color;
            if (footer) config.footer = footer;
            saveConfig(config);

            // Resetea el mensaje para que se recree con el nuevo aspecto
            config.inventoryMessageId = null;
            saveConfig(config);
            await updateInventoryMessage(interaction.client);

            const newConfig = loadConfig();
            return interaction.update({
                ...buildMainPanel(newConfig),
                content: '✅ Apariencia actualizada.',
            });
        }

        // ── Ausencias ──
        if (action === 'modalAbsence') {
            const channelId = interaction.fields.getTextInputValue('absenceChannelId').trim();
            const roleId = interaction.fields.getTextInputValue('absenceRoleId').trim();

            if (channelId) {
                const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                if (!channel) {
                    return interaction.reply({
                        content: `❌ No encontré el canal con ID \`${channelId}\`.`,
                        ephemeral: true,
                    });
                }
                config.absenceChannelId = channelId;
            } else {
                config.absenceChannelId = null;
            }

            if (roleId) {
                const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
                if (!role) {
                    return interaction.reply({
                        content: `❌ No encontré el rol con ID \`${roleId}\`.`,
                        ephemeral: true,
                    });
                }
                config.absenceRoleId = roleId;
            } else {
                config.absenceRoleId = null;
            }

            saveConfig(config);

            return interaction.update({
                ...buildMainPanel(config),
                content: '✅ Configuración de ausencias actualizada.',
            });
        }

        // ── Roles ──
        if (action === 'modalRoles') {
            const parseIds = (str) =>
                str
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => /^\d+$/.test(s));

            const allowedRaw = interaction.fields.getTextInputValue('allowedRoles');
            const adminRaw = interaction.fields.getTextInputValue('adminRoles');

            config.allowedRoleIds = parseIds(allowedRaw);
            config.adminRoleIds = parseIds(adminRaw);
            saveConfig(config);

            return interaction.update({
                ...buildMainPanel(config),
                content: '✅ Roles actualizados.',
            });
        }
    },
};
