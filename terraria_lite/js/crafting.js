let inventoryOpen = false;

function toggleInventory() {
  const panel = document.getElementById('inventory-panel');
  if (inventoryOpen) {
    panel.style.display = 'none';
    inventoryOpen = false;
    return;
  }
  panel.style.display = 'flex';
  inventoryOpen = true;
  updateInventoryPanel();
}

function updateInventoryPanel() {
  const grid = document.getElementById('inv-grid');
  grid.innerHTML = '';
  
  // Hotbar items first (9 slots)
  for (let i = 0; i < 9; i++) {
    const s = player.hotbar[i];
    const div = document.createElement('div');
    div.className = 'inv-slot' + (i === player.selected ? ' active' : '');
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
    grid.appendChild(div);
  }
  
  // Inventory items (11 more slots to fill 4 rows)
  for (let i = 0; i < 11; i++) {
    const s = player.inv[i];
    const div = document.createElement('div');
    div.className = 'inv-slot';
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
    grid.appendChild(div);
  }
  
  // Update HP bar
  const hpFill = document.getElementById('hp-fill');
  if (hpFill) hpFill.style.width = (player.hp / player.maxHp * 100) + '%';
  
  // Update crafting recipes
  const recipesEl = document.getElementById('inv-recipes');
  recipesEl.innerHTML = '';
  
  const px = Math.floor((player.x + player.w/2) / TILE);
  const py = Math.floor((player.y + player.h/2) / TILE);
  let nearCraft = false, nearSmelt = false;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const b = getBlock(px + dx, py + dy);
      if (b === 12) nearCraft = true;
      if (b === 13) nearSmelt = true;
    }
  }
  
  for (const r of RECIPES) {
    const needsStation = r.station || r.need.length > 1;
    if (r.station === 'smelt' && !nearSmelt) continue;
    if (needsStation && !nearCraft) continue;
    if (hasItems(r.need)) {
      const div = document.createElement('div');
      div.className = 'recipe';
      div.textContent = `${ITEMS[r.out]?.name || BLOCKS[r.out]?.name} x${r.count}`;
      div.onclick = () => {
        consumeItems(r.need);
        addItem(r.out, r.count);
        showMsg(`Crafted ${ITEMS[r.out]?.name || BLOCKS[r.out]?.name}`);
        updateInventoryPanel();
      };
      recipesEl.appendChild(div);
    }
  }
  if (recipesEl.children.length === 0) {
    recipesEl.innerHTML = '<div style="color:#666">Nothing to craft</div>';
  }
}

// Close button
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('inv-close');
  if (closeBtn) closeBtn.onclick = toggleInventory;
});

function mineBlock(tx, ty) {
  const b = getBlock(tx, ty);
  if (b === 0) return;
  const block = BLOCKS[b];
  
  const tool = player.hotbar[player.selected];
  let power = 1;
  if (tool && ITEMS[tool.id]?.tool === 'pick') power = ITEMS[tool.id].power;
  
  if (!player.mining || player.mining.x !== tx || player.mining.y !== ty) {
    player.mining = { x: tx, y: ty, progress: 0, max: block.hp * 10 / power };
  }
  player.mining.progress += 1;
  
  spawnParticle(tx * TILE + TILE/2, ty * TILE + TILE/2, block.color);
  
  if (player.mining.progress >= player.mining.max) {
    const dropId = block.drop || b;
    if (dropId !== 0) spawnDrop(tx * TILE + 4, ty * TILE, dropId, 1);
    setBlock(tx, ty, 0);
    player.mining = null;
  }
}

function placeBlock(tx, ty) {
  const slot = player.hotbar[player.selected];
  if (!slot || (!BLOCKS[slot.id]?.solid && slot.id !== 10 && slot.id !== 14 && slot.id !== 17)) return;
  if (getBlock(tx, ty) !== 0) return;
  
  const px = Math.floor((player.x + player.w/2) / TILE);
  const py = Math.floor((player.y + player.h/2) / TILE);
  if (tx === px && ty === py) return;
  
  setBlock(tx, ty, slot.id);
  slot.count--;
  if (slot.count <= 0) player.hotbar[player.selected] = null;
  updateHotbar();
  if (inventoryOpen) updateInventoryPanel();
}

function getMouseTile() {
  const mx = mouseX + camX;
  const my = mouseY + camY;
  return { x: Math.floor(mx / TILE), y: Math.floor(my / TILE) };
}
