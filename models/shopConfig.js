import mongoose from 'mongoose';

const ShopConfigSchema = new mongoose.Schema({
    guildId:   { type: String, required: true },
    channelId: { type: String, required: true },
    bgUrl:     { type: String, required: true },
    price:     { type: Number, required: true, default: 0 },
    name:      { type: String, default: 'Profile Background' },
    messageId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});

const ShopConfig = mongoose.model('ShopConfig', ShopConfigSchema);
export default ShopConfig;
