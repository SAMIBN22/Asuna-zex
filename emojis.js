// ═══════════════════════════════════════════════════════════════════
//   EMOJIS.JS — Central emoji map (standard Unicode emojis only)
// ═══════════════════════════════════════════════════════════════════

const emojis = {

  // ── Status / General ───────────────────────────────────────────
  yes:        '✅',
  no:         '❌',
  warning:    '⚠️',
  info:       'ℹ️',
  loading:    '⏳',
  timer:      '⏰',
  stopwatch:  '⏱️',
  dot:        '•',
  arrow:      '➤',
  unknown:    '❓',
  star:       '⭐',
  sparkles:   '✨',
  prev:       '◀',
  next:       '▶',
  refresh:    '🔄',
  bar:        '▌',

  // ── Admin / Moderation ─────────────────────────────────────────
  lock:       '🔒',
  unlock:     '🔓',
  ban:        '🔨',
  kick:       '👢',
  mute:       '🔇',
  unmute:     '🔊',
  shield:     '🛡️',
  block:      '🚫',
  announce:   '📢',
  members:    '👥',
  robot:      '🤖',
  security:   '🔐',
  timeout:    '⏰',
  deny:       '⛔',
  softban:    '🔨',
  blmove:     '🚫',

  // ── Roles Panel ────────────────────────────────────────────────
  role:       '🎭',
  add:        '➕',
  remove:     '➖',
  crown:      '👑',
  label:      '🏷️',
  palette:    '🎨',
  badge:      '🎖️',
  image:      '🖼️',
  person:     '👤',
  id:         '🆔',
  tool:       '🛠️',

  // ── Logs Panel ────────────────────────────────────────────────
  headphones: '🎧',
  party:      '🎉',
  gear:       '⚙️',
  ticket:     '🎫',
  mic:        '🎙️',
  pin:        '📌',
  inbox:      '📭',
  calendar:   '📅',

  // ── Bot Management ────────────────────────────────────────────
  broom:      '🧹',
  trash:      '🗑️',
  edit:       '✏️',
  number:     '🔢',
  search:     '🔍',
  speech:     '💬',
  note:       '📝',
  link:       '🔗',
  key:        '🔑',
  eye:        '👁️',
  green:      '🟢',
  red:        '🔴',
  black_dot:  '⚫',
  bell:       '🔔',
  save:       '💾',

  // ── Auto Setup ────────────────────────────────────────────────
  wave:       '👋',
  clouds:     '☁️',

  // ── Statistics ────────────────────────────────────────────────
  diamond:    '💎',
  trophy:     '🏆',
  chart:      '📊',
  bg:         '🖼️',
  user_pic:   '🧑',

  // ── Casino ────────────────────────────────────────────────────
  coin:       '🪙',
  bank:       '🏦',
  money:      '💰',
  spend:      '💸',
  gift:       '🎁',
  fire:       '🔥',
  dice:       '🎲',
  target:     '🎯',
  jackpot:    '🎰',
  coupon:     '🎟️',
  rocket:     '🚀',
  explosion:  '💥',
  chart_up:   '📈',
  chart_dn:   '📉',
  cop:        '👮',
  thief:      '🦹',
  moon:       '🌙',
  dark_moon:  '🌑',
  horse:      '🏇',
  finish:     '🏁',
  lightning:  '⚡',
  wind:       '💨',
  hint:       '💡',
  fish:       '🐟',
  rod:        '🎣',
  boot:       '🥾',
  plant:      '🌿',
  tropical:   '🐠',
  shark:      '🦈',
  snake:      '🐍',
  ribbon:     '🎀',
  cash:       '💵',
  briefcase:  '💼',
  card_spade: '♠️',
  card_club:  '♣️',
  card_heart: '♥️',
  card_dia:   '♦️',
  back_card:  '🂠',
  joker:      '🃏',
  stop_hand:  '🛑',
  handshake:  '🤝',
  up_arrow:   '⬆️',
  down_arrow: '⬇️',
  white_dot:  '⚪',
  roulette:   '🎡',
  top10:      '🔟',
  gold:       '🥇',
  silver:     '🥈',
  bronze:     '🥉',
  bomb:       '💣',
  black_sq:   '⬛',
  cherry:     '🍒',
  grapes:     '🍇',
  orange_f:   '🍊',
  lemon:      '🍋',

  // ── Voice ──────────────────────────────────────────────────────
  headset:    '🎧',
  vc_lock:    '🔒',
  vc_hide:    '🙈',
  vc_limit:   '🔢',
  vc_name:    '✏️',
  vc_list:    '📢',
  random:     '🎲',

  // ── Warnings ──────────────────────────────────────────────────
  warn:       '⚠️',

  // ── Rank / Levels ─────────────────────────────────────────────
  rank_sl:    '🎚️',
  rank_exp:   '📤',

  // ── Tweets ────────────────────────────────────────────────────
  twitter:    '🐦',
  settings:   '⚙️',
  export:     '📤',
  wrench:     '🔧',
  copy:       '©️',
  inbox_tw:   '📨',
  write:      '✍️',

  // ── Voting ────────────────────────────────────────────────────
  hand:       '✋',
  vote_x:     '✖️',
  celebrate:  '🎊',
  glasses:    '👓',

  // ── VIP Rooms ─────────────────────────────────────────────────
  door:       '🚪',
  game:       '🎮',

  // ── Marriage ──────────────────────────────────────────────────
  ring:       '💍',

  // ── Events / System ───────────────────────────────────────────
  guild_star: '🌟',
  castle:     '🏰',
  tts:        '🌙',
  color_r:    '🔴',
  color_b:    '🔵',
  color_o:    '🟠',
  emoji_none: '😶',
  emoji_sm:   '😄',
  brain:      '🧠',
  trans:      '⚧️',
  earth:      '🌍',
  cake:       '🎂',
  think:      '💭',

};

export default emojis;
