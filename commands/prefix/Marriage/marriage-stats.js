import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SectionBuilder, 
  ThumbnailBuilder, 
  MessageFlags 
} from 'discord.js'
import fs from 'fs'
const path = './marriages.json';

const loadMarriageData = () => {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } else {
    return {};
  }
};

const cooldowns = new Map(); // Cooldown map for users
const COOLDOWN_TIME = 5000; // 5 seconds cooldown

export default {
  name: 'marry-stats',
  aliases: ['marrystats'],
  description: 'Check your marriage status and view marriage statistics.',
  async execute(interactionOrMessage) {
    const isInteraction = !!interactionOrMessage.user; // Check if it's an interaction or message
    const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
    const replyMethod = isInteraction ? interactionOrMessage.reply.bind(interactionOrMessage) : interactionOrMessage.channel.send.bind(interactionOrMessage.channel);
    
    // Check if user is on cooldown
    if (cooldowns.has(user.id)) {
      // React with the cooldown emoji
      await interactionOrMessage.react('');  // Or use any other emoji you prefer

      const cooldownContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`# Please Wait\nPlease wait a few seconds before checking your stats again.`)
        );

      return replyMethod({
        components: [cooldownContainer],
        flags: [MessageFlags.IsComponentsV2]
      });
    }

    // Set cooldown for the user
    cooldowns.set(user.id, Date.now() + COOLDOWN_TIME);
    setTimeout(() => cooldowns.delete(user.id), COOLDOWN_TIME); // Remove cooldown after the specified time

    const marriageData = loadMarriageData();
    if (!marriageData[user.id]) {
      const noDataContainer = new ContainerBuilder()
        .setAccentColor(0xFFFFFF)
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`#  No Marriage Data\nYou are not currently married.\n\nUse \`+marry @user\` to propose to someone!\n\n**${interactionOrMessage.guild.name} Marriage System**`)
        );
      return replyMethod({ 
        components: [noDataContainer], 
        flags: [MessageFlags.IsComponentsV2] 
      });
    }

    const marriage = marriageData[user.id];
    const partnerId = marriage.partner;
    const marriageDate = new Date(marriage.date);
    const timestamp = Math.floor(marriageDate.getTime() / 1000); 
    
    const formattedDate = `<t:${timestamp}:D>`; // Format the marriage date
    const formattedAge = `<t:${timestamp}:R>`; // Format how long the marriage has been active
    
    const partner = await interactionOrMessage.client.users.fetch(partnerId);
    
    const marriageContainer = new ContainerBuilder()
      .setAccentColor(0xFFFFFF)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(`#  Marriage Status\n\n${user}${partner}\n\n**Marriage Date:** ${formattedDate}\n**Marriage Age:** ${formattedAge}`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(partner.displayAvatarURL({ dynamic: true }))
          )
      );

    replyMethod({ 
      components: [marriageContainer], 
      flags: [MessageFlags.IsComponentsV2] 
    });
  }
};
