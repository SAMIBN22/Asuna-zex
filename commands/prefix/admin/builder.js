/**
 * &builder
 * Interactively build a Discord ComponentsV2 container panel.
 */
import { handleBuilderInit } from '../../../handlers/builderHandler.js';

export default {
    name:        'builder',
    aliases:     ['build', 'cb', 'containerbuilder'],
    description: 'Build a ComponentsV2 container panel interactively.',
    category:    'Admin',
    usage:       '&builder',

    async execute(message, args, client) {
        await handleBuilderInit(message, client);
    },
};
