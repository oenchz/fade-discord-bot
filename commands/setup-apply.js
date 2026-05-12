const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-apply')
        .setDescription('Создать панель заявок'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Оформление заявки в семью')
            .setDescription(
                [
                    '**Хочешь стать частью нашей семьи?**',
                    '',
                    'Нажми кнопку ниже и заполни короткую анкету.',
                    '',
                    '**Как это работает:**',
                    '・Ты отправляешь заявку через форму.',
                    '・Для тебя создаётся отдельный тикет.',
                    '・Администрация рассматривает заявку.',
                    '・Ответ обычно приходит в течение **1–2 дней**.',
                    '',
                    '**Важно:**',
                    '・Заполняй анкету честно и подробно.',
                    '・Следи за своим тикетом после отправки.',
                    '・Если кнопка недоступна — набор временно закрыт.',
                    '',
                    '**FADE Family • Заявки открыты**'
                ].join('\n')
            )
            .setColor(0x2b2d31);

        const button = new ButtonBuilder()
            .setCustomId('apply_button')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};