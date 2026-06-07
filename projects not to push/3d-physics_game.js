const canvas = document.getElementById("c");
const cheerSound = new Audio("assets/cheer.wav");
cheerSound.volume = 0.6;
cheerSound.preload = "auto";
const gl = canvas.getContext("webgl", { antialias: true });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ── Shaders ──
const vsSource = `
      attribute vec3 a_pos;
      attribute vec3 a_color;
      uniform mat4 u_mvp;
      varying vec3 v_color;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        v_color = a_color;
      }`;

const fsSource = `
      precision mediump float;
      varying vec3 v_color;
      void main() {
        gl_FragColor = vec4(v_color, 1.0);
      }`;

function compileShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const program = gl.createProgram();
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);
gl.useProgram(program);

const aPos = gl.getAttribLocation(program, "a_pos");
const aColor = gl.getAttribLocation(program, "a_color");
const uMVP = gl.getUniformLocation(program, "u_mvp");

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

// ── Matrix helpers ──
function mat4Identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
function mat4Multiply(a, b) {
  const m = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      m[i + j * 4] =
        a[i] * b[j * 4] +
        a[i + 4] * b[j * 4 + 1] +
        a[i + 8] * b[j * 4 + 2] +
        a[i + 12] * b[j * 4 + 3];
  return m;
}
function mat4Perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2),
    m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}
function mat4LookAt(eye, target, up) {
  const z = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]];
  const lenZ = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
  z[0] /= lenZ;
  z[1] /= lenZ;
  z[2] /= lenZ;
  const x = [
    up[1] * z[2] - up[2] * z[1],
    up[2] * z[0] - up[0] * z[2],
    up[0] * z[1] - up[1] * z[0],
  ];
  const lenX = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
  x[0] /= lenX;
  x[1] /= lenX;
  x[2] /= lenX;
  const y = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];
  const m = new Float32Array(16);
  m[0] = x[0];
  m[4] = x[1];
  m[8] = x[2];
  m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  m[1] = y[0];
  m[5] = y[1];
  m[9] = y[2];
  m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  m[2] = z[0];
  m[6] = z[1];
  m[10] = z[2];
  m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  m[3] = 0;
  m[7] = 0;
  m[11] = 0;
  m[15] = 1;
  return m;
}
function mat4Translate(x, y, z) {
  const m = mat4Identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
function mat4RotateY(a) {
  const m = mat4Identity();
  m[0] = Math.cos(a);
  m[8] = Math.sin(a);
  m[2] = -Math.sin(a);
  m[10] = Math.cos(a);
  return m;
}

// ── Mesh builder ──
function createBox(w, h, d, r, g, b) {
  const hw = w / 2,
    hh = h / 2,
    hd = d / 2;
  const verts = [];
  function face(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
    const c = [r, g, b];
    verts.push(
      x1,
      y1,
      z1,
      ...c,
      x2,
      y2,
      z2,
      ...c,
      x3,
      y3,
      z3,
      ...c,
      x1,
      y1,
      z1,
      ...c,
      x3,
      y3,
      z3,
      ...c,
      x4,
      y4,
      z4,
      ...c,
    );
  }
  // Front, back, top, bottom, right, left
  face(-hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd);
  face(hw, -hh, -hd, -hw, -hh, -hd, -hw, hh, -hd, hw, hh, -hd);
  face(-hw, hh, hd, hw, hh, hd, hw, hh, -hd, -hw, hh, -hd);
  face(-hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd, -hw, -hh, hd);
  face(hw, -hh, hd, hw, -hh, -hd, hw, hh, -hd, hw, hh, hd);
  face(-hw, -hh, -hd, -hw, -hh, hd, -hw, hh, hd, -hw, hh, -hd);
  return new Float32Array(verts);
}

function createSphere(radius, r, g, b, latBands = 10, lonBands = 12) {
  const verts = [];
  for (let lat = 0; lat < latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const theta2 = ((lat + 1) * Math.PI) / latBands;
    for (let lon = 0; lon < lonBands; lon++) {
      const phi = (lon * 2 * Math.PI) / lonBands;
      const phi2 = ((lon + 1) * 2 * Math.PI) / lonBands;
      const p1 = [
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.cos(theta) * radius,
        Math.sin(theta) * Math.sin(phi) * radius,
      ];
      const p2 = [
        Math.sin(theta) * Math.cos(phi2) * radius,
        Math.cos(theta) * radius,
        Math.sin(theta) * Math.sin(phi2) * radius,
      ];
      const p3 = [
        Math.sin(theta2) * Math.cos(phi2) * radius,
        Math.cos(theta2) * radius,
        Math.sin(theta2) * Math.sin(phi2) * radius,
      ];
      const p4 = [
        Math.sin(theta2) * Math.cos(phi) * radius,
        Math.cos(theta2) * radius,
        Math.sin(theta2) * Math.sin(phi) * radius,
      ];
      const c = [r, g, b];
      verts.push(
        ...p1,
        ...c,
        ...p2,
        ...c,
        ...p3,
        ...c,
        ...p1,
        ...c,
        ...p3,
        ...c,
        ...p4,
        ...c,
      );
    }
  }
  return new Float32Array(verts);
}

function createBuffer(data) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

function drawMesh(buf, count, modelMat) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 24, 12);
  gl.enableVertexAttribArray(aColor);
  gl.uniformMatrix4fv(uMVP, false, modelMat);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

// ── World ──
const floorSize = 300;
const floorGrey = [0.3, 0.3, 0.32];
const roomSize = 10;
const roomHeight = 4;
const wallThickness = 0.2;
const doorWidth = 2;
const roomGap = roomSize + 1;
const doorHalf = doorWidth / 2;
const wallHalf = (roomSize - doorWidth) / 2;

function clampThirdPersonPosition(px, pz, yaw, pitch, maxDist) {
  const desiredX = px - Math.sin(yaw) * Math.cos(pitch) * maxDist;
  const desiredZ = pz - Math.cos(yaw) * Math.cos(pitch) * maxDist;
  const roomX = Math.round(px / roomGap) * roomGap;
  const roomZ = Math.round(pz / roomGap) * roomGap;
  const minX = roomX - roomSize / 2 + wallThickness;
  const maxX = roomX + roomSize / 2 - wallThickness;
  const minZ = roomZ - roomSize / 2 + wallThickness;
  const maxZ = roomZ + roomSize / 2 - wallThickness;
  const doorMin = -doorHalf;
  const doorMax = doorHalf;

  let camX = desiredX;
  let camZ = desiredZ;

  const withinXDoor =
    camX >= minX && camX <= maxX && Math.abs(camX - roomX) <= doorHalf;
  const withinZDoor =
    camZ >= minZ && camZ <= maxZ && Math.abs(camZ - roomZ) <= doorHalf;

  if (camZ < minZ && Math.abs(camX - roomX) > doorHalf) camZ = minZ;
  if (camZ > maxZ && Math.abs(camX - roomX) > doorHalf) camZ = maxZ;
  if (camX < minX && Math.abs(camZ - roomZ) > doorHalf) camX = minX;
  if (camX > maxX && Math.abs(camZ - roomZ) > doorHalf) camX = maxX;

  const dx = camX - px;
  const dz = camZ - pz;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const clampedDist = Math.max(1.6, Math.min(maxDist, dist));
  const clampedX = px + (dx / Math.max(dist, 1e-6)) * clampedDist;
  const clampedZ = pz + (dz / Math.max(dist, 1e-6)) * clampedDist;

  return {
    x: clampedX,
    z: clampedZ,
    dist: clampedDist,
  };
}

function isValidPlayerPosition(px, pz) {
  return true;
}

function platformBlocks(px, py, pz) {
  for (const p of platforms) {
    const topY = p.y + p.h / 2;
    const botY = p.y - p.h / 2;
    // Player head above platform top → standing on it, don't block horizontal
    if (py + 1.8 >= topY - 0.05) continue;
    // Player feet below platform bottom → already underneath, allow horizontal
    if (py <= botY) continue;
    // Otherwise player straddles vertically; only block xz overlap if feet below top
    if (
      px > p.x - p.w / 2 - 0.3 &&
      px < p.x + p.w / 2 + 0.3 &&
      pz > p.z - p.d / 2 - 0.3 &&
      pz < p.z + p.d / 2 + 0.3
    )
      return true;
  }
  return false;
}

function pieceBlocks(px, py, pz) {
  return false;
}

// Floor
const floorData = createBox(floorSize, 0.2, floorSize, ...floorGrey);
const floorBuf = createBuffer(floorData);

// Room walls
const wallNSData = createBox(
  roomSize,
  roomHeight,
  wallThickness,
  0.35,
  0.35,
  0.38,
);
const wallEWData = createBox(
  wallThickness,
  roomHeight,
  roomSize,
  0.35,
  0.35,
  0.38,
);
const wallNSDoorData = createBox(
  wallHalf,
  roomHeight,
  wallThickness,
  0.35,
  0.35,
  0.38,
);
const wallEWDoorData = createBox(
  wallThickness,
  roomHeight,
  wallHalf,
  0.35,
  0.35,
  0.38,
);
const wallNSDataBuf = createBuffer(wallNSData);
const wallEWDataBuf = createBuffer(wallEWData);
const wallNSDoorDataBuf = createBuffer(wallNSDoorData);
const wallEWDoorDataBuf = createBuffer(wallEWDoorData);

const rooms = [];

// ── Parkour platforms (floating, in-air blocks you can land on) — outside the maze ──
const platforms = [
  { x: 14, y: 0.6, z: -18, w: 4, h: 0.5, d: 4 },
  { x: 20, y: 1.5, z: -18, w: 3, h: 0.5, d: 3 },
  { x: 24, y: 2.5, z: -22, w: 3, h: 0.5, d: 3 },
  { x: 28, y: 3.5, z: -18, w: 3, h: 0.5, d: 3 },
  { x: 32, y: 4.5, z: -22, w: 3, h: 0.5, d: 3 },
  { x: 36, y: 5.5, z: -18, w: 3, h: 0.5, d: 3 },
];
const platformBuf = createBuffer(createBox(1, 1, 1, 0.2, 0.5, 0.85)); // shared unit, scale per platform

// ── Breakable red blocks — outside the maze ──
const breakables = [
  { x: 22, y: 1.75, z: -18, alive: true },
  { x: 26, y: 2.75, z: -22, alive: true },
  { x: 30, y: 3.75, z: -18, alive: true },
];
const breakableBuf = createBuffer(createBox(1, 1, 1, 0.85, 0.2, 0.2));

// ── Physics pieces (spawned when red blocks break) ──
const pieces = [];
const pieceBuf = createBuffer(createBox(0.4, 0.4, 0.4, 0.85, 0.2, 0.2));
function makePieceBuf(r, g, b) {
  return createBuffer(createBox(0.4, 0.4, 0.4, r, g, b));
}
const pieceBufs = [
  makePieceBuf(0.27, 0.47, 0.67),
  makePieceBuf(0.93, 0.78, 0.53),
  makePieceBuf(0.27, 0.47, 0.67),
  makePieceBuf(0.27, 0.47, 0.67),
  makePieceBuf(0.27, 0.47, 0.67),
  makePieceBuf(0.27, 0.47, 0.67),
];

// Soccer court
const courtCenterX = 30,
  courtCenterZ = 18;
const courtW = 12,
  courtL = 24; // half-extents
const courtY = 0.05; // thin grass above floor
const grassBuf = createBuffer(
  createBox(courtW * 2, 0.1, courtL * 2, 0.2, 0.7, 0.25),
);
// Goals: open boxes, made of 3 thin posts each
const goalW = 4,
  goalH = 2,
  goalT = 0.2;
const goalPostBuf = createBuffer(
  createBox(goalT, goalH, goalT, 0.95, 0.95, 0.95),
);
const goalBarBuf = createBuffer(
  createBox(goalW, goalT, goalT, 0.95, 0.95, 0.95),
);
const goalBackBuf = createBuffer(
  createBox(goalT, goalH, 1.5, 0.95, 0.95, 0.95),
);

// Soccer ball
const ballRadius = 0.4;
const ballRestY = 0.15 + ballRadius; // above grass top (0.15)
const ball = {
  x: courtCenterX,
  y: ballRestY,
  z: courtCenterZ, // middle of court, just above grass
  vx: 0,
  vy: 0,
  vz: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  spinX: 0,
  spinZ: 0,
};
// Soccer-ball look: white panels with black pentagons via per-band color variation
const ballBuf = createBuffer(
  createSphere(ballRadius, 0.95, 0.95, 0.95, 10, 12),
);
// Black accent band (5th lat band) overlaid
const ballBlackBuf = createBuffer(
  createSphere(ballRadius * 0.98, 0.12, 0.12, 0.12, 4, 10),
);

// Sun
const sunBuf = createBuffer(createSphere(3, 1.0, 0.95, 0.3, 8, 12));
let sunPos = { x: 60, y: 50, z: -40 };
let dayTime = 0; // 0..1
const dayPeriod = 60; // seconds for full cycle
// Crowd uses same body/head/limb shape but with varied shirt colors
const crowdColors = [
  [0.85, 0.25, 0.25],
  [0.25, 0.55, 0.85],
  [0.3, 0.7, 0.3],
  [0.85, 0.7, 0.2],
  [0.7, 0.3, 0.7],
  [0.95, 0.5, 0.2],
  [0.2, 0.7, 0.7],
  [0.6, 0.4, 0.2],
];
// Crowd: rows of stick figures around court
const crowd = [];
for (let side = 0; side < 4; side++) {
  for (let i = 0; i < 14; i++) {
    let cx, cz, sx, sz;
    const t = i / 14;
    if (side === 0) {
      sx = courtCenterX - courtW - 3;
      sz = courtCenterZ - courtL + t * courtL * 2;
      cx = sx - 8;
      cz = sz;
    } else if (side === 1) {
      sx = courtCenterX + courtW + 3;
      sz = courtCenterZ - courtL + t * courtL * 2;
      cx = sx + 8;
      cz = sz;
    } else if (side === 2) {
      sx = courtCenterX - courtW + t * courtW * 2;
      sz = courtCenterZ - courtL - 3;
      cx = sx;
      cz = sz - 8;
    } else {
      sx = courtCenterX - courtW + t * courtW * 2;
      sz = courtCenterZ + courtL + 3;
      cx = sx;
      cz = sz + 8;
    }
    crowd.push({
      x: cx,
      z: cz,
      sx,
      sz,
      side,
      phase: Math.random() * Math.PI * 2,
      color: i % crowdColors.length,
      walkPhase: Math.random() * Math.PI * 2,
    });
  }
}
function makeCrowdMeshes(r, g, b) {
  return {
    body: createBuffer(createBox(0.5, 1.0, 0.35, r, g, b)),
    head: createBuffer(createBox(0.4, 0.4, 0.4, 0.93, 0.78, 0.53)),
    limb: createBuffer(createBox(0.18, 0.7, 0.18, r, g, b)),
    eye: createBuffer(createBox(0.07, 0.07, 0.05, 0.13, 0.13, 0.13)),
  };
}
const crowdMeshes = crowdColors.map((c) => makeCrowdMeshes(c[0], c[1], c[2]));
// Shadow material (dim gray, visible on grass/floor)
const shadowBuf = createBuffer(createBox(1, 0.02, 1, 0.1, 0.1, 0.1));
const shadowColor = [0, 0, 0];

function breakRedBlock(block) {
  block.alive = false;
  for (let i = 0; i < 8; i++) {
    pieces.push({
      x: block.x + (Math.random() - 0.5) * 0.5,
      y: block.y + (Math.random() - 0.5) * 0.5,
      z: block.z + (Math.random() - 0.5) * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      vrx: (Math.random() - 0.5) * 4,
      vry: (Math.random() - 0.5) * 4,
      vrz: (Math.random() - 0.5) * 4,
      life: 3,
    });
  }
}

function killPlayer() {
  if (player.dead) return;
  player.dead = true;
  const colors = [
    [0.27, 0.47, 0.67], // body
    [0.93, 0.78, 0.53], // head
    [0.27, 0.47, 0.67],
    [0.27, 0.47, 0.67],
    [0.27, 0.47, 0.67],
    [0.27, 0.47, 0.67],
  ];
  const offsets = [
    [0, 0.85, 0],
    [0, 1.6, 0],
    [-0.35, 1.05, 0],
    [0.35, 1.05, 0],
    [-0.15, 0.35, 0],
    [0.15, 0.35, 0],
  ];
  for (let i = 0; i < 6; i++) {
    pieces.push({
      x: player.x + offsets[i][0],
      y: player.y + offsets[i][1],
      z: player.z + offsets[i][2],
      vx: (Math.random() - 0.5) * 6,
      vy: 3 + Math.random() * 4,
      vz: (Math.random() - 0.5) * 6,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      vrx: (Math.random() - 0.5) * 6,
      vry: (Math.random() - 0.5) * 6,
      vrz: (Math.random() - 0.5) * 6,
      life: 999999,
      persist: true,
      buf: i,
    });
  }
  // Respawn after a moment
  setTimeout(() => {
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.vy = 0;
    player.dead = false;
  }, 2000);
}

// ── Character parts ──
const bodyData = createBox(0.6, 1.0, 0.4, 0.27, 0.47, 0.67); // blue body
const bodyBuf = createBuffer(bodyData);
const headData = createBox(0.5, 0.5, 0.5, 0.93, 0.78, 0.53); // skin head
const headBuf = createBuffer(headData);
const limbData = createBox(0.2, 0.7, 0.2, 0.27, 0.47, 0.67); // blue limbs
const limbBuf = createBuffer(limbData);
const eyeData = createBox(0.08, 0.08, 0.05, 0.13, 0.13, 0.13); // dark eyes
const eyeBuf = createBuffer(eyeData);

// ── Player state ──
const player = { x: 0, y: 0, z: 0, angle: 0, speed: 6, vy: 0, grounded: true };
const keys = {};
let camDist = 6;
let camPitch = 0.5;
let camYaw = 0;
let firstPerson = false;
let isMoving = false;
let walkPhase = 0;

// ── Input ──
let mouseOnCanvas = false;
let lastMouseX = null;
let lastMouseY = null;
canvas.addEventListener("mouseenter", () => (mouseOnCanvas = true));
canvas.addEventListener("mouseleave", () => {
  mouseOnCanvas = false;
  lastMouseX = lastMouseY = null;
});
canvas.addEventListener("mousedown", () => {
  if (document.hasFocus()) {
    try { canvas.requestPointerLock(); } catch (e) { /* ignore */ }
  }
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas) {
    mouseOnCanvas = false;
    lastMouseX = lastMouseY = null;
    camYaw = player.angle;
  }
});

// ── Goal counter HUD ──
const goalHud = document.createElement("div");
goalHud.id = "goal-hud";
goalHud.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);color:#fff;font-family:monospace;font-size:22px;font-weight:bold;text-shadow:0 0 6px #000,0 2px 4px rgba(0,0,0,0.8);background:rgba(0,0,0,0.45);padding:8px 18px;border-radius:10px;letter-spacing:1px;pointer-events:none;z-index:5;border:1px solid rgba(255,255,255,0.15);";
goalHud.textContent = "Goals: 0";
document.body.appendChild(goalHud);
function updateGoalHud() {
  goalHud.textContent = "Goals: " + (player.totalGoals || 0);
}
// Update the HUD every frame
const _origLoop = requestAnimationFrame;
const goalHudInterval = setInterval(updateGoalHud, 100);
window.addEventListener("beforeunload", () => clearInterval(goalHudInterval));

// ── Inventory HUD (9 slots, hotkeys 1-9) ──
const playerInventory = {
  slots: ["ball", "block", "spring", null, null, null, null, null, null], // 9 slots
  selected: 0, // 0-8
};
const invHud = document.createElement("div");
invHud.id = "inventory-hud";
invHud.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:6px;padding:8px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);border-radius:10px;pointer-events:none;z-index:5;";
const invSlots = [];
const slotIcons = {
  ball: '<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff 0%,#ddd 25%,#888 80%);box-shadow:inset -2px -2px 4px rgba(0,0,0,0.4);"></div>',
  block: '<div style="width:22px;height:22px;background:linear-gradient(135deg,#7af,#35c);border-radius:3px;box-shadow:inset -2px -2px 3px rgba(0,0,0,0.3);"></div>',
  spring: '<div style="font-size:20px;line-height:1;">👊</div>',
  _default: '<div style="font-size:18px;opacity:0.4;">·</div>',
};
for (let i = 0; i < 9; i++) {
  const slot = document.createElement("div");
  slot.style.cssText = "width:48px;height:48px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.2);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font-family:monospace;font-size:11px;transition:all 0.12s;";
  slot.innerHTML = '<div style="height:24px;display:flex;align-items:center;justify-content:center;">' + (slotIcons[playerInventory.slots[i]] || slotIcons._default) + '</div><div style="font-size:9px;opacity:0.5;margin-top:2px;">' + (i + 1) + '</div>';
  invHud.appendChild(slot);
  invSlots.push(slot);
}
document.body.appendChild(invHud);
function renderInventory() {
  for (let i = 0; i < 9; i++) {
    const slot = invSlots[i];
    const item = playerInventory.slots[i];
    if (i === playerInventory.selected) {
      slot.style.border = "2px solid #ff0";
      slot.style.background = "rgba(255,255,0,0.18)";
      slot.style.transform = "translateY(-4px)";
      slot.style.boxShadow = "0 4px 12px rgba(255,255,0,0.4)";
    } else {
      slot.style.border = "2px solid rgba(255,255,255,0.2)";
      slot.style.background = "rgba(255,255,255,0.07)";
      slot.style.transform = "translateY(0)";
      slot.style.boxShadow = "none";
    }
  }
}
renderInventory();
const invHudInterval = setInterval(renderInventory, 100);
window.addEventListener("beforeunload", () => clearInterval(invHudInterval));

// 1-9 hotkeys to select an inventory slot
window.addEventListener("keydown", (e) => {
  // Don't steal hotkeys from the existing in-game key map; only handle digits.
  if (e.repeat) return;
  // Ignore if the user is typing into a form (none here, but future-proof)
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  const k = e.key;
  if (k >= "1" && k <= "9") {
    playerInventory.selected = parseInt(k, 10) - 1;
    renderInventory();
  }
});

// ── Inventory items (slot 1: ball, slot 2: block, slot 3: spring punch) ──
const spawnedBalls = []; // extra soccer balls the player can drop anywhere
const spawnedBlocks = []; // random colored blocks the player can drop
// Reuse the main ball's white/black sphere buffers so spawned balls look
// exactly like the field ball.
const spawnedBallWhiteBuf = createBuffer(
  createSphere(ballRadius, 0.95, 0.95, 0.95, 10, 12),
);
const spawnedBallBlackBuf = createBuffer(
  createSphere(ballRadius * 0.98, 0.12, 0.12, 0.12, 4, 10),
);
// "Player block" geometry: a body cube + a head cube + two arm cubes + two leg cubes.
function makePlayerBlockBufs(r, g, b) {
  return {
    body: createBuffer(createBox(0.6, 0.8, 0.4, r, g, b)),
    head: createBuffer(createBox(0.4, 0.4, 0.4, 0.93, 0.78, 0.53)),
    limb: createBuffer(createBox(0.18, 0.5, 0.18, r, g, b)),
    eye: createBuffer(createBox(0.07, 0.07, 0.05, 0.13, 0.13, 0.13)),
  };
}
const blockColors = [
  [0.9, 0.2, 0.2], [0.2, 0.7, 0.2], [0.2, 0.4, 0.9],
  [0.9, 0.7, 0.2], [0.7, 0.2, 0.9], [0.2, 0.9, 0.9],
  [0.95, 0.5, 0.7], [0.5, 0.95, 0.5], [0.9, 0.9, 0.3],
];

function useInventorySlot(idx) {
  const fx = Math.sin(player.angle);
  const fz = Math.cos(player.angle);
  const spawnX = player.x + fx * 1.5;
  const spawnZ = player.z + fz * 1.5;
  if (idx === 0) {
    // Slot 1: soccer ball anywhere
    spawnedBalls.push({
      x: spawnX, z: spawnZ, y: ballRadius,
      vx: fx * 6, vy: 2, vz: fz * 6,
      rx: 0, rz: 0, spinX: 0, spinZ: 0,
    });
  } else if (idx === 1) {
    // Slot 2: colored spinning cube (like pieces that fall from red blocks)
    const c = blockColors[Math.floor(Math.random() * blockColors.length)];
    const buf = makePieceBuf(c[0], c[1], c[2]);
    // Find spawn y: if any block is under the spawn point, spawn on top of it
    let spawnY = 0;
    const blockHalf = 0.2;
    for (const other of spawnedBlocks) {
      const dx = other.x - spawnX, dz = other.z - spawnZ;
      if (dx * dx + dz * dz < 0.05) {
        const topY = other.y + blockHalf + blockHalf; // top of other + half this block
        if (topY > spawnY) spawnY = topY;
      }
    }
    spawnedBlocks.push({
      x: spawnX, z: spawnZ, y: spawnY,
      vx: fx * 2, vy: 0, vz: fz * 2,
      rx: Math.random() * Math.PI, ry: Math.random() * Math.PI, rz: Math.random() * Math.PI,
      vrx: (Math.random() - 0.5) * 4, vry: (Math.random() - 0.5) * 4, vrz: (Math.random() - 0.5) * 4,
      buf, color: c, settled: false,
    });
  } else if (idx === 2) {
    // Slot 3: spring punch — radial impulse on all dynamic objects in radius
    const radius = 8.0;
    const power = 25.0;
    // The main ball
    const dx = ball.x - player.x, dz = ball.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < radius && d > 0.01) {
      ball.vx += (dx / d) * power;
      ball.vy = 6;
      ball.vz += (dz / d) * power;
    }
    // Spawned balls
    for (const b of spawnedBalls) {
      const ddx = b.x - player.x, ddz = b.z - player.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd < radius && dd > 0.01) {
        b.vx += (ddx / dd) * power;
        b.vy = 6;
        b.vz += (ddz / dd) * power;
      }
    }
    // Spawned blocks
    for (const b of spawnedBlocks) {
      const ddx = b.x - player.x, ddz = b.z - player.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd < radius && dd > 0.01) {
        b.vx += (ddx / dd) * power;
        b.vy = 4;
        b.vz += (ddz / dd) * power;
      }
    }
    // Crowd members
    for (const c of crowd) {
      const ddx = c.x - player.x, ddz = c.z - player.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd < radius && dd > 0.01) {
        c.x += (ddx / dd) * 1.5;
        c.z += (ddz / dd) * 1.5;
      }
    }
    // Physics pieces
    for (const p of pieces) {
      const ddx = p.x - player.x, ddz = p.z - player.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd < radius && dd > 0.01) {
        p.vx += (ddx / dd) * power;
        p.vy = 6;
        p.vz += (ddz / dd) * power;
      }
    }
  }
}
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas) {
    camYaw -= e.movementX * 0.003;
    camPitch = Math.max(-1.2, Math.min(1.2, camPitch - e.movementY * 0.003));
  } else if (mouseOnCanvas) {
    if (lastMouseX !== null && lastMouseY !== null) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      camYaw -= dx * 0.003;
      camPitch = Math.max(-1.2, Math.min(1.2, camPitch - dy * 0.003));
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
  player.angle = camYaw;
});
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "f" && !e.repeat) firstPerson = !firstPerson;
  if (key === " " && player.grounded && !e.repeat) {
    player.vy = 8;
    player.grounded = false;
  }
  if (key === "k" && !e.repeat) doKick();
  if (key === "r" && !e.repeat) {
    const fx = Math.sin(player.angle);
    const fz = Math.cos(player.angle);
    ball.x = player.x + fx * 1.5;
    ball.z = player.z + fz * 1.5;
    ball.y = ballRadius;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.spinX = 0;
    ball.spinZ = 0;
  }
  if (key === "t" && !e.repeat) {
    useInventorySlot(playerInventory.selected);
  }
  keys[key] = true;
});

function doKick() {
  for (const p of pieces) {
    const dx = p.x - player.x,
      dz = p.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 3.5 || dist < 1e-4) continue;
    // Kick direction = from player toward piece (diagonal if piece is to the side)
    const kx = dx / dist,
      kz = dz / dist;
    p.settled = false;
    p.bounceTime = 0;
    const power = 10 + Math.random() * 4;
    p.vx = kx * power + (Math.random() - 0.5) * 6;
    p.vy = 10 + Math.random() * 6;
    p.vz = kz * power + (Math.random() - 0.5) * 6;
    p.vrx = (Math.random() - 0.5) * 15;
    p.vry = (Math.random() - 0.5) * 15;
    p.vrz = (Math.random() - 0.5) * 15;
  }
  // Kick ball
  const bdx = ball.x - player.x,
    bdz = ball.z - player.z;
  const bdist = Math.sqrt(bdx * bdx + bdz * bdz);
  if (bdist < 3.5 && bdist > 1e-4 && Math.abs(ball.y - ballRadius) < 1.2) {
    const kx = bdx / bdist,
      kz = bdz / bdist;
    const power = 12 + Math.random() * 4;
    ball.vx = kx * power;
    ball.vz = kz * power;
    ball.vy = 4 + Math.random() * 2;
    ball.spinX = (kz * power) / ballRadius;
    ball.spinZ = (-kx * power) / ballRadius;
  }
  // Kick spawned balls
  for (const sb of spawnedBalls) {
    const dx = sb.x - player.x,
      dz = sb.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 3.5 || dist < 1e-4) continue;
    if (Math.abs(sb.y - ballRadius) > 1.2) continue;
    const kx = dx / dist,
      kz = dz / dist;
    const power = 12 + Math.random() * 4;
    sb.vx = kx * power;
    sb.vz = kz * power;
    sb.vy = 4 + Math.random() * 2;
    sb.spinX = (kz * power) / ballRadius;
    sb.spinZ = (-kx * power) / ballRadius;
  }
  // Kick spawned blocks
  for (const sblk of spawnedBlocks) {
    const dx = sblk.x - player.x,
      dz = sblk.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 3.5 || dist < 1e-4) continue;
    if (Math.abs(sblk.y - 0.2) > 1.2) continue;
    const kx = dx / dist,
      kz = dz / dist;
    const power = 10 + Math.random() * 4;
    sblk.vx = kx * power + (Math.random() - 0.5) * 6;
    sblk.vy = 10 + Math.random() * 6;
    sblk.vz = kz * power + (Math.random() - 0.5) * 6;
    sblk.vrx = (Math.random() - 0.5) * 15;
    sblk.vry = (Math.random() - 0.5) * 15;
    sblk.vrz = (Math.random() - 0.5) * 15;
  }
  // Kick animation
  player.kickTime = 0.3;
}
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ── Generic dynamic object collision ──
const dynamicObjects = [];
// kind: 'sphere' (uses r) or 'obb' (uses halfX/halfZ + angle)
function regObj(x, z, r, pushable = true) {
  dynamicObjects.push({ kind: "sphere", x, z, r, pushable });
}
function regObb(x, z, halfX, halfZ, angle, pushable = true) {
  dynamicObjects.push({ kind: "obb", x, z, halfX, halfZ, angle, pushable });
}
// Closest point on OBB (at origin, axis-aligned) to point (px, pz)
function obbClosest(halfX, halfZ, px, pz) {
  return [Math.max(-halfX, Math.min(halfX, px)), Math.max(-halfZ, Math.min(halfZ, pz))];
}
function resolveDynamicCollisions() {
  for (let i = 0; i < dynamicObjects.length; i++) {
    for (let j = i + 1; j < dynamicObjects.length; j++) {
      const a = dynamicObjects[i];
      const b = dynamicObjects[j];
      // Skip pairs that aren't pushable
      if (!a.pushable && !b.pushable) continue;
      let nx = 0, nz = 0, overlap = 0;
      const bothObb = a.kind === "obb" && b.kind === "obb";
      const aSphere = a.kind === "sphere";
      const bSphere = b.kind === "sphere";
      if (aSphere && bSphere) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const distSq = dx * dx + dz * dz;
        const sumR = a.r + b.r;
        if (distSq >= sumR * sumR) continue;
        const dist = Math.sqrt(distSq) || 0.0001;
        overlap = sumR - dist;
        nx = dx / dist;
        nz = dz / dist;
      } else if (bothObb) {
        // OBB vs OBB via SAT in 2D
        // Axes to test: each box's 2 edge normals
        const axes = [
          [Math.cos(b.angle), Math.sin(b.angle)],
          [-Math.sin(b.angle), Math.cos(b.angle)],
          [Math.cos(a.angle), Math.sin(a.angle)],
          [-Math.sin(a.angle), Math.cos(a.angle)],
        ];
        // Helper: project rotated box corners onto axis (ax,az), return [min,max]
        function proj(halfX, halfZ, ang, ax, az) {
          const c = Math.cos(ang), s = Math.sin(ang);
          let min = Infinity, max = -Infinity;
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const rx = sx * halfX * c - sz * halfZ * s;
            const rz = sx * halfX * s + sz * halfZ * c;
            const d = rx * ax + rz * az;
            if (d < min) min = d;
            if (d > max) max = d;
          }
          return [min, max];
        }
        let minOverlap = Infinity;
        let minNx = 0, minNz = 0;
        for (const [ax, az] of axes) {
          const [a1, a2] = proj(a.halfX, a.halfZ, a.angle, ax, az);
          const [b1, b2] = proj(b.halfX, b.halfZ, b.angle, ax, az);
          // Add box centers
          const aCenter = a.x * ax + a.z * az;
          const bCenter = b.x * ax + b.z * az;
          const aLo = a1 + aCenter, aHi = a2 + aCenter;
          const bLo = b1 + bCenter, bHi = b2 + bCenter;
          // Overlap on this axis
          const o = Math.min(aHi, bHi) - Math.max(aLo, bLo);
          if (o <= 0) { minOverlap = -1; break; }
          if (o < minOverlap) {
            minOverlap = o;
            const dir = aCenter - bCenter;
            if (dir >= 0) { minNx = ax; minNz = az; }
            else { minNx = -ax; minNz = -az; }
          }
        }
        if (minOverlap <= 0) continue;
        overlap = minOverlap;
        nx = minNx;
        nz = minNz;
      } else {
        // Sphere vs OBB (or OBB vs sphere, just swap)
        let sphere, obb;
        if (aSphere) { sphere = a; obb = b; }
        else { sphere = b; obb = a; }
        // Transform sphere center into OBB's local frame
        const dx = sphere.x - obb.x;
        const dz = sphere.z - obb.z;
        const c = Math.cos(-obb.angle), s = Math.sin(-obb.angle);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        const [clx, clz] = obbClosest(obb.halfX, obb.halfZ, lx, lz);
        // Distance in local space
        const ddx = lx - clx;
        const ddz = lz - clz;
        const distSq = ddx * ddx + ddz * ddz;
        const sumR = sphere.r;
        if (distSq >= sumR * sumR) continue;
        let dist = Math.sqrt(distSq);
        // If sphere center is INSIDE the OBB, push out to nearest face
        if (dist < 0.0001) {
          // Find closest face
          const dxp = obb.halfX - Math.abs(lx);
          const dzp = obb.halfZ - Math.abs(lz);
          if (dxp < dzp) {
            dist = 0.0001;
            const sx = lx >= 0 ? 1 : -1;
            overlap = sumR + dxp;
            // local normal (sx, 0) -> world
            const wc = Math.cos(obb.angle), ws = Math.sin(obb.angle);
            nx = sx * wc;
            nz = -sx * ws;
          } else {
            dist = 0.0001;
            const sz = lz >= 0 ? 1 : -1;
            overlap = sumR + dzp;
            const wc = Math.cos(obb.angle), ws = Math.sin(obb.angle);
            nx = sz * ws;
            nz = sz * wc;
          }
        } else {
          overlap = sumR - dist;
          // local normal -> world
          const lnx = ddx / dist;
          const lnz = ddz / dist;
          const wc = Math.cos(obb.angle), ws = Math.sin(obb.angle);
          nx = lnx * wc - lnz * ws;
          nz = lnx * ws + lnz * wc;
        }
        // Normal must point from OBB toward sphere
        const dxs = sphere.x - obb.x;
        const dzs = sphere.z - obb.z;
        if (nx * dxs + nz * dzs < 0) { nx = -nx; nz = -nz; }
      }
      let aShare = 0.5, bShare = 0.5;
      if (a.pushable && !b.pushable) { aShare = 1; bShare = 0; }
      else if (!a.pushable && b.pushable) { aShare = 0; bShare = 1; }
      // Slop: ignore tiny overlaps to kill the warp from continuous re-push
      if (overlap < 0.01) continue;
      // Mass: prefer explicit mass if set, else default 1
      const ma = a.mass ?? 1;
      const mb = b.mass ?? 1;
      const totalM = ma + mb;
      // Correct position proportional to inverse mass
      const aPush = (mb / totalM) * aShare;
      const bPush = (ma / totalM) * bShare;
      // Position correction
      a.x -= nx * overlap * aPush;
      a.z -= nz * overlap * aPush;
      b.x += nx * overlap * bPush;
      b.z += nz * overlap * bPush;
      // Impulse: exchange momentum along normal so blocks separate naturally
      // vRel = (vb - va) . n  (along collision normal n points a->b)
      const va = a.ref ? { x: a.ref.vx ?? 0, z: a.ref.vz ?? 0 } : { x: 0, z: 0 };
      const vb = b.ref ? { x: b.ref.vx ?? 0, z: b.ref.vz ?? 0 } : { x: 0, z: 0 };
      // n is from a to b, so vb.going toward a is negative along n
      const vRelN = (vb.x - va.x) * nx + (vb.z - va.z) * nz;
      if (vRelN < 0) {
        // approaching: apply elastic impulse with restitution
        const e = 0.3; // low restitution -> blocks don't bounce much
        const j = -(1 + e) * vRelN / (1 / ma + 1 / mb);
        const jx = j * nx;
        const jz = j * nz;
        if (a.ref) {
          a.ref.vx = (a.ref.vx ?? 0) - jx / ma;
          a.ref.vz = (a.ref.vz ?? 0) - jz / ma;
        }
        if (b.ref) {
          b.ref.vx = (b.ref.vx ?? 0) + jx / mb;
          b.ref.vz = (b.ref.vz ?? 0) + jz / mb;
        }
      }
    }
  }
}

// ── Game loop ──
let lastTime = 0;
function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  // Rotation from arrow keys
  const turnSpeed = 2.2;
  if (keys["arrowleft"]) camYaw += turnSpeed * dt;
  if (keys["arrowright"]) camYaw -= turnSpeed * dt;

  // Movement relative to camera direction
  let mx = 0,
    mz = 0;
  if (player.dead) {
    isMoving = false;
  } else {
    if (keys["w"] || keys["arrowup"]) {
      mx += Math.sin(camYaw);
      mz += Math.cos(camYaw);
    }
    if (keys["s"] || keys["arrowdown"]) {
      mx -= Math.sin(camYaw);
      mz -= Math.cos(camYaw);
    }
    if (keys["a"]) {
      mx += Math.sin(camYaw + Math.PI / 2);
      mz += Math.cos(camYaw + Math.PI / 2);
    }
    if (keys["d"]) {
      mx += Math.sin(camYaw - Math.PI / 2);
      mz += Math.cos(camYaw - Math.PI / 2);
    }
  }
  const len = Math.sqrt(mx * mx + mz * mz);
  isMoving = len > 0;
  if (isMoving) {
    mx /= len;
    mz /= len;
    walkPhase += dt * 3;
  }
  player.angle = camYaw;

  // Jump physics
  if (!player.sinking) {
    player.vy -= 20 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }
  }

  const newX = player.x + mx * player.speed * dt;
  const newZ = player.z + mz * player.speed * dt;
  if (
    isValidPlayerPosition(newX, player.z) &&
    !platformBlocks(newX, player.y, player.z)
  )
    player.x = newX;
  if (
    isValidPlayerPosition(player.x, newZ) &&
    !platformBlocks(player.x, player.y, newZ)
  )
    player.z = newZ;

  // Platform landing (from above — landed this frame by gravity OR walking up a step)
  for (const p of platforms) {
    const topY = p.y + p.h / 2;
    const onTopX =
      player.x > p.x - p.w / 2 - 0.3 && player.x < p.x + p.w / 2 + 0.3;
    const onTopZ =
      player.z > p.z - p.d / 2 - 0.3 && player.z < p.z + p.d / 2 + 0.3;
    if (!onTopX || !onTopZ) continue;
    // Falling onto it
    if (player.vy <= 0 && player.y >= topY - 0.05 && player.y <= topY + 0.6) {
      player.y = topY;
      player.vy = 0;
      player.grounded = true;
    }
    // Walking up a low step
    else if (player.grounded && player.y < topY && player.y >= topY - 0.6) {
      player.y = topY;
      player.vy = 0;
    }
  }
  // Endless baseplate, no walls

  // Camera
  let eyeY = player.y + 1.6;
  let eyeX, eyeZ, targetX, targetY, targetZ;

  if (firstPerson) {
    eyeX = player.x;
    eyeZ = player.z;
    targetX = player.x + Math.sin(camYaw);
    targetY = eyeY + Math.sin(camPitch);
    targetZ = player.z + Math.cos(camYaw);
  } else {
    const camAngle = camYaw;
    eyeX = player.x - Math.sin(camAngle) * Math.cos(camPitch) * camDist;
    eyeY = player.y + 1.5 + Math.sin(camPitch) * camDist;
    eyeZ = player.z - Math.cos(camAngle) * Math.cos(camPitch) * camDist;
    targetX = player.x;
    targetY = player.y + 1;
    targetZ = player.z;
  }

  // Day/night cycle
  dayTime = (dayTime + dt / dayPeriod) % 1;
  const sunAngle = dayTime * Math.PI * 2;
  const sunX = Math.cos(sunAngle) * 60;
  const sunY = Math.sin(sunAngle) * 40 + 10;
  const sunZ = -40;
  sunPos.x = sunX;
  sunPos.y = sunY;
  sunPos.z = sunZ;
  // Sky color blend: day=blue, night=dark, sunset=orange
  const dayness = Math.max(0, Math.sin(sunAngle)); // 0 night, 1 day
  const r = 0.05 + dayness * 0.4 + (1 - dayness) * 0.1;
  const g = 0.05 + dayness * 0.6 + (1 - dayness) * 0.1;
  const b = 0.15 + dayness * 0.85;
  gl.clearColor(r, g, b, 1);

  // Sun shadow projection + stretch factor (long shadows when sun is low)
  const shadowY = 0.11;
  // lengthFactor: subtle stretch so shadow stays connected to its object.
  const lengthFactor = sunY > 1 ? Math.max(1, 1 + (40 - sunY) / 60) : 0;
  function projectShadow(ox, oy, oz) {
    if (sunY < 2) return null;
    const dy = oy - sunY;
    const t = (shadowY - oy) / dy;
    if (t < 0) return null;
    const sx = ox + t * (ox - sunX);
    const sz = oz + t * (oz - sunZ);
    return { x: sx, y: shadowY, z: sz };
  }

  const proj = mat4Perspective(
    Math.PI / 4,
    canvas.width / canvas.height,
    0.1,
    200,
  );
  const view = mat4LookAt(
    [eyeX, eyeY, eyeZ],
    [targetX, targetY, targetZ],
    [0, 1, 0],
  );
  const vp = mat4Multiply(proj, view);

  // Render
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Crowd update: walk in toward seats as day rises, out at night
  for (const c of crowd) {
    if (c.farX === undefined) {
      c.farX = c.x;
      c.farZ = c.z;
    }
    if (player.ending || player.sinking) continue; // ending loop moves them
    const presence = Math.max(0, Math.min(1, (sunY + 10) / 20));
    const prevPresence = c.lastPresence === undefined ? presence : c.lastPresence;
    c.lastPresence = presence;
    c.leaving = presence < prevPresence;
    const prevX = c.x,
      prevZ = c.z;
    c.x = c.farX + (c.sx - c.farX) * presence;
    c.z = c.farZ + (c.sz - c.farZ) * presence;
    c.moving = Math.abs(c.x - prevX) + Math.abs(c.z - prevZ) > 1e-4;
    if (c.moving) c.walkPhase += dt * 6;
  }

  // Crowd render: same body/head/limb as player; walk when moving, arms-up cheer when at seat
  for (const c of crowd) {
    const presence = player.ending || player.sinking
      ? 1
      : Math.max(0, Math.min(1, (sunY + 10) / 20));
    if (presence < 0.05) continue;
    const atSeat = presence > 0.95;
    // Body faces court when arriving/seated; faces player when ending
    const facing =
      player.ending && !player.sinking
        ? Math.atan2(player.x - c.x, player.z - c.z)
        : c.leaving
        ? Math.atan2(c.sx - c.x, c.sz - c.z)
        : Math.atan2(courtCenterX - c.x, courtCenterZ - c.z);
    const m = mat4Multiply(vp, mat4Translate(c.x, 0, c.z));
  const rot = mat4Identity();
  rot[0] = Math.cos(facing);
  rot[2] = -Math.sin(facing);
  rot[8] = Math.sin(facing);
  rot[10] = Math.cos(facing);
  const baseM = mat4Multiply(m, rot);
  const meshes = crowdMeshes[c.color];
  // Walk swing
  const swing = c.moving ? Math.sin(c.walkPhase) * 0.35 : 0;
  const bob = c.moving ? Math.abs(Math.sin(c.walkPhase)) * 0.1 : 0;
  // Head turn: track player if c.headTrack; else face same as body
  const worldLook = c.headTrack
    ? Math.atan2(player.x - c.x, player.z - c.z)
    : facing;
  let headTurn = worldLook - facing;
  while (headTurn > Math.PI) headTurn -= 2 * Math.PI;
  while (headTurn < -Math.PI) headTurn += 2 * Math.PI;
  const headM = mat4Multiply(baseM, mat4Translate(0, 1.6 - bob, 0));
  const headRot = mat4Identity();
  headRot[0] = Math.cos(headTurn);
  headRot[2] = -Math.sin(headTurn);
  headRot[8] = Math.sin(headTurn);
  headRot[10] = Math.cos(headTurn);
  // Body
  drawMesh(
    meshes.body,
    36,
    mat4Multiply(baseM, mat4Translate(0, 0.85 - bob, 0)),
  );
  // Head (rotates to look at player)
  drawMesh(meshes.head, 36, mat4Multiply(mat4Multiply(headM, headRot), mat4Identity()));
  // Eyes
  drawMesh(
    meshes.eye,
    36,
    mat4Multiply(mat4Multiply(headM, headRot), mat4Translate(-0.1, 0.05, 0.2)),
  );
  drawMesh(
    meshes.eye,
    36,
    mat4Multiply(mat4Multiply(headM, headRot), mat4Translate(0.1, 0.05, 0.2)),
  );
  // Arms: cheer arms up when at seat (no walking), swing when walking
  if (atSeat) {
    // Arms up: rotate up
    const armWave = Math.sin(dayTime * Math.PI * 12 + c.phase) * 0.2;
    drawMesh(
      meshes.limb,
      36,
      mat4Multiply(baseM, mat4Translate(-0.3, 1.6 + armWave, 0)),
    );
    drawMesh(
      meshes.limb,
      36,
      mat4Multiply(baseM, mat4Translate(0.3, 1.6 - armWave, 0)),
    );
  } else {
    // Walking arms
    drawMesh(
      meshes.limb,
      36,
      mat4Multiply(baseM, mat4Translate(-0.3, 1.05 - bob, swing)),
    );
    drawMesh(
      meshes.limb,
      36,
      mat4Multiply(baseM, mat4Translate(0.3, 1.05 - bob, -swing)),
    );
  }
  // Legs swing only when moving
  const legSwing = c.moving ? Math.sin(c.walkPhase) * 0.35 : 0;
  drawMesh(
    meshes.limb,
    36,
    mat4Multiply(baseM, mat4Translate(-0.13, 0.35 - bob, -legSwing)),
  );
  drawMesh(
    meshes.limb,
    36,
    mat4Multiply(baseM, mat4Translate(0.13, 0.35 - bob, legSwing)),
  );
}

// Sun (no depth, always visible)
if (sunY > -5) {
  gl.disable(gl.DEPTH_TEST);
  drawMesh(
    sunBuf,
    8 * 12 * 6,
    mat4Multiply(vp, mat4Translate(sunPos.x, sunPos.y, sunPos.z)),
  );
  gl.enable(gl.DEPTH_TEST);
}

// Floor
drawMesh(floorBuf, 36, mat4Multiply(vp, mat4Translate(0, -0.1, 0)));

// Underground solid (visible when sinking)
if (player.y < 0) {
  // Big solid yellow block under the player
  const underBuf = createBuffer(createBox(20, 20, 20, 0.85, 0.75, 0.3));
  drawMesh(underBuf, 36, mat4Multiply(vp, mat4Translate(player.x, -10.5, player.z)));
}

// Soccer court grass
drawMesh(
  grassBuf,
  36,
  mat4Multiply(vp, mat4Translate(courtCenterX, courtY, courtCenterZ)),
);
// Goals: north end (z = courtCenterZ - courtL) and south end (z = courtCenterZ + courtL)
for (const dz of [-1, 1]) {
  const gz = courtCenterZ + dz * (courtL + 0.5);
  const postY = goalH / 2 + 0.1;
  // Two vertical posts
  drawMesh(
    goalPostBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX - goalW / 2, postY, gz)),
  );
  drawMesh(
    goalPostBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX + goalW / 2, postY, gz)),
  );
  // Crossbar
  drawMesh(
    goalBarBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX, goalH + 0.1, gz)),
  );
  // Back support posts
  const backZ = gz + dz * 0.8;
  drawMesh(
    goalPostBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX - goalW / 2, postY, backZ)),
  );
  drawMesh(
    goalPostBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX + goalW / 2, postY, backZ)),
  );
  // Back wall (net placeholder)
  drawMesh(
    goalBackBuf,
    36,
    mat4Multiply(vp, mat4Translate(courtCenterX, postY, backZ - dz * 0.75)),
  );
}

// Rooms
rooms.forEach((room) => {
  const y = roomHeight / 2;
  const northZ = room.z - roomSize / 2 + wallThickness / 2;
  const southZ = room.z + roomSize / 2 - wallThickness / 2;
  const westX = room.x - roomSize / 2 + wallThickness / 2;
  const eastX = room.x + roomSize / 2 - wallThickness / 2;

  if (room.north) {
    const leftX = room.x - doorHalf - wallHalf / 2;
    const rightX = room.x + doorHalf + wallHalf / 2;
    drawMesh(
      wallNSDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(leftX, y, northZ)),
    );
    drawMesh(
      wallNSDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(rightX, y, northZ)),
    );
  } else {
    drawMesh(
      wallNSDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(room.x, y, northZ)),
    );
  }

  if (room.south) {
    const leftX = room.x - doorHalf - wallHalf / 2;
    const rightX = room.x + doorHalf + wallHalf / 2;
    drawMesh(
      wallNSDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(leftX, y, southZ)),
    );
    drawMesh(
      wallNSDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(rightX, y, southZ)),
    );
  } else {
    drawMesh(
      wallNSDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(room.x, y, southZ)),
    );
  }

  if (room.west) {
    const topZ = room.z - doorHalf - wallHalf / 2;
    const botZ = room.z + doorHalf + wallHalf / 2;
    drawMesh(
      wallEWDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(westX, y, topZ)),
    );
    drawMesh(
      wallEWDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(westX, y, botZ)),
    );
  } else {
    drawMesh(
      wallEWDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(westX, y, room.z)),
    );
  }

  if (room.east) {
    const topZ = room.z - doorHalf - wallHalf / 2;
    const botZ = room.z + doorHalf + wallHalf / 2;
    drawMesh(
      wallEWDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(eastX, y, topZ)),
    );
    drawMesh(
      wallEWDoorDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(eastX, y, botZ)),
    );
  } else {
    drawMesh(
      wallEWDataBuf,
      36,
      mat4Multiply(vp, mat4Translate(eastX, y, room.z)),
    );
  }
});

// Platforms
platforms.forEach((p) => {
  const m = mat4Multiply(
    vp,
    mat4Multiply(mat4Translate(p.x, p.y, p.z), mat4Identity()),
  );
  const s = mat4Identity();
  s[0] = p.w;
  s[5] = p.h;
  s[10] = p.d;
  drawMesh(platformBuf, 36, mat4Multiply(m, s));
});

// Breakables (red)
breakables.forEach((b) => {
  if (!b.alive) return;
  drawMesh(breakableBuf, 36, mat4Multiply(vp, mat4Translate(b.x, b.y, b.z)));
});

// Pieces
for (let i = pieces.length - 1; i >= 0; i--) {
  const p = pieces[i];
  if (p.persist) p.bounceTime = (p.bounceTime || 0) + dt;
  if (!p.persist) p.life -= dt;

  // Settle: after 10s of bouncing, find closest flat point on floor or platform cube
  if (p.persist && p.bounceTime > 10 && !p.settled) {
    const half = 0.2; // piece half-size
    // Floor: y = half (top of piece resting on floor)
    let bestY = half;
    let bestX = p.x,
      bestZ = p.z;
    let bestDist = Math.abs(p.y - half) + Math.hypot(p.x, p.z) * 0.001;
    for (const pl of platforms) {
      const top = pl.y + pl.h / 2;
      // Closest xz on cube top
      const cx = Math.max(pl.x - pl.w / 2, Math.min(p.x, pl.x + pl.w / 2));
      const cz = Math.max(pl.z - pl.d / 2, Math.min(p.z, pl.z + pl.d / 2));
      // Only consider if piece is within reach (near cube horizontally or already on it)
      const xzDist = Math.hypot(p.x - cx, p.z - cz);
      if (xzDist > 5) continue;
      const d = Math.hypot(xzDist * 2, Math.abs(p.y - (top + half)));
      if (d < bestDist) {
        bestDist = d;
        bestY = top + half;
        bestX = cx;
        bestZ = cz;
      }
    }
    p.x = bestX;
    p.y = bestY;
    p.z = bestZ;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.vrx = 0;
    p.vry = 0;
    p.vrz = 0;
    p.settled = true;
  }

  // Pushable: collide with player any time (settled or bouncing)
  {
    const dx = p.x - player.x,
      dz = p.z - player.z;
    const minDist = 0.4 + 0.4;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist && dist > 1e-4) {
      // Only push if player feet near piece height (not flying above)
      if (Math.abs(player.y - p.y) < 1.2) {
        const push = (minDist - dist) / dist;
        p.x += dx * push;
        p.z += dz * push;
        // Velocity from player movement
        const speed = Math.sqrt(mx * mx + mz * mz);
        if (speed > 0.1) {
          p.vx = mx * player.speed * 1.2;
          p.vz = mz * player.speed * 1.2;
        } else {
          p.vx = (dx / dist) * 2;
          p.vz = (dz / dist) * 2;
        }
        if (p.settled) {
          p.settled = false;
          p.bounceTime = 0;
        }
      }
    }
  }

  if (p.settled) {
    // nothing
  } else {
    p.vy -= 20 * dt; // match ball gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.rx += p.vrx * dt;
    p.ry += p.vry * dt;
    p.rz += p.vrz * dt;
    // Bounce off floor
    if (p.y < 0.2) {
      p.y = 0.2;
      if (Math.abs(p.vy) < 0.3) {
        p.vy = 0;
      } else {
        p.vy = -p.vy * 0.75;
      }
      p.vx *= 0.97;
      p.vz *= 0.97;
      p.vrx *= 0.95;
      p.vry *= 0.95;
      p.vrz *= 0.95;
    }
    // Bounce off platform tops (if landing on top)
    for (const pl of platforms) {
      const top = pl.y + pl.h / 2;
      if (
        p.x > pl.x - pl.w / 2 - 0.2 &&
        p.x < pl.x + pl.w / 2 + 0.2 &&
        p.z > pl.z - pl.d / 2 - 0.2 &&
        p.z < pl.z + pl.d / 2 + 0.2 &&
        p.y <= top + 0.3 &&
        p.y >= top - 0.1 &&
        p.vy <= 0
      ) {
        p.y = top + 0.2;
        if (Math.abs(p.vy) < 0.3) {
          p.vy = 0;
        } else {
          p.vy = -p.vy * 0.75;
        }
        p.vx *= 0.97;
        p.vz *= 0.97;
      }
    }
  }
  if (p.life <= 0) {
    pieces.splice(i, 1);
    continue;
  }
  const m = mat4Multiply(vp, mat4Translate(p.x, p.y, p.z));
  // Full 3-axis rotation
  const cx = Math.cos(p.rx),
    sx = Math.sin(p.rx);
  const cy = Math.cos(p.ry),
    sy = Math.sin(p.ry);
  const cz = Math.cos(p.rz),
    sz = Math.sin(p.rz);
  const r = mat4Identity();
  // Rz * Ry * Rx
  r[0] = cy * cz;
  r[1] = cy * sz;
  r[2] = -sy;
  r[4] = sx * sy * cz - cx * sz;
  r[5] = sx * sy * sz + cx * cz;
  r[6] = sx * cy;
  r[8] = cx * sy * cz + sx * sz;
  r[9] = cx * sy * sz - sx * cz;
  r[10] = cx * cy;
  const buf = p.buf !== undefined ? pieceBufs[p.buf] : pieceBuf;
  drawMesh(buf, 36, mat4Multiply(m, r));
}

// Ball physics (gentle substep on Y to prevent floor tunneling)
{
  const sub = 2;
  const sdt = dt / sub;
  for (let s = 0; s < sub; s++) {
    ball.vy -= 20 * sdt;
    ball.x += ball.vx * sdt;
    ball.y += ball.vy * sdt;
    ball.z += ball.vz * sdt;
    if (ball.y < ballRestY) {
      ball.y = ballRestY;
      if (Math.abs(ball.vy) < 0.5) ball.vy = 0;
      else ball.vy = -ball.vy * 0.7;
      ball.vx *= 0.98;
      ball.vz *= 0.98;
    }
  }
  if (ball.y - ballRestY < 0.1) {
    ball.spinX = ball.vz / ballRadius;
    ball.spinZ = -ball.vx / ballRadius;
  }
  ball.rx += ball.spinX * dt;
  ball.rz += ball.spinZ * dt;
  for (const pl of platforms) {
    const top = pl.y + pl.h / 2;
    if (
      ball.x > pl.x - pl.w / 2 - ballRadius &&
      ball.x < pl.x + pl.w / 2 + ballRadius &&
      ball.z > pl.z - pl.d / 2 - ballRadius &&
      ball.z < pl.z + pl.d / 2 + ballRadius &&
      ball.y < top + ballRadius &&
      ball.y > top - 0.2 &&
      ball.vy <= 0
    ) {
      ball.y = top + ballRadius;
      ball.vy = -ball.vy * 0.7;
    }
  }
}
// Player push ball
{
  const dx = ball.x - player.x,
    dz = ball.z - player.z;
  const minDist = ballRadius + 0.4;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < minDist && dist > 1e-4 && Math.abs(ball.y - ballRadius) < 1.2) {
    const speed = Math.sqrt(mx * mx + mz * mz);
    if (speed > 0.1) {
      ball.vx = mx * player.speed * 1.5;
      ball.vz = mz * player.speed * 1.5;
    } else {
      ball.vx = (dx / dist) * 2;
      ball.vz = (dz / dist) * 2;
    }
  }
}
// Player push/kick spawned balls
for (const b of spawnedBalls) {
  const ddx = b.x - player.x, ddz = b.z - player.z;
  const ddist = Math.sqrt(ddx * ddx + ddz * ddz);
  const minD = ballRadius + 0.4;
  if (ddist < minD && ddist > 1e-4 && Math.abs(b.y - ballRadius) < 1.5) {
    const sp = Math.sqrt(mx * mx + mz * mz);
    if (sp > 0.1) {
      b.vx = mx * player.speed * 1.8;
      b.vz = mz * player.speed * 1.8;
    } else {
      b.vx = (ddx / ddist) * 3;
      b.vz = (ddz / ddist) * 3;
    }
  }
}
// Player push spawned blocks
for (const b of spawnedBlocks) {
  const ddx = b.x - player.x, ddz = b.z - player.z;
  const ddist = Math.sqrt(ddx * ddx + ddz * ddz);
  const minD = 0.8;
  if (ddist < minD && ddist > 1e-4 && b.y < 1.0) {
    const sp = Math.sqrt(mx * mx + mz * mz);
    if (sp > 0.1) {
      b.vx = mx * player.speed * 1.2;
      b.vz = mz * player.speed * 1.2;
    } else {
      b.vx = (ddx / ddist) * 2;
      b.vz = (ddz / ddist) * 2;
    }
  }
}
// Court invisible walls (ball only) + goal nets
{
  const bx = courtCenterX,
    bz = courtCenterZ;
  const wx = courtW + ballRadius,
    wz = courtL + ballRadius;
  if (ball.x > bx + wx) {
    ball.x = bx + wx;
    ball.vx = -Math.abs(ball.vx) * 0.7;
  }
  if (ball.x < bx - wx) {
    ball.x = bx - wx;
    ball.vx = Math.abs(ball.vx) * 0.7;
  }
  if (ball.z > bz + wz) {
    ball.z = bz + wz;
    ball.vz = -Math.abs(ball.vz) * 0.7;
  }
  if (ball.z < bz - wz) {
    ball.z = bz - wz;
    ball.vz = Math.abs(ball.vz) * 0.7;
  }
  // Goal nets: at z = bz ± (courtL + 0.5). Ball goes in only between posts (|x - bx| < goalW/2)
  // and below bar (ball.y < goalH + 0.1). Past the mouth (z past goal line + radius) without scoring = stop.
  for (const dz of [-1, 1]) {
    const goalZ = bz + dz * (courtL + 0.5);
    // Front of net
    if (dz === 1 && ball.z > bz + courtL - 0.05) {
      // Check if between posts AND below bar
      const inMouth = Math.abs(ball.x - bx) < goalW / 2 + ballRadius;
      const belowBar = ball.y - ballRadius < goalH + 0.1;
      if (!inMouth) {
        ball.z = bz + courtL - 0.05;
        ball.vz = -Math.abs(ball.vz) * 0.5;
      } else if (!belowBar) {
        ball.vy = -Math.abs(ball.vy) * 0.5;
      } else {
        // Ball is going through — check back net stop
        if (ball.z > goalZ + 0.6) {
          // Bounce off back of net (drop gently)
          ball.z = goalZ + 0.6;
          ball.vz = -Math.abs(ball.vz) * 0.2;
          ball.vx *= 0.7;
          ball.vy = Math.max(0, ball.vy) * 0.5;
        }
      }
    }
    if (dz === -1 && ball.z < bz - courtL + 0.05) {
      const inMouth = Math.abs(ball.x - bx) < goalW / 2 + ballRadius;
      const belowBar = ball.y - ballRadius < goalH + 0.1;
      if (!inMouth) {
        ball.z = bz - courtL + 0.05;
        ball.vz = Math.abs(ball.vz) * 0.5;
      } else if (!belowBar) {
        ball.vy = -Math.abs(ball.vy) * 0.5;
      } else {
        if (ball.z < goalZ - 0.6) {
          ball.z = goalZ - 0.6;
          ball.vz = Math.abs(ball.vz) * 0.2;
          ball.vx *= 0.7;
          ball.vy = Math.max(0, ball.vy) * 0.5;
        }
      }
    }
  }
  // Goal scored — reset ball to center, count toward 10
  const touchedGoalZ =
    ball.z > bz + courtL - 0.05 || ball.z < bz - courtL + 0.05;
  const inGoalMouth = Math.abs(ball.x - bx) < goalW / 2 + ballRadius;
  const belowBar = ball.y - ballRadius < goalH + 0.1;
  if (touchedGoalZ && inGoalMouth && belowBar) {
    ball.x = bx;
    ball.z = bz;
    ball.y = ballRestY;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.spinX = 0;
    ball.spinZ = 0;
    const c = cheerSound.cloneNode();
    c.volume = 0.6;
    c.play().catch(() => {});
    player.goals = (player.goals || 0) + 1;
    // Track total goals across the session (never resets).
    player.totalGoals = (player.totalGoals || 0) + 1;
    if (player.goals >= 10) {
      // Reset goals instead of triggering the ending — endless play.
      player.goals = 0;
    }
  }
}
// T key trigger for the ending is disabled in the original 3D physics build.
// Ending sequence: dusk, crowd approaches player, head tracking, first-person, contact or timeout triggers sink
if (player.ending && !player.sinking) {
  // Lock day cycle to dusk with sun still visible
  dayTime = 0.45;
  // Force first person
  firstPerson = true;
  // Head tracking for crowd
  for (const c of crowd) c.headTrack = true;
  // Move crowd toward player
  for (const c of crowd) {
    const dx = player.x - c.x;
    const dz = player.z - c.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.1) {
      const speed = 3.5;
      c.x += (dx / dist) * speed * dt;
      c.z += (dz / dist) * speed * dt;
      c.moving = true;
      c.walkPhase += dt * 6;
    } else {
      c.moving = false;
    }
    // Contact: trigger sinking
    if (dist < 1.5) {
      player.sinking = true;
    }
  }
  // If crowd never reaches player, force the sink after a few seconds.
  if (performance.now() - player.endingStart > 4500) {
    player.sinking = true;
  }
}
// Player sinking into ground after ending
if (player.sinking) {
  player.y -= 6 * dt;
  if (player.y < -10) {
    window.location.href = 'scary-maze.html';
  }
}
// Render ball
{
  const m = mat4Multiply(vp, mat4Translate(ball.x, ball.y, ball.z));
  const cx = Math.cos(ball.rx),
    sx = Math.sin(ball.rx);
  const cz = Math.cos(ball.rz),
    sz = Math.sin(ball.rz);
  const r = mat4Identity();
  r[0] = cz;
  r[1] = sz;
  r[2] = 0;
  r[4] = -sz;
  r[5] = cz;
  r[6] = 0;
  r[8] = 0;
  r[9] = 0;
  r[10] = 1;
  // Apply X rotation too
  const r2 = mat4Identity();
  r2[5] = cx;
  r2[6] = sx;
  r2[9] = -sx;
  r2[10] = cx;
  drawMesh(ballBuf, 10 * 12 * 6, mat4Multiply(m, mat4Multiply(r, r2)));
  drawMesh(ballBlackBuf, 4 * 10 * 6, mat4Multiply(m, mat4Multiply(r, r2)));
}

// Red block collision → shatter player
for (const b of breakables) {
  if (!b.alive) continue;
  const dx = player.x - b.x,
    dz = player.z - b.z;
  const half = 0.5 + 0.4;
  if (
    Math.abs(dx) < half &&
    Math.abs(dz) < half &&
    Math.abs(player.y - b.y) < 1.0
  ) {
    killPlayer();
    break;
  }
}

if (!firstPerson && !player.dead) {
  // Character
  const charY = player.y;
  const charRot = mat4RotateY(player.angle);
  const charTrans = mat4Translate(player.x, charY, player.z);
  const charMat = mat4Multiply(vp, mat4Multiply(charTrans, charRot));

  // Walk animation (only when moving, diagonal opposite limbs)
  const walkBob = isMoving ? Math.sin(walkPhase) * 0.2 : 0;

  // Body
  drawMesh(bodyBuf, 36, mat4Multiply(charMat, mat4Translate(0, 0.85, 0)));
  // Head
  drawMesh(headBuf, 36, mat4Multiply(charMat, mat4Translate(0, 1.6, 0)));
  // Eyes
  // Eyes
  drawMesh(eyeBuf, 36, mat4Multiply(charMat, mat4Translate(-0.1, 1.65, 0.25)));
  drawMesh(eyeBuf, 36, mat4Multiply(charMat, mat4Translate(0.1, 1.65, 0.25)));
  // Minecraft-style walk: limbs swing forward/back along Z.
  // Attached end stays anchored by counter-moving Y so only the tip swings.
  const swing = isMoving ? Math.sin(walkPhase) * 0.35 : 0;
  const attachedTweak = isMoving ? Math.abs(Math.sin(walkPhase)) * 0.05 : 0; // slight body settle
  const jumpLift = player.grounded ? 0 : 0.3;

  // Arms: left arm with right leg, right arm with left leg (diagonal).
  const leftArmZ = swing;
  const rightArmZ = -swing;
  const leftArmY = 1.05 + jumpLift - attachedTweak;
  const rightArmY = 1.05 + jumpLift - attachedTweak;
  drawMesh(
    limbBuf,
    36,
    mat4Multiply(charMat, mat4Translate(-0.35, leftArmY, leftArmZ)),
  );
  drawMesh(
    limbBuf,
    36,
    mat4Multiply(charMat, mat4Translate(0.35, rightArmY, rightArmZ)),
  );

  // Legs swing opposite to arms.
  const kickT = player.kickTime || 0;
  if (kickT > 0) player.kickTime = Math.max(0, kickT - dt);
  const kickPhase = kickT > 0 ? 1 - kickT / 0.3 : 0; // 0→1 over kick
  const kickLurch = kickT > 0 ? Math.sin(kickPhase * Math.PI) * 1.0 : 0;
  const leftLegZ = kickT > 0 ? 0.9 - kickPhase * 0.9 : -swing;
  const rightLegZ = swing;
  const leftLegY = 0.35 - attachedTweak + kickLurch;
  const rightLegY = 0.35 - attachedTweak;
  drawMesh(
    limbBuf,
    36,
    mat4Multiply(charMat, mat4Translate(-0.15, leftLegY, leftLegZ)),
  );
  drawMesh(
    limbBuf,
    36,
    mat4Multiply(charMat, mat4Translate(0.15, rightLegY, rightLegZ)),
  );
}
  // ── Resolve dynamic object collisions ──
  dynamicObjects.length = 0;
  if (!player.dead) regObj(player.x, player.z, 0.4, true);
  if (ball.y > -2) regObj(ball.x, ball.z, 0.4, true);
  for (const c of crowd) regObj(c.x, c.z, 0.4, true);
  for (const b of breakables) if (b.alive) regObj(b.x, b.z, 0.5, false);
  // Wrap pieces so we can write back after resolution.
  for (const p of pieces) {
    dynamicObjects.push({ kind: "sphere", x: p.x, z: p.z, r: 0.2, pushable: true, ref: p });
  }
  // Spawned balls and blocks (from inventory items)
  for (const b of spawnedBalls) {
    b.vy -= 20 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    // Spin based on horizontal velocity (like main ball)
    b.rx += b.spinX * dt;
    b.rz += b.spinZ * dt;
    if (b.y < ballRadius) {
      b.y = ballRadius;
      if (Math.abs(b.vy) < 0.5) b.vy = 0;
      else b.vy = -b.vy * 0.7;
      b.vx *= 0.98;
      b.vz *= 0.98;
      b.spinX *= 0.95;
      b.spinZ *= 0.95;
    }
    dynamicObjects.push({ kind: "sphere", x: b.x, z: b.z, r: 0.4, pushable: true, ref: b });
  }
  for (const b of spawnedBlocks) {
    b.vy -= 20 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.rx += b.vrx * dt;
    b.ry += b.vry * dt;
    b.rz += b.vrz * dt;
    if (b.y < 0.2) {
      b.y = 0.2;
      b.vy = 0; // hard-zero on contact stops the warp
      b.vx *= 0.5;
      b.vz *= 0.5;
      b.vrx *= 0.6;
      b.vrz *= 0.6;
      b.vry *= 0.6;
      // Settle rx and rz to 0 (face down) — hard snap if very close, no per-frame drift
      if (Math.abs(b.rx) < 0.05) b.rx = 0;
      else b.rx += (0 - b.rx) * 0.1;
      if (Math.abs(b.rz) < 0.05) b.rz = 0;
      else b.rz += (0 - b.rz) * 0.1;
      // Snap ry to nearest 90° so the OBB aligns with cardinal directions — hard snap if close
      const snapY = Math.round(b.ry / (Math.PI / 2)) * (Math.PI / 2);
      if (Math.abs(b.ry - snapY) < 0.05) b.ry = snapY;
      else b.ry += (snapY - b.ry) * 0.1;
      // Mark as fully settled if all rotations are at their snap targets
      if (b.rx === 0 && b.rz === 0 && b.ry === snapY) b.settled = true;
    }
    // Collision: true OBB that rotates with the block's ry
    // (0.4 cube -> halfX=halfZ=0.2). y is handled by stacking pass below.
    dynamicObjects.push({ kind: "obb", x: b.x, z: b.z, halfX: 0.2, halfZ: 0.2, angle: b.ry, pushable: true, ref: b });
  }
  resolveDynamicCollisions();
  // Write resolved positions back to wrapped objects (pieces, spawned balls, spawned blocks)
  for (const o of dynamicObjects) {
    if (o.ref) {
      o.ref.x = o.x;
      o.ref.z = o.z;
    }
  }

  // Y-stacking: just keep spawned blocks above the ground.
  const blockHalf = 0.2;
  for (const b of spawnedBlocks) {
    if (b.y < blockHalf) b.y = blockHalf;
  }

  // Render spawned balls (white sphere + black pentagon overlay) with spin
  for (const b of spawnedBalls) {
    const m = mat4Multiply(vp, mat4Translate(b.x, b.y, b.z));
    const cx = Math.cos(b.rx), sx = Math.sin(b.rx);
    const cz = Math.cos(b.rz), sz = Math.sin(b.rz);
    const rot = mat4Identity();
    rot[0] = cz;
    rot[1] = sz;
    rot[4] = -sz;
    rot[5] = cz;
    rot[10] = 1;
    // Combined rotation: rz then rx (z-axis ball spin, x-axis tipping)
    const r = mat4Identity();
    r[0] = cz;
    r[1] = sz;
    r[2] = 0;
    r[4] = -sz * cx;
    r[5] = cz * cx;
    r[6] = sx;
    r[8] = sz * sx;
    r[9] = -cz * sx;
    r[10] = cx;
    drawMesh(spawnedBallWhiteBuf, 10 * 12 * 6, mat4Multiply(m, r));
    drawMesh(spawnedBallBlackBuf, 4 * 10 * 6, mat4Multiply(m, r));
  }
  // Render spawned blocks as spinning colored cubes (like pieces from red blocks)
  for (const b of spawnedBlocks) {
    const m = mat4Multiply(vp, mat4Translate(b.x, b.y, b.z));
    const cx = Math.cos(b.rx), sx = Math.sin(b.rx);
    const cy = Math.cos(b.ry), sy = Math.sin(b.ry);
    const cz = Math.cos(b.rz), sz = Math.sin(b.rz);
    const r = mat4Identity();
    r[0] = cy * cz;
    r[1] = cy * sz;
    r[2] = -sy;
    r[4] = sx * sy * cz - cx * sz;
    r[5] = sx * sy * sz + cx * cz;
    r[6] = sx * cy;
    r[8] = cx * sy * cz + sx * sz;
    r[9] = cx * sy * sz - sx * cz;
    r[10] = cx * cy;
    drawMesh(b.buf, 36, mat4Multiply(m, r));
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);


window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
