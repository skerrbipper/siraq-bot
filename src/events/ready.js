const { Events, ActivityType } = require('discord.js');
const { getExpiredAbsences, removeAbsence, loadConfig } = require('../utils/database');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Bot conectado como ${client.user.tag}`);
        client.user.setActivity('el armario del barrio 🔫', { type: ActivityType.Watching });

        // Arranca el checker de ausencias (cada 5 minutos)
        startAbsenceChecker(client);
    },
};

function startAbsenceChecker(client) {
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos

    const check = async () => {
        const config = loadConfig();
        if (!config.absenceRoleId) return;

        const expired = getExpiredAbsences();
        if (expired.length === 0) return;

        for (const absence of expired) {
            try {
                // Busca el guild donde está configurado el rol
                const guild = client.guilds.cache.find((g) =>
                    g.roles.cache.has(config.absenceRoleId)
                );
                if (!guild) continue;

                const member = await guild.members.fetch(absence.userId).catch(() => null);
                if (!member) {
                    // El miembro ya no está en el servidor, limpiamos igualmente
                    removeAbsence(absence.userId);
                    continue;
                }

                // Quita el rol de ausente
                if (member.roles.cache.has(config.absenceRoleId)) {
                    await member.roles.remove(config.absenceRoleId);
                    console.log(`[Ausencias] Rol quitado a ${absence.username} (ausencia expirada)`);
                }

                // Notifica en el canal de ausencias si está configurado
                if (config.absenceChannelId) {
                    const channel = await client.channels.fetch(config.absenceChannelId).catch(() => null);
                    if (channel) {
                        await channel.send({
                            content: `👋 <@${absence.userId}> ha vuelto de su ausencia. ¡Bienvenido/a de vuelta!`,
                        }).catch(() => null);
                    }
                }

                removeAbsence(absence.userId);
            } catch (err) {
                console.error(`[Ausencias] Error procesando ausencia de ${absence.username}:`, err.message);
            }
        }
    };

    // Ejecuta al arrancar y luego cada 5 minutos
    check();
    setInterval(check, CHECK_INTERVAL);
    console.log('✅ Checker de ausencias activo (cada 5 minutos)');
}
