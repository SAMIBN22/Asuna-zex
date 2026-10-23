import { Events, PermissionsBitField } from 'discord.js';
import WebhookLogger from '../../functions/webhookLogger.js';

export default {
  name: Events.WebhookCreate,
  async execute(webhook, client) {
    if (!webhook.guild) return;

    try {
      const settings = await client.getSettings(webhook.guild.id);
      
      if (
        settings?.antiWebhook === 1 &&
        webhook.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageWebhooks)
      ) {
        await webhook.delete('Anti-Webhook system enabled.');
        const webhookLogger = new WebhookLogger(client);
        await webhookLogger.logInfo('Webhook Deleted', `Deleted webhook in ${webhook.guild.name}`, webhook.guild.id);
      }
    } catch (error) {
      const webhookLogger = new WebhookLogger(client);
      await webhookLogger.logError('Webhook Create Error', error, webhook.guild.id);
    }
  }
};
