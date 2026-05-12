const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const { getStaffStats } = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Показать статистику кураторов'),

    async execute(interaction) {
        const stats = getStaffStats();

        if (!stats.length) {
            return interaction.reply({
                content: '📊 Статистика пока пустая.',
                ephemeral: true
            });
        }

        const description = stats.map((data, index) => {
            return [
                `**${index + 1}. <@${data.user_id}>**`,
                `👀 Рассмотрел: ${data.reviewed}`,
                `✅ Принял: ${data.accepted}`,
                `❌ Отклонил: ${data.denied}`,
                `🔒 Закрыл тикетов: ${data.closed}`,
                `🔐 Закрыл чат: ${data.locked}`,
                `🔓 Открыл чат: ${data.unlocked}`
            ].join('\n');
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('📊 Статистика кураторов')
            .setDescription(description)
            .setColor(0x2b2d31)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};