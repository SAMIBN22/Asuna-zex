import mongoose from 'mongoose';

const SelfRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    categories: {
        gender: {
            name: { type: String, default: 'Gender Roles' },
            emoji: { type: String, default: '⚧' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        },
        games: {
            name: { type: String, default: 'Game Roles' },
            emoji: { type: String, default: '🎮' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        },
        continent: {
            name: { type: String, default: 'Continent Roles' },
            emoji: { type: String, default: '🌍' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        },
        age: {
            name: { type: String, default: 'Age Roles' },
            emoji: { type: String, default: '🎂' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        },
        personality: {
            name: { type: String, default: 'Personality Roles' },
            emoji: { type: String, default: '🧠' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        },
        situation: {
            name: { type: String, default: 'Situation Roles' },
            emoji: { type: String, default: '💭' },
            placement: { type: String, enum: ['combined', 'standalone'], default: 'combined' },
            displayMode: { type: String, enum: ['buttons', 'select', 'emoji'], default: 'buttons' },
            sortOrder: { type: String, enum: ['configured', 'name_asc', 'name_desc'], default: 'configured' },
            mappings: [{
                optionId: String,
                optionName: String,
                emoji: String,
                roleId: String
            }]
        }
    },
    bannerUrl: { type: String, default: null },
    standaloneMessageIds: { type: Object, default: {} },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.SelfRoleConfig || mongoose.model('SelfRoleConfig', SelfRoleSchema);
