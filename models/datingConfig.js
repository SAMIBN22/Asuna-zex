import mongoose from 'mongoose';

const datingConfigSchema = new mongoose.Schema({
    guildId:          { type: String, required: true, unique: true },
    panelChannelId:   { type: String, default: null },  // where the public panel lives
    maleChannelId:    { type: String, default: null },  // male profiles posted here
    femaleChannelId:  { type: String, default: null },  // female profiles posted here
    threadChannelId:  { type: String, default: null },  // thread posts go here
});

export default mongoose.model('DatingConfig', datingConfigSchema);
