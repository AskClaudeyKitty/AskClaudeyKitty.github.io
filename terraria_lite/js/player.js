const player = {
  x: WORLD_W * TILE / 2, y: 50 * TILE,
  vx: 0, vy: 0,
  w: 18, h: 34,
  hp: 100, maxHp: 100,
  hunger: 100,
  facing: 1,
  onGround: false,
  inv: [],
  hotbar: [null, null, null, null, null, null, null, null, null],
  selected: 0,
  mining: null,
  swing: 0,
};

let camX = 0, camY = 0;

function addItem(id, count) {
  const item = ITEMS[id] || BLOCKS[id];
  if (!item) return;
  for (let i = 0; i < 9; i++) {
    if (player.hotbar[i] && player.hotbar[i].id === id) {
      player.hotbar[i].count += count;
      updateHotbar();
      return;
    }
  }
  for (let i = 0; i < 9; i++) {
    if (!player.hotbar[i]) {
      player.hotbar[i] = { id, count };
      updateHotbar();
      return;
    }
  }
  for (const s of player.inv) {
    if (s.id === id) { s.count += count; updateHotbar(); return; }
  }
  player.inv.push({ id, count });
  updateHotbar();
  if (inventoryOpen) updateInventoryPanel();
}

function hasItems(need) {
  const all = [...player.hotbar.filter(s => s), ...player.inv];
  for (const [id, count] of need) {
    let have = 0;
    for (const s of all) if (s.id === id) have += s.count;
    if (have < count) return false;
  }
  return true;
}

function consumeItems(need) {
  for (const [id, count] of need) {
    let rem = count;
    for (const s of player.hotbar) {
      if (s && s.id === id) {
        const take = Math.min(rem, s.count);
        s.count -= take;
        rem -= take;
        if (s.count <= 0) {
          const idx = player.hotbar.indexOf(s);
          player.hotbar[idx] = null;
        }
        if (rem <= 0) break;
      }
    }
    for (const s of player.inv) {
      if (s.id === id) {
        const take = Math.min(rem, s.count);
        s.count -= take;
        rem -= take;
        if (s.count <= 0) {
          const idx = player.inv.indexOf(s);
          player.inv.splice(idx, 1);
        }
        if (rem <= 0) break;
      }
    }
  }
  updateHotbar();
}

function updateHotbar() {
  const el = document.getElementById('hotbar');
  el.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const s = player.hotbar[i];
    const div = document.createElement('div');
    div.className = 'slot' + (i === player.selected ? ' active' : '');
    if (s) {
      const item = ITEMS[s.id] || BLOCKS[s.id];
      div.textContent = item.icon || (item.name[0] || '?');
      div.style.color = item.color || '#fff';
      if (s.count > 1) {
        const c = document.createElement('span');
        c.className = 'count';
        c.textContent = s.count;
        div.appendChild(c);
      }
    }
    el.appendChild(div);
  }
}

function showMsg(text) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.style.opacity = 1;
  setTimeout(() => el.style.opacity = 0, 2000);
}

function updatePlayer() {
  const speed = 0.4;
  const jump = -7.5;
  const friction = 0.85;
  const gravity = 0.35;
  
  if (keys['a'] || keys['ArrowLeft']) { player.vx -= speed; player.facing = -1; }
  if (keys['d'] || keys['ArrowRight']) { player.vx += speed; player.facing = 1; }
  if ((keys['w'] || keys[' '] || keys['ArrowUp']) && player.onGround) {
    player.vy = jump;
    player.onGround = false;
  }
  
  player.vx *= friction;
  player.vy += gravity;
  
  // X collision - check leading edge
  player.x += player.vx;
  const topY = Math.floor(player.y / TILE);
  const botY = Math.floor((player.y + player.h - 1) / TILE);
  
  if (player.vx > 0) {
    const rightEdge = Math.floor((player.x + player.w) / TILE);
    if (isSolid(rightEdge, topY) || isSolid(rightEdge, botY)) {
      player.x = rightEdge * TILE - player.w - 0.1;
      player.vx = 0;
    }
  } else if (player.vx < 0) {
    const leftEdge = Math.floor(player.x / TILE);
    if (isSolid(leftEdge, topY) || isSolid(leftEdge, botY)) {
      player.x = (leftEdge + 1) * TILE + 0.1;
      player.vx = 0;
    }
  }
  
  // Y collision - check leading edge
  player.y += player.vy;
  const leftX = Math.floor(player.x / TILE);
  const rightX = Math.floor((player.x + player.w - 1) / TILE);
  
  if (player.vy > 0) {
    const botEdge = Math.floor((player.y + player.h) / TILE);
    if (isSolid(leftX, botEdge) || isSolid(rightX, botEdge)) {
      player.y = botEdge * TILE - player.h - 0.1;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }
  } else if (player.vy < 0) {
    const topEdge = Math.floor(player.y / TILE);
    if (isSolid(leftX, topEdge) || isSolid(rightX, topEdge)) {
      player.y = (topEdge + 1) * TILE + 0.1;
      player.vy = 0;
    }
  } else {
    // Check if still on ground
    const botEdge = Math.floor((player.y + player.h) / TILE);
    player.onGround = isSolid(leftX, botEdge) || isSolid(rightX, botEdge);
  }
  
  player.x = Math.max(0, Math.min(WORLD_W * TILE - player.w, player.x));
  player.y = Math.max(0, Math.min(WORLD_H * TILE - player.h, player.y));
  
  player.hunger -= 0.005;
  if (player.hunger <= 0) { player.hunger = 0; player.hp -= 0.05; }
  
  camX += (player.x - W/2 - camX) * 0.1;
  camY += (player.y - H/2 - camY) * 0.1;
  camX = Math.max(0, Math.min(WORLD_W * TILE - W, camX));
  camY = Math.max(0, Math.min(WORLD_H * TILE - H, camY));
}
