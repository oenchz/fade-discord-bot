const { EmbedBuilder } = require('discord.js');

async function sendErrorLog(client, title, error) {
    try {
        const channelId = process.env.LOG_CHANNEL_ID;
        if (!channelId) return;

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const errorText = error?.stack || error?.message || String(error);

        const embed = new EmbedBuilder()
            .setTitle(`🚨 ${title}`)
            .setDescription(`\`\`\`js\n${errorText.slice(0, 3500)}\n\`\`\``)
            .setColor(0xe74c3c)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Ошибка при отправке error log:', err);
    }
}

function setupErrorHandlers(client) {
    process.on('unhandledRejection', async error => {
        console.error('Unhandled Rejection:', error);
        await sendErrorLog(client, 'Unhandled Rejection', error);
    });

    process.on('uncaughtException', async error => {
        console.error('Uncaught Exception:', error);
        await sendErrorLog(client, 'Uncaught Exception', error);
    });

    process.on('uncaughtExceptionMonitor', async error => {
        console.error('Uncaught Exception Monitor:', error);
        await sendErrorLog(client, 'Uncaught Exception Monitor', error);
    });

    client.on('error', async error => {
        console.error('Client Error:', error);
        await sendErrorLog(client, 'Discord Client Error', error);
    });

    client.on('warn', warning => {
        console.warn('Client Warning:', warning);
    });
}

module.exports = {
    setupErrorHandlers,
    sendErrorLog
};