// smiler.js — rotating 3D smiler model (a giant black head with a glowing
// smile). Designed to overlay the maze raycaster; the caller positions the
// camera and provides a list of smiler world positions. Each smiler faces
// toward the camera, rotates, and is rendered with depth.

(function () {
  // Lazy init: this file expects a WebGL context to already be active on the
  // supplied canvas, with the raycast program currently NOT bound. We bind our
  // own program and rebind the raycast program at the end of drawSmilers.

  let program = null;
  let aPos = -1, aNormal = -1, aColor = -1;
  let uMVP = null, uModel = null, uNormalMat = null, uLightDir = null, uViewPos = null;
  let smilerHeadBuf = null, smilerHeadCount = 0;
  let smilerSmileBuf = null, smilerSmileCount = 0;
  let smilerEyeBuf = null, smilerEyeCount = 0;
  let smilerToothBuf = null, smilerToothCount = 0;
  let initialized = false;

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("smiler shader error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function mat4Identity() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  function mat4Multiply(a, b) {
    const m = new Float32Array(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        m[i + j * 4] =
          a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] +
          a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
    return m;
  }
  function mat4Translate(x, y, z) {
    const m = mat4Identity();
    m[12] = x; m[13] = y; m[14] = z;
    return m;
  }
  function mat4Scale(sx, sy, sz) {
    const m = mat4Identity();
    m[0] = sx; m[5] = sy; m[10] = sz;
    return m;
  }
  function mat4RotateY(a) {
    const m = mat4Identity();
    m[0] = Math.cos(a); m[2] = -Math.sin(a);
    m[8] = Math.sin(a); m[10] = Math.cos(a);
    return m;
  }
  function mat4RotateX(a) {
    const m = mat4Identity();
    m[5] = Math.cos(a); m[6] = Math.sin(a);
    m[9] = -Math.sin(a); m[10] = Math.cos(a);
    return m;
  }
  // Inverse-transpose of a 3x3 portion (for normal matrix)
  function normalMatrix(model) {
    // For uniform scale + rotations only, model upper-3x3 is orthonormal
    return new Float32Array([
      model[0], model[1], model[2],
      model[4], model[5], model[6],
      model[8], model[9], model[10]
    ]);
  }

  // Procedural smiler head: an ellipsoid sphere with eye sockets and a giant
  // grinning mouth. Each piece has its own buffer.
  function buildHead() {
    const r = 0.55, g = 0.55, b = 0.6;
    const verts = [];
    const latBands = 14, lonBands = 18;
    for (let lat = 0; lat < latBands; lat++) {
      const t1 = (lat / latBands) * Math.PI;
      const t2 = ((lat + 1) / latBands) * Math.PI;
      for (let lon = 0; lon < lonBands; lon++) {
        const p1 = (lon / lonBands) * 2 * Math.PI;
        const p2 = ((lon + 1) / lonBands) * 2 * Math.PI;
        const x1 = Math.sin(t1) * Math.cos(p1);
        const y1 = Math.cos(t1);
        const z1 = Math.sin(t1) * Math.sin(p1);
        const x2 = Math.sin(t1) * Math.cos(p2);
        const y2 = Math.cos(t1);
        const z2 = Math.sin(t1) * Math.sin(p2);
        const x3 = Math.sin(t2) * Math.cos(p2);
        const y3 = Math.cos(t2);
        const z3 = Math.sin(t2) * Math.sin(p2);
        const x4 = Math.sin(t2) * Math.cos(p1);
        const y4 = Math.cos(t2);
        const z4 = Math.sin(t2) * Math.sin(p1);
        const c = [r, g, b];
        // Push 6 verts per quad (two triangles), with per-vertex normal (== pos on unit sphere)
        verts.push(
          x1, y1, z1, x1, y1, z1, ...c,
          x2, y2, z2, x2, y2, z2, ...c,
          x3, y3, z3, x3, y3, z3, ...c,
          x1, y1, z1, x1, y1, z1, ...c,
          x3, y3, z3, x3, y3, z3, ...c,
          x4, y4, z4, x4, y4, z4, ...c
        );
      }
    }
    return { verts, count: latBands * lonBands * 6 };
  }

  // Build a flat-shaded "smile" arc: a curved ribbon made of small quads
  // stretching from cheek to cheek, wider in the middle.
  function buildSmile() {
    const verts = [];
    const c = [1, 0.98, 0.95];
    // Position the smile well in front of the head (z=1.0) so it isn't
    // occluded by the head sphere when the head faces the camera.
    const z = 1.0;
    const points = [];
    const segs = 40;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;        // 0..1
      const ang = Math.PI * (1 - t); // 180..0 degrees
      const r = 0.78;
      const x = -Math.cos(ang) * r * 1.4;
      const y = -Math.sin(ang) * r * 0.6 - 0.05;
      points.push([x, y, z]);
    }
    for (let i = 0; i < segs; i++) {
      const p0 = points[i], p1 = points[i + 1];
      const t = i / segs;
      // Thicker at the center of the smile
      const th = 0.13 * Math.sin(Math.PI * (0.15 + 0.7 * (1 - Math.abs(0.5 - t) * 2)));
      const tx = p1[0] - p0[0], ty = p1[1] - p0[1];
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len, ny = tx / len;
      const a = [p0[0] + nx * th, p0[1] + ny * th, p0[2]];
      const b = [p0[0] - nx * th, p0[1] - ny * th, p0[2]];
      const c2 = [p1[0] + nx * th, p1[1] + ny * th, p1[2]];
      const d = [p1[0] - nx * th, p1[1] - ny * th, p1[2]];
      const n = [0, 0, 1];
      function pushV(p) {
        verts.push(p[0], p[1], p[2], n[0], n[1], n[2], ...c);
      }
      pushV(a); pushV(b); pushV(c2);
      pushV(b); pushV(d); pushV(c2);
    }
    return { verts, count: segs * 6 };
  }

  // Tiny white sphere for each eye
  function buildEye() {
    const verts = [];
    const c = [1, 0.97, 0.99];
    const latBands = 6, lonBands = 8;
    for (let lat = 0; lat < latBands; lat++) {
      const t1 = (lat / latBands) * Math.PI;
      const t2 = ((lat + 1) / latBands) * Math.PI;
      for (let lon = 0; lon < lonBands; lon++) {
        const p1 = (lon / lonBands) * 2 * Math.PI;
        const p2 = ((lon + 1) / lonBands) * 2 * Math.PI;
        const x1 = Math.sin(t1) * Math.cos(p1);
        const y1 = Math.cos(t1);
        const z1 = Math.sin(t1) * Math.sin(p1);
        const x2 = Math.sin(t1) * Math.cos(p2);
        const y2 = Math.cos(t1);
        const z2 = Math.sin(t1) * Math.sin(p2);
        const x3 = Math.sin(t2) * Math.cos(p2);
        const y3 = Math.cos(t2);
        const z3 = Math.sin(t2) * Math.sin(p2);
        const x4 = Math.sin(t2) * Math.cos(p1);
        const y4 = Math.cos(t2);
        const z4 = Math.sin(t2) * Math.sin(p1);
        const n = [x1, y1, z1];
        verts.push(
          x1, y1, z1, n[0], n[1], n[2], ...c,
          x2, y2, z2, n[0], n[1], n[2], ...c,
          x3, y3, z3, n[0], n[1], n[2], ...c,
          x1, y1, z1, n[0], n[1], n[2], ...c,
          x3, y3, z3, n[0], n[1], n[2], ...c,
          x4, y4, z4, n[0], n[1], n[2], ...c
        );
      }
    }
    return { verts, count: latBands * lonBands * 6 };
  }

  // Tiny teeth along the smile
  function buildTeeth() {
    const verts = [];
    const c = [1, 1, 1];
    const segs = 10;
    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      const ang = Math.PI * (1 - t);
      const r = 0.78;
      const x = -Math.cos(ang) * r * 1.4;
      const y = -Math.sin(ang) * r * 0.6 - 0.05;
      const z = 1.05;
      // Build a small triangle (a fang pointing up)
      const w = 0.09, h = 0.18;
      const a = [x - w, y - h * 0.4, z];
      const b = [x + w, y - h * 0.4, z];
      const c2 = [x, y + h, z];
      const n = [0, 0, 1];
      verts.push(
        a[0], a[1], a[2], n[0], n[1], n[2], ...c,
        b[0], b[1], b[2], n[0], n[1], n[2], ...c,
        c2[0], c2[1], c2[2], n[0], n[1], n[2], ...c
      );
    }
    return { verts, count: segs * 3 };
  }

  function init(gl) {
    if (initialized) return;
    const vs = `
      attribute vec3 a_pos;
      attribute vec3 a_normal;
      attribute vec3 a_color;
      uniform mat4 u_mvp;
      uniform mat4 u_model;
      uniform mat3 u_normalMat;
      uniform vec3 u_lightDir;
      varying vec3 v_color;
      varying float v_lit;
      void main() {
        gl_Position = u_mvp * vec4(a_pos, 1.0);
        vec3 n = normalize(u_normalMat * a_normal);
        float diff = max(dot(n, normalize(u_lightDir)), 0.0);
        v_lit = 0.45 + 0.55 * diff;
        v_color = a_color;
      }`;
    const fs = `
      precision mediump float;
      varying vec3 v_color;
      varying float v_lit;
      void main() {
        gl_FragColor = vec4(v_color * v_lit, 1.0);
      }`;
    const v = compileShader(gl, gl.VERTEX_SHADER, vs);
    const f = compileShader(gl, gl.FRAGMENT_SHADER, fs);
    program = gl.createProgram();
    gl.attachShader(program, v);
    gl.attachShader(program, f);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("smiler program link error");
      return;
    }
    aPos = gl.getAttribLocation(program, "a_pos");
    aNormal = gl.getAttribLocation(program, "a_normal");
    aColor = gl.getAttribLocation(program, "a_color");
    uMVP = gl.getUniformLocation(program, "u_mvp");
    uModel = gl.getUniformLocation(program, "u_model");
    uNormalMat = gl.getUniformLocation(program, "u_normalMat");
    uLightDir = gl.getUniformLocation(program, "u_lightDir");

    function makeBuffer(geom) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.verts), gl.STATIC_DRAW);
      return { buf, count: geom.count };
    }
    const head = makeBuffer(buildHead());
    smilerHeadBuf = head.buf; smilerHeadCount = head.count;
    const smile = makeBuffer(buildSmile());
    smilerSmileBuf = smile.buf; smilerSmileCount = smile.count;
    const eye = makeBuffer(buildEye());
    smilerEyeBuf = eye.buf; smilerEyeCount = eye.count;
    const teeth = makeBuffer(buildTeeth());
    smilerToothBuf = teeth.buf; smilerToothCount = teeth.count;
    initialized = true;
  }

  // Draw a single smiler. vp is the raycaster's view-projection matrix.
  // (smilerX, smilerZ) is its world position. (camX, camZ) is the camera
  // position. The smiler faces the camera and slowly rotates around Y.
  function drawSmiler(gl, vp, smilerX, smilerZ, camX, camZ, time) {
    init(gl);
    if (!initialized) return;
    gl.useProgram(program);

    // Model matrix: position + scale + rotation
    const dx = camX - smilerX;
    const dz = camZ - smilerZ;
    const yawToCam = Math.atan2(dx, dz);
    // Continuous slow spin added on top of facing
    const spin = time * 0.0006;
    const s = 1.0;
    const m1 = mat4Translate(smilerX, 0, smilerZ);
    const m2 = mat4Multiply(m1, mat4RotateY(yawToCam + spin));
    const m3 = mat4Multiply(m2, mat4Scale(s, s, s));
    // Make the head taller
    const mTall = mat4Identity();
    mTall[5] = 1.4; mTall[13] = -0.2;
    const model = mat4Multiply(m3, mTall);
    const mvp = mat4Multiply(vp, model);

    gl.uniformMatrix4fv(uMVP, false, mvp);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.uniformMatrix3fv(uNormalMat, false, normalMatrix(model));
    gl.uniform3f(uLightDir, 0.4, 0.8, 0.4);

    // Vertex layout: pos(3) + normal(3) + color(3) = 9 floats = 36 bytes
    function draw(buf, count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(aNormal);
      if (aColor >= 0) {
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 36, 24);
        gl.enableVertexAttribArray(aColor);
      }
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }
    draw(smilerSmileBuf, smilerSmileCount);
    draw(smilerToothBuf, smilerToothCount);

    // Two eyes in front of the head, well outside the sphere
    const eyeScale = 0.25;
    function drawEye(x) {
      const m = mat4Multiply(model, mat4Translate(x, 0.32, 0.85));
      const ms = mat4Multiply(m, mat4Scale(eyeScale, eyeScale, eyeScale));
      gl.uniformMatrix4fv(uMVP, false, mat4Multiply(vp, ms));
      gl.uniformMatrix3fv(uNormalMat, false, normalMatrix(ms));
      draw(smilerEyeBuf, smilerEyeCount);
    }
    drawEye(-0.35);
    drawEye(0.35);
  }

  // Expose to the global scope so scary.js can call it.
  window.SmilerRenderer = { drawSmiler };
})();
