const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const {
    getApplicationCounts,
    getRecentApplications,
    getStaffStats
} = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff-panel')
        .setDescription('Панель кураторов'),

    async execute(interaction) {
        const counts = getApplicationCounts();
        const recent = getRecentApplications(5);
        const stats = getStaffStats();

        const topStaff = stats.slice(0, 5).map((data, index) => {
            const total =
                data.reviewed +
                data.accepted +
                data.denied +
                data.closed +
                data.locked +
                data.unlocked;

            return `**${index + 1}. <@${data.user_id}>** — ${total} действий`;
        }).join('\n') || 'Пока нет данных';

        const recentText = recent.map(app => {
            const statusMap = {
                pending: '🟡 Ожидает',
                review: '🔵 На рассмотрении',
                accepted: '🟢 Принята',
                denied: '🔴 Отклонена'
            };

            return `${statusMap[app.status] || app.status} — <@${app.user_id}> / ${app.nickname}`;
        }).join('\n') || 'Заявок пока нет';

        const embed = new EmbedBuilder()
            .setTitle('🛠 Панель кураторов')
            .setColor(0x2b2d31)
            .addFields(
                {
                    name: '📌 Заявки',
                    value:
                        `Всего: **${counts.total}**\n` +
                        `🟡 Ожидают: **${counts.pending}**\n` +
                        `🔵 На рассмотрении: **${counts.review}**\n` +
                        `🟢 Приняты: **${counts.accepted}**\n` +
                        `🔴 Отклонены: **${counts.denied}**`,
                    inline: true
                },
                {
                    name: '🏆 Топ кураторов',
                    value: topStaff,
                    inline: true
                },
                {
                    name: '🕘 Последние заявки',
                    value: recentText,
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};