import { createCanvas, loadImage } from '@napi-rs/canvas'
import { AttachmentBuilder } from 'discord.js'
import https from 'https'

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export default {
  name: 'a',
  aliases: ['avatar-simple'],
  description: 'Show avatar with circular frame',
  category: 'Member',
  usage: 'a [@user]',
  cooldown: 3,
  async execute(message, args) {
    try {
      let targetUser = message.author;

      if (args.length > 0) {
        const mentionedUser = message.mentions.users.first();
        if (mentionedUser) {
          targetUser = mentionedUser;
        } else {
          try {
            const fetchedUser = await message.client.users.fetch(args[0]);
            targetUser = fetchedUser;
          } catch (error) {
            return message.reply(" User not found. Please mention a valid user or provide a valid user ID.");
          }
        }
      }

      const isAnimated = targetUser.avatar && targetUser.avatar.startsWith('a_');

      if (isAnimated) {
        const gifURL = targetUser.displayAvatarURL({ extension: 'gif', size: 512 });
        const buffer = await fetchBuffer(gifURL);
        const attachment = new AttachmentBuilder(buffer, { name: 'avatar.gif' });
        return await message.reply({ files: [attachment] });
      }

      const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 512 });

      const size = 512;
      const border = 18;
      const total = size + border * 2;

      const canvas = createCanvas(total, total);
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, total, total);

      const gradient = ctx.createLinearGradient(0, 0, total, total);
      gradient.addColorStop(0, '#f7b733');
      gradient.addColorStop(1, '#fc4a1a');

      ctx.beginPath();
      ctx.arc(total / 2, total / 2, total / 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(total / 2, total / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const avatar = await loadImage(avatarURL);
      ctx.drawImage(avatar, border, border, size, size);
      ctx.restore();

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'avatar.png' });

      await message.reply({ files: [attachment] });

    } catch (error) {
      console.error('Error in a command:', error);
      message.reply(" An error occurred while fetching the avatar.");
    }
  }
};
