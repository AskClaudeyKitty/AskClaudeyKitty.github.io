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
  { x: 14, y: 0.6, z: 18, w: 4, h: 0.5, d: 4 },
  { x: 20, y: 1.5, z: 18, w: 3, h: 0.5, d: 3 },
  { x: 24, y: 2.5, z: 22, w: 3, h: 0.5, d: 3 },
  { x: 28, y: 3.5, z: 18, w: 3, h: 0.5, d: 3 },
  { x: 32, y: 4.5, z: 22, w: 3, h: 0.5, d: 3 },
  { x: 36, y: 5.5, z: 18, w: 3, h: 0.5, d: 3 },
];
const platformBuf = createBuffer(createBox(1, 1, 1, 0.2, 0.5, 0.85)); // shared unit, scale per platform

// ── Breakable red blocks — outside the maze ──
const breakables = [
  { x: 22, y: 1.75, z: 18, alive: true },
  { x: 26, y: 2.75, z: 22, alive: true },
  { x: 30, y: 3.75, z: 18, alive: true },
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
canvas.addEventListener("mousedown", () => canvas.requestPointerLock());
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas) {
    mouseOnCanvas = false;
    lastMouseX = lastMouseY = null;
    camYaw = player.angle;
  }
});
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
  // Kick animation
  player.kickTime = 0.3;
}
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

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

  // Shadows (drawn first, on ground, with soft alpha)
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(-1, -1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  // Set shadow color alpha via temporary override: shadowBuf is RGB 0,0,0. We can't alpha per-vertex without custom shader.
  // Use blend to dim rather than full black.
  // Sun direction in XZ (for orienting elongated shadows)
  const sunLen = Math.hypot(sunX, sunZ) || 1;
  const sx0 = -sunZ / sunLen,
    sz0 = sunX / sunLen; // perpendicular to sun
  const sunDX = sunX / sunLen,
    sunDZ = sunZ / sunLen; // away from sun
  // Helper: draw stretched shadow oriented along sun direction
  function drawStretchedShadow(cx, cy, cz, halfX, halfZ, scaleY) {
    const sh = projectShadow(cx, cy, cz);
    if (!sh) return;
    // Build matrix: translate, rotate to align X-axis with sun direction, scale
    const m = mat4Multiply(vp, mat4Translate(sh.x, sh.y, sh.z));
    const r = mat4Identity();
    r[0] = sunDX;
    r[2] = -sunDZ;
    r[8] = sunDZ;
    r[10] = sunDX;
    const s = mat4Identity();
    s[0] = halfX * lengthFactor;
    s[5] = scaleY;
    s[10] = halfZ;
    drawMesh(shadowBuf, 36, mat4Multiply(m, mat4Multiply(r, s)));
  }
  // Crowd shadows
  for (const c of crowd) drawStretchedShadow(c.x, 0.9, c.z, 0.35, 0.25, 0.02);
  // Player shadow
  drawStretchedShadow(player.x, 1.6, player.z, 0.5, 0.4, 0.02);
  // Ball shadow — circular
  {
    const sh = projectShadow(ball.x, ball.y, ball.z);
    if (sh) {
      const m = mat4Multiply(vp, mat4Translate(sh.x, sh.y, sh.z));
      const s = mat4Identity();
      const r = ballRadius * Math.max(1, lengthFactor);
      s[0] = r;
      s[5] = 0.02;
      s[10] = ballRadius;
      drawMesh(shadowBuf, 36, mat4Multiply(m, s));
    }
  }
  // Platform shadows (flat top-down silhouettes)
  for (const pl of platforms) {
    const sh = projectShadow(pl.x, pl.y, pl.z);
    if (!sh) continue;
    const m = mat4Multiply(vp, mat4Translate(sh.x, sh.y, sh.z));
    const r = mat4Identity();
    r[0] = sunDX;
    r[2] = -sunDZ;
    r[8] = sunDZ;
    r[10] = sunDX;
    const s = mat4Identity();
    s[0] = (pl.w / 2) * lengthFactor;
    s[5] = 0.02;
    s[10] = pl.d / 2;
    drawMesh(shadowBuf, 36, mat4Multiply(m, mat4Multiply(r, s)));
  }
  // Piece shadows
  for (const p of pieces) {
    const sh = projectShadow(p.x, p.y, p.z);
    if (!sh) continue;
    const m = mat4Multiply(vp, mat4Translate(sh.x, sh.y, sh.z));
    const r = mat4Identity();
    r[0] = sunDX;
    r[2] = -sunDZ;
    r[8] = sunDZ;
    r[10] = sunDX;
    const s = mat4Identity();
    s[0] = 0.2 * lengthFactor;
    s[5] = 0.02;
    s[10] = 0.2;
    drawMesh(shadowBuf, 36, mat4Multiply(m, mat4Multiply(r, s)));
  }
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.disable(gl.BLEND);

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
    if (player.goals >= 10 && !player.ending) {
      player.ending = true;
      player.endingStart = performance.now();
    }
  }
}
// T key also triggers ending sequence
if (keys["t"] && !player.ending && !player.sinking) {
  player.ending = true;
  player.endingStart = performance.now();
}
// Ending sequence: dusk, crowd approaches player, head tracking, first-person, contact triggers sink
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
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);


window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
