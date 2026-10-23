import fs from 'fs';
import path from 'path';

const SRC_ROOT = '/tmp/clan_bot_extract/bot/commands/prefix';
const DEST = 'bot/commands/prefix/Clan';

const categories = ['botsettings', 'coleaders', 'general', 'leaders', 'managers', 'setup'];

// files that need a rename to avoid command-name collisions when flattened
const renameMap = {
  'leaders/editrolecolor.mjs': { file: 'myrolecolor.js', name: 'myrolecolor' },
  'leaders/editroleicon.mjs': { file: 'myroleicon.js', name: 'myroleicon' },
};

// skip the clan bot's own help command entirely (current bot has its own &help)
const skip = new Set(['general/help.mjs']);

function transform(content) {
  let out = content;

  out = out.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/models\/GuildConfig\.mjs\1/g, "from $1../../../models/clanConfig.js$1");
  out = out.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/models\/GuildSetup\.mjs\1/g, "from $1../../../models/clanGuildSetup.js$1");
  out = out.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/config\/config\.mjs\1/g, "from $1../../../config/clanConfig.js$1");
  out = out.replace(/from\s+(['"])\.\.\/\.\.\/\.\.\/utils\/logger\.mjs\1/g, "from $1../../../utils/clanLogger.js$1");

  // theme namespace: client.themes -> client.clanThemes (also message.client.themes)
  out = out.replace(/\.themes(?=[\?\.\[])/g, '.clanThemes');
  out = out.replace(/\.themes\b/g, '.clanThemes');

  return out;
}

function ensureCategoryField(content) {
  if (/category\s*:/.test(content)) {
    // replace any existing category value with 'Clan'
    return content.replace(/category\s*:\s*(['"]).*?\1/, "category: 'Clan'");
  }
  // insert category field right after the name field
  return content.replace(/(name\s*:\s*(['"]).*?\2\s*,)/, "$1\n  category: 'Clan',");
}

let count = 0;
for (const cat of categories) {
  const dir = path.join(SRC_ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs'));
  for (const file of files) {
    const relKey = `${cat}/${file}`;
    if (skip.has(relKey)) continue;

    const srcPath = path.join(dir, file);
    let content = fs.readFileSync(srcPath, 'utf8');

    content = transform(content);
    content = ensureCategoryField(content);

    let destFile = file.replace(/\.mjs$/, '.js');
    if (renameMap[relKey]) {
      destFile = renameMap[relKey].file;
      const newName = renameMap[relKey].name;
      content = content.replace(/name\s*:\s*(['"]).*?\1/, `name: '${newName}'`);
    }

    fs.writeFileSync(path.join(DEST, destFile), content, 'utf8');
    count++;
  }
}

console.log(`Migrated ${count} clan commands into ${DEST}`);
