const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const activeEvents = new Map();

module.exports = {
    activeEvents,

    async create(interaction) {

        const place = interaction.fields.getTextInputValue('event_place');
        const time = interaction.fields.getTextInputValue('event_time');
        const limit = interaction.fields.getTextInputValue('event_limit');
        const roleId = interaction.fields.getTextInputValue('event_role');
        const description = interaction.fields.getTextInputValue('event_description') || 'Без описания';

        const channel = await interaction.guild.channels
            .fetch(process.env.EVENT_CHANNEL_ID)
            .catch(() => null);

        if (!channel) {
            return interaction.reply({
                content: '❌ Канал ивентов не найден.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎉 Новый ивент')
            .setColor(0x5865f2)
            .addFields(
                {
                    name: '📍 Куда идём',
                    value: place,
                    inline: true
                },
                {
                    name: '🕒 Время',
                    value: time,
                    inline: true
                },
                {
                    name: '👥 Нужно людей',
                    value: limit,
                    inline: true
                },
                {
                    name: '📝 Описание',
                    value: description,
                    inline: false
                },
                {
                    name: '✅ Участники (0/' + limit + ')',
                    value: 'Пока никто не записался.',
                    inline: false
                }
            )
            .setFooter({
                text: `Создал ${interaction.user.username}`
            })
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('event_join')
                .setLabel('➕ Иду')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('event_leave')
                .setLabel('➖ Не иду')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('event_list')
                .setLabel('📋 Список')
                .setStyle(ButtonStyle.Secondary)
        );

        const message = await channel.send({
            content: `<@&${roleId}>`,
            embeds: [embed],
            components: [buttons]
        });

        activeEvents.set(message.id, {
            limit: parseInt(limit),
            users: []
        });

        await interaction.reply({
            content: `✅ Ивент создан: ${message.url}`,
            ephemeral: true
        });
    }
};