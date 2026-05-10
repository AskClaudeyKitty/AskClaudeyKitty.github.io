const TILE = 24;
const WORLD_W = 400, WORLD_H = 300;
const DAY_LEN = 24000;

const BLOCKS = {
  0: { name: 'Air', solid: false },
  1: { name: 'Dirt', color: '#8a5a2a', solid: true, hp: 2 },
  2: { name: 'Stone', color: '#777', solid: true, hp: 4 },
  3: { name: 'Grass', color: '#4a8a2a', solid: true, hp: 2, top: true },
  4: { name: 'Wood', color: '#a74', solid: true, hp: 3, drop: 4 },
  5: { name: 'Leaves', color: '#2a6a1a', solid: false, hp: 1 },
  6: { name: 'Sand', color: '#d4c85a', solid: true, hp: 2 },
  7: { name: 'Coal', color: '#222', solid: true, hp: 5, drop: 20 },
  8: { name: 'Iron', color: '#a66', solid: true, hp: 6, drop: 21 },
  9: { name: 'Gold', color: '#da4', solid: true, hp: 8, drop: 22 },
  10: { name: 'Torch', color: '#fd4', solid: false, light: 12, hp: 1 },
  11: { name: 'Plank', color: '#b84', solid: true, hp: 3 },
  12: { name: 'Crafting Table', color: '#a74', solid: true, hp: 4, special: 'craft' },
  13: { name: 'Furnace', color: '#666', solid: true, hp: 6, special: 'smelt' },
  14: { name: 'Glass', color: '#aaddff88', solid: false, hp: 2 },
  15: { name: 'Brick', color: '#a55', solid: true, hp: 5 },
  16: { name: 'Mossy Stone', color: '#586', solid: true, hp: 5 },
  17: { name: 'Water', color: '#2488', solid: false, hp: 1 },
};

const ITEMS = {
  20: { name: 'Coal', icon: '⚫', color: '#444' },
  21: { name: 'Iron Ore', icon: '◆', color: '#a66' },
  22: { name: 'Gold Ore', icon: '◆', color: '#da4' },
  23: { name: 'Stick', icon: '/', color: '#a74' },
  24: { name: 'Iron Bar', icon: '▬', color: '#bbb' },
  25: { name: 'Gold Bar', icon: '▬', color: '#fd4' },
  26: { name: 'Wooden Pick', icon: '⛏', color: '#a74', tool: 'pick', power: 2, speed: 12 },
  27: { name: 'Stone Pick', icon: '⛏', color: '#888', tool: 'pick', power: 3, speed: 10 },
  28: { name: 'Iron Pick', icon: '⛏', color: '#bbb', tool: 'pick', power: 5, speed: 8 },
  29: { name: 'Gold Pick', icon: '⛏', color: '#fd4', tool: 'pick', power: 7, speed: 6 },
  30: { name: 'Wooden Sword', icon: '⚔', color: '#a74', tool: 'sword', dmg: 12 },
  31: { name: 'Stone Sword', icon: '⚔', color: '#888', tool: 'sword', dmg: 18 },
  32: { name: 'Iron Sword', icon: '⚔', color: '#bbb', tool: 'sword', dmg: 25 },
  33: { name: 'Gold Sword', icon: '⚔', color: '#fd4', tool: 'sword', dmg: 35 },
  34: { name: 'Apple', icon: '🍎', color: '#d44', food: 15 },
  35: { name: 'Cooked Meat', icon: '🍖', color: '#a64', food: 30 },
};

const RECIPES = [
  { out: 11, count: 4, need: [[4, 1]], name: 'Plank' },
  { out: 23, count: 4, need: [[4, 1]], name: 'Stick' },
  { out: 12, count: 1, need: [[11, 4]], name: 'Crafting Table' },
  { out: 26, count: 1, need: [[11, 3], [23, 2]], name: 'Wooden Pick' },
  { out: 30, count: 1, need: [[11, 2], [23, 1]], name: 'Wooden Sword' },
  { out: 27, count: 1, need: [[2, 3], [23, 2]], name: 'Stone Pick' },
  { out: 31, count: 1, need: [[2, 2], [23, 1]], name: 'Stone Sword' },
  { out: 24, count: 1, need: [[21, 2], [20, 1]], name: 'Iron Bar', station: 'smelt' },
  { out: 25, count: 1, need: [[22, 2], [20, 1]], name: 'Gold Bar', station: 'smelt' },
  { out: 28, count: 1, need: [[24, 3], [23, 2]], name: 'Iron Pick' },
  { out: 32, count: 1, need: [[24, 2], [23, 1]], name: 'Iron Sword' },
  { out: 29, count: 1, need: [[25, 3], [23, 2]], name: 'Gold Pick' },
  { out: 33, count: 1, need: [[25, 2], [23, 1]], name: 'Gold Sword' },
  { out: 14, count: 2, need: [[2, 1], [20, 1]], name: 'Glass', station: 'smelt' },
  { out: 15, count: 4, need: [[2, 1]], name: 'Brick', station: 'smelt' },
  { out: 13, count: 1, need: [[2, 8]], name: 'Furnace' },
];
