const world = new Uint8Array(WORLD_W * WORLD_H);
const light = new Uint8Array(WORLD_W * WORLD_H);

function generate() {
  function noise(x) {
    return Math.sin(x * 0.05) * 8 + Math.sin(x * 0.13) * 4 + Math.sin(x * 0.03) * 12;
  }
  
  const surface = [];
  for (let x = 0; x < WORLD_W; x++) {
    surface[x] = Math.floor(60 + noise(x));
  }
  
  for (let x = 0; x < WORLD_W; x++) {
    for (let y = 0; y < WORLD_H; y++) {
      const i = y * WORLD_W + x;
      const s = surface[x];
      if (y < s - 4) {
        world[i] = 0;
      } else if (y === s) {
        world[i] = 3;
      } else if (y < s + 3) {
        world[i] = 1;
      } else if (y < s + 8) {
        world[i] = Math.random() < 0.3 ? 6 : 1;
      } else if (y < s + 20) {
        world[i] = 2;
        if (Math.random() < 0.03) world[i] = 7;
        if (Math.random() < 0.015) world[i] = 8;
        if (y > s + 15 && Math.random() < 0.008) world[i] = 9;
      } else {
        world[i] = 2;
        if (Math.random() < 0.05) world[i] = 7;
        if (Math.random() < 0.02) world[i] = 8;
        if (y > s + 30 && Math.random() < 0.01) world[i] = 9;
        if (Math.random() < 0.1) world[i] = 16;
      }
      
      if (y > s + 5) {
        const cave = Math.sin(x * 0.08) * Math.sin(y * 0.12) + Math.sin(x * 0.15 + y * 0.07);
        if (cave > 0.6) world[i] = 0;
      }
    }
    
    if (x % 7 === 3 && Math.random() < 0.6) {
      const base = surface[x];
      for (let ty = base - 1; ty >= base - 5; ty--) {
        if (ty >= 0) world[ty * WORLD_W + x] = 4;
      }
      for (let dy = -3; dy >= -5; dy--) {
        for (let dx = -2; dx <= 2; dx++) {
          const ly = base + dy, lx = x + dx;
          if (ly >= 0 && lx >= 0 && lx < WORLD_W && world[ly * WORLD_W + lx] === 0) {
            world[ly * WORLD_W + lx] = 5;
          }
        }
      }
    }
  }
  
  const px = Math.floor(WORLD_W / 2);
  player.x = px * TILE;
  // Find safe air spawn above ground
  let spawnY = 50;
  while (spawnY > 0 && getBlock(px, spawnY) !== 0) spawnY--;
  player.y = spawnY * TILE;
}

function getBlock(x, y) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return 0;
  return world[y * WORLD_W + x];
}

function setBlock(x, y, id) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
  world[y * WORLD_W + x] = id;
}

function isSolid(x, y) {
  const b = BLOCKS[getBlock(x, y)];
  return b && b.solid;
}
