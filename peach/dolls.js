/* Peach dolls for ASS: five jointed peach dolls (body, two arms, two legs) and the poses that make them move.
   Used by the dolls page (peach/) and the course page header. Needs an import map for "three" and "three/addons/". */
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';

const S = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp, TAU = Math.PI * 2;
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

// A soft contact shadow under each doll, so it sits on the floor even from low angles.
const blobTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(20,22,28,.42)'); r.addColorStop(.55, 'rgba(20,22,28,.16)'); r.addColorStop(1, 'rgba(20,22,28,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/* ---------- Materials and small helpers ---------- */
const plushMat = color => new THREE.MeshPhysicalMaterial({color, roughness: .8, sheen: .35, sheenColor: new THREE.Color('#FFD2B0'), sheenRoughness: .7});
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({color, roughness: .55, ...o});
const add = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };

/* A peach body. kind 'round' is the classic heart-shaped peach; 'flat' is a flat (donut) peach. */
function makeBody({kind = 'round', top, mid, blush, blushDir = [.85, -.3, -.2]}) {
  const geo = new THREE.SphereGeometry(1, 180, 140);
  const pos = geo.attributes.position, col = [], v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  const cTop = new THREE.Color(top), cMid = new THREE.Color(mid), cBlush = new THREE.Color(blush);
  const bDir = new THREE.Vector3(...blushDir).normalize(), shade = new THREE.Color('#B8452E');
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const az = Math.atan2(v.x, v.z), ring = Math.sqrt(Math.max(0, 1 - v.y * v.y));
    let r = 1, groove = 0;
    if (kind === 'round') {
      groove = Math.exp(-(az * az) / .012) * Math.pow(ring, .45) * S(v.y, .3, .7);
      r -= .15 * groove;                                                            // the cleft, top notch down to above the face
      r += .05 * Math.exp(-Math.pow(Math.abs(az) - .55, 2) / .06) * ring;            // plump lobes beside it
      r -= .22 * Math.exp(-Math.pow(1 - v.y, 2) / .018);                             // stem hollow
      r += .1 * Math.pow(Math.max(0, -v.y), 5) * Math.exp(-(az * az) / .5);          // soft point at the bottom front
      v.multiplyScalar(r); v.x *= 1.06; v.y *= .95;
    } else {
      r -= .34 * Math.exp(-(ring * ring) / .05);                                     // dimples, top and bottom
      groove = Math.exp(-(az * az) / .01) * S(v.y, .05, .6) * S(ring, .2, .5);
      r -= .05 * groove;                                                             // faint seam on top
      r += .03 * Math.exp(-Math.pow(Math.abs(az) - .6, 2) / .08) * ring;
      v.multiplyScalar(r); v.x *= 1.16; v.z *= 1.1; v.y *= .6;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
    n.copy(v).normalize();
    c.copy(cTop).lerp(cMid, S(-n.y, -.75, .15));
    const speck = .5 + .5 * Math.sin(v.x * 23 + v.y * 17) * Math.sin(v.z * 19 - v.y * 11);   // uneven, natural blush
    c.lerp(cBlush, Math.max(S(n.dot(bDir), -.15, .8) * (.78 + .14 * speck), S(-n.y, .15, .95) * .55, .05));
    c.lerp(shade, groove * .35);                                                     // a touch of shade in the seam
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: .74, sheen: .35, sheenColor: new THREE.Color('#FFD6B8'), sheenRoughness: .65, clearcoat: .08, clearcoatRoughness: .6
  }));
}

/* A curved, pointed leaf with a lighter midrib. */
const leafGeo = (() => {
  const g = new THREE.PlaneGeometry(1, 1, 48, 14), p = g.attributes.position, cl = [], c = new THREE.Color();
  const dark = new THREE.Color('#2E9A47'), light = new THREE.Color('#86DD6E');
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + .5, w = p.getY(i);
    const half = Math.sin(Math.PI * Math.pow(u, .8)) * .5 * (1 - u * .25);
    p.setXYZ(i, u, w * 2 * half * .36, -Math.abs(w) * .1 + Math.sin(u * Math.PI) * .12 - u * u * .1);
    c.copy(dark).lerp(light, (1 - Math.abs(w) * 2) * .6 + u * .2);
    cl.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  g.computeVertexNormals(); return g;
})();
const leafMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .42, side: THREE.DoubleSide});
const stemMat = mat('#7B4B2A', {roughness: .75});
const leaf = (parent, s, x, y, z, rx, ry, rz) => { const m = add(parent, new THREE.Mesh(leafGeo, leafMat), x, y, z); m.scale.set(s, s * 1.4, s); m.rotation.set(rx, ry, rz); return m; };
const stem = (parent, x, y, z, h = .26) => { const m = add(parent, new THREE.Mesh(new THREE.CylinderGeometry(.045, .065, h, 20), stemMat), x, y, z); m.rotation.z = -.2; return m; };

/* Where a ray from outside, along dir, first meets the body (the body sits at the origin, untransformed). */
function surface(body, dir) {
  const d = new THREE.Vector3(...dir).normalize();
  const hit = new THREE.Raycaster(d.clone().multiplyScalar(4), d.clone().negate()).intersectObject(body)[0];
  return hit ? {point: hit.point, normal: hit.face.normal.clone()} : {point: d, normal: d.clone()};
}

/* ---------- Faces: drawn flat and laid on the body as a decal ---------- */
function drawFace(style, state) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 400;
  const g = c.getContext('2d'), ink = '#2B1A17';
  const cheek = style.cheek || 'rgba(255,92,122,.55)';
  for (const x of [112, 400]) {
    const r = g.createRadialGradient(x, 250, 0, x, 250, 72);
    r.addColorStop(0, cheek); r.addColorStop(1, 'rgba(255,92,122,0)');
    g.fillStyle = r; g.fillRect(x - 80, 170, 160, 160);
  }
  if (style.freckles) {
    g.fillStyle = 'rgba(176,74,46,.45)';
    for (const [x, y] of [[96, 232], [118, 248], [132, 226], [380, 226], [394, 248], [416, 232]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }
  }
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  const eyes = [180, 332], ey = style.eyeY || 176, big = style.eye || 1;
  for (const x of eyes) {
    if (state === 'shut') { g.lineWidth = 12; g.beginPath(); g.arc(x, ey - 6, 26 * big, .15 * Math.PI, .85 * Math.PI); g.stroke(); continue; }
    if (state === 'happy') { g.lineWidth = 13; g.beginPath(); g.arc(x, ey + 10, 26 * big, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); continue; }
    if (style.sleepy) {                                     // half-closed, content
      g.beginPath(); g.ellipse(x, ey + 6, 30 * big, 22 * big, 0, 0, Math.PI); g.fill();
      g.lineWidth = 9; g.beginPath(); g.moveTo(x - 32 * big, ey + 6); g.lineTo(x + 32 * big, ey + 6); g.stroke();
      continue;
    }
    g.beginPath(); g.ellipse(x, ey, 30 * big, 38 * big, 0, 0, TAU); g.fill();
    g.fillStyle = '#FFFFFF';
    if (style.star) {                                       // a sparkle instead of a round highlight
      const sx = x - 8, sy = ey - 12, R = 14, r = 5;
      g.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, rr = k % 2 ? r : R; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    } else { g.beginPath(); g.arc(x - 9, ey - 14, 11 * big, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(x + 11, ey + 16, 5 * big, 0, TAU); g.fill();
    g.fillStyle = ink;
  }
  if (style.glasses) {
    g.lineWidth = 9; g.strokeStyle = '#1F2A44';
    for (const x of eyes) { g.beginPath(); g.arc(x, ey, 56, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(236, ey - 6); g.quadraticCurveTo(256, ey - 22, 276, ey - 6); g.stroke();
    g.strokeStyle = ink;
  }
  if (style.brows) {
    g.lineWidth = 9;
    for (const x of eyes) { g.beginPath(); g.moveTo(x - 26, ey - 62); g.quadraticCurveTo(x, ey - 76, x + 26, ey - 64); g.stroke(); }
  }
  g.lineWidth = 10; g.beginPath();
  const mood = state === 'happy' ? 'open' : style.mouth;
  if (mood === 'w') { g.arc(240, 240, 16, .1 * Math.PI, .9 * Math.PI); g.arc(272, 240, 16, .1 * Math.PI, .9 * Math.PI); g.stroke(); }
  else if (mood === 'smile') { g.arc(256, 226, 30, .2 * Math.PI, .8 * Math.PI); g.stroke(); }
  else if (mood === 'open') {
    g.moveTo(226, 232); g.quadraticCurveTo(256, 290, 286, 232); g.closePath(); g.fill();
    g.fillStyle = '#F0607A'; g.beginPath(); g.ellipse(256, 258, 13, 8, 0, 0, TAU); g.fill();
  } else if (mood === 'grin') { g.arc(256, 222, 34, .15 * Math.PI, .85 * Math.PI); g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(218, 236); g.lineTo(228, 228); g.moveTo(294, 236); g.lineTo(284, 228); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function putFace(body, style, size) {
  const tex = {open: drawFace(style, 'open'), shut: drawFace(style, 'shut'), happy: drawFace(style, 'happy')};
  body.updateMatrixWorld(true);
  const {point, normal} = surface(body, [0, style.el ?? .08, 1]);
  const o = new THREE.Object3D(); o.position.copy(point); o.lookAt(point.clone().add(normal));
  const geo = new DecalGeometry(body, point, o.rotation, new THREE.Vector3(...size));
  const m = new THREE.MeshStandardMaterial({map: tex.open, transparent: true, roughness: .45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4});
  body.add(new THREE.Mesh(geo, m));
  return {mat: m, tex};
}

/* ---------- The rig: body, two arms and two legs on joints ---------- */
export function makeDoll(def) {
  const body = makeBody(def.body);
  const face = putFace(body, def.face, def.faceSize);
  const flat = def.body.kind === 'flat';
  const h = flat ? .6 : .95;                       // half height of the body
  const limb = plushMat(def.limb);

  const root = new THREE.Group();                  // stands on the floor, turns to face where it walks
  const hop = new THREE.Group(); root.add(hop);    // jumps and squashes
  const torso = new THREE.Group(); hop.add(torso); // sways and spins
  torso.add(body);

  const armX = flat ? 1.12 : 1.0, armY = flat ? -.02 : -.12, armLen = flat ? .82 : 1;
  const arms = [-1, 1].map(side => {
    const j = add(torso, new THREE.Group(), side * armX, armY, .06);
    const a = add(j, new THREE.Mesh(new THREE.CapsuleGeometry(.13, .26 * armLen, 8, 20), limb), 0, -.22 * armLen, 0);
    const hand = add(j, new THREE.Group(), 0, -.47 * armLen, 0);
    add(hand, new THREE.Mesh(new THREE.SphereGeometry(.165, 28, 20), limb));
    j.userData = {side, hand, arm: a};
    return j;
  });
  const hipY = flat ? -.46 : -.78;
  const legs = [-1, 1].map(side => {
    const j = add(torso, new THREE.Group(), side * .36, hipY, .06);
    add(j, new THREE.Mesh(new THREE.CapsuleGeometry(.13, .12, 8, 20), limb), 0, -.14, 0);
    const foot = add(j, new THREE.Mesh(new THREE.SphereGeometry(.22, 28, 20), limb), 0, -.3, .1);
    foot.scale.set(1, .6, 1.4);
    j.userData = {side};
    return j;
  });
  const lift = -(hipY - .3 - .22 * .6);            // raise the body so the feet rest on the floor
  hop.position.y = lift;

  def.dress?.({body, torso, arms, legs, h, flat});

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshBasicMaterial({map: blobTex, transparent: true, depthWrite: false}));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .005; root.add(blob);

  return {def, root, hop, torso, body, arms, legs, face, lift, height: lift + h + .3,
    seed: Math.random() * 10, action: null, target: null, heading: 0, walk: 0, moving: 0, blinkAt: 1 + Math.random() * 3, faceState: 'open', happyUntil: 0};
}

/* ---------- The five dolls ---------- */
const CLASSIC = {top: '#FFC452', mid: '#FF8F3E', blush: '#F0475A'};
export const DOLLS = [
  {
    id: 'classic', voice: 1, name: 'Classic', dot: '#FF8F3E',
    body: {...CLASSIC}, limb: '#FF9D58',
    face: {mouth: 'w'}, faceSize: [1.6, 1.25, .9],
    dress({torso}) {
      stem(torso, .02, .85, 0);
      leaf(torso, .85, .04, .9, .02, -.35, -.4, .5);
      leaf(torso, .55, 0, .9, -.03, .3, 2.6, .55);
    }
  },
  {
    id: 'flat', voice: 0.86, name: 'Flat peach', dot: '#F7B26A',
    body: {kind: 'flat', top: '#FFD47A', mid: '#FFA45E', blush: '#EE4C66', blushDir: [-.6, .2, .5]}, limb: '#FFB070',
    face: {mouth: 'smile', freckles: true, eye: .85, el: .02, cheek: 'rgba(255,96,120,.5)'}, faceSize: [1.5, 1.05, .9],
    dress({torso}) {
      stem(torso, 0, .42, 0, .2);
      leaf(torso, .7, .02, .48, 0, -.5, -.9, .35);
    }
  },
  {
    id: 'dev', voice: 0.93, name: 'Developer', dot: '#3D4E7A',
    body: {...CLASSIC, blushDir: [-.8, -.3, -.2]}, limb: '#FF9D58',
    face: {mouth: 'smile', glasses: true}, faceSize: [1.7, 1.3, .9],
    dress({torso}) {
      stem(torso, .02, .85, 0);
      leaf(torso, .7, .04, .9, .02, -.35, -.4, .5);
      // Headphones: a padded band over the top and two cups over the sides.
      const band = mat('#3D4E7A', {roughness: .4, metalness: .2}), pad = mat('#E9ECF2', {roughness: .8}), cup = mat('#2A3657', {roughness: .35, metalness: .25});
      const hp = add(torso, new THREE.Group(), 0, .06, -.12); hp.rotation.x = -.18;
      add(hp, new THREE.Mesh(new THREE.TorusGeometry(1.16, .07, 16, 80, Math.PI), band));
      add(hp, new THREE.Mesh(new THREE.TorusGeometry(1.12, .045, 12, 60, Math.PI * .5), pad)).rotation.z = Math.PI * .25;
      for (const s of [-1, 1]) {
        const c = add(hp, new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .16, 36), cup), s * 1.12, 0, 0); c.rotation.z = Math.PI / 2;
        const p = add(hp, new THREE.Mesh(new THREE.TorusGeometry(.2, .07, 12, 36), pad), s * 1.03, 0, 0); p.rotation.y = Math.PI / 2;
        add(hp, new THREE.Mesh(new THREE.SphereGeometry(.035, 12, 8), mat('#7C9BFF', {emissive: '#3E63FF', emissiveIntensity: 1.2})), s * 1.21, .08, .1);
      }
    }
  },
  {
    id: 'des', voice: 1.14, name: 'Designer', dot: '#F0606A',
    body: {...CLASSIC, top: '#FFCB5C'}, limb: '#FF9D58',
    face: {mouth: 'open', star: true}, faceSize: [1.6, 1.25, .9],
    dress({torso, arms}) {
      leaf(torso, .6, -.5, .82, .05, -.2, 2.9, .9);
      // Beret, worn at an angle, with a little tip on top.
      const felt = new THREE.MeshPhysicalMaterial({color: '#F0606A', roughness: .9, sheen: 1, sheenColor: new THREE.Color('#FFC2C7'), sheenRoughness: .6});
      const beret = add(torso, new THREE.Group(), .16, .86, -.02); beret.rotation.set(.12, 0, -.32);
      const cap = add(beret, new THREE.Mesh(new THREE.SphereGeometry(.7, 48, 24), felt)); cap.scale.set(1, .32, 1);
      add(beret, new THREE.Mesh(new THREE.TorusGeometry(.55, .06, 12, 60), felt), 0, -.08, 0).rotation.x = Math.PI / 2;
      add(beret, new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .14, 12), felt), 0, .26, 0);
      // A paintbrush held upright through the right fist, like a pencil, its blue tip up.
      const hand = arms[1].userData.hand;
      const brush = add(hand, new THREE.Group(), 0, 0, .04);
      add(brush, new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .78, 16), mat('#C98B52', {roughness: .5})), 0, .1, 0);
      add(brush, new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), mat('#C98B52', {roughness: .5})), 0, -.29, 0);
      add(brush, new THREE.Mesh(new THREE.CylinderGeometry(.05, .042, .14, 16), mat('#C9CDD4', {metalness: .9, roughness: .25})), 0, .55, 0);
      const tuft = add(brush, new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), mat('#1D4ED8', {roughness: .5})), 0, .68, 0);
      tuft.scale.set(1, 2.1, 1);
      hand.userData.hold = {obj: brush, rx: .3, rz: -.3};   // keep it near upright, leaning a little forward and out
    }
  },
  {
    id: 'bus', voice: 0.8, name: 'Business', dot: '#E9B949',
    body: {...CLASSIC, blushDir: [.6, -.5, .3]}, limb: '#FF9D58',
    face: {mouth: 'grin', brows: true}, faceSize: [1.6, 1.25, .9],
    dress({body, torso, arms}) {
      stem(torso, .02, .85, 0);
      leaf(torso, .8, .04, .9, .02, -.35, -.4, .5);
      leaf(torso, .5, 0, .9, -.03, .3, 2.6, .55);
      // Collar and tie, laid along the front of the body under the face.
      const knotAt = surface(body, [0, -.34, 1]), tipAt = surface(body, [0, -1.5, 1]);
      const up = knotAt.point.clone().sub(tipAt.point), len = up.length(); up.normalize();
      const nrm = knotAt.normal.clone().add(tipAt.normal).normalize(), side = new THREE.Vector3().crossVectors(up, nrm).normalize();
      nrm.crossVectors(side, up);
      const tie = add(torso, new THREE.Group()); tie.position.copy(knotAt.point).addScaledVector(nrm, .02);
      tie.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, nrm));
      const silk = mat('#1F2A44', {roughness: .35, metalness: .05}), white = mat('#FFFFFF', {roughness: .6});
      const blade = new THREE.Shape(); blade.moveTo(-.09, 0); blade.lineTo(.09, 0); blade.lineTo(.19, -len * .8); blade.lineTo(0, -len * 1.0); blade.lineTo(-.19, -len * .8); blade.closePath();
      const bladeMesh = add(tie, new THREE.Mesh(new THREE.ExtrudeGeometry(blade, {depth: .03, bevelEnabled: true, bevelSize: .012, bevelThickness: .01, bevelSegments: 2}), silk), 0, -.06, 0);
      bladeMesh.rotation.x = .12;
      add(tie, new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 14), silk), 0, -.03, .03).scale.set(1.15, .9, .7);
      for (const s of [-1, 1]) {
        const flap = new THREE.Shape(); flap.moveTo(0, 0); flap.lineTo(s * .36, .08); flap.lineTo(s * .13, -.22); flap.closePath();
        add(tie, new THREE.Mesh(new THREE.ExtrudeGeometry(flap, {depth: .02, bevelEnabled: false}), white), s * .04, .04, -.01).rotation.y = -s * .35;
      }
      add(tie, new THREE.Mesh(new THREE.CircleGeometry(.03, 16), mat('#E9B949', {metalness: .8, roughness: .3})), 0, -len * .5, .06);
      // A small briefcase in the left hand.
      const hand = arms[0].userData.hand;
      const brief = add(hand, new THREE.Group(), 0, -.08, .02);
      const leather = mat('#7A4A2A', {roughness: .45}), gold = mat('#E9B949', {metalness: .85, roughness: .3});
      const caseMesh = add(brief, new THREE.Mesh(new THREE.BoxGeometry(.58, .42, .16, 4, 4, 2), leather), 0, -.36, 0);
      caseMesh.geometry.translate(0, 0, 0);
      add(brief, new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 10, 24, Math.PI), leather), 0, -.15, 0);
      for (const s of [-1, 1]) add(brief, new THREE.Mesh(new THREE.BoxGeometry(.07, .05, .02), gold), s * .15, -.18, .085);
      add(brief, new THREE.Mesh(new THREE.BoxGeometry(.58, .02, .165), mat('#5E3820', {roughness: .5})), 0, -.3, 0);
      hand.userData.hold = {obj: brief, rx: 0, rz: 0};   // hangs straight down
    }
  },
];


export const ACTIONS = {
  wave: {label: 'Wave', dur: 2.4},
  dance: {label: 'Dance', dur: 4.2},
  jump: {label: 'Jump', dur: 1.1},
  spin: {label: 'Spin', dur: 1.5},
  walk: {label: 'Wander'},
};

/* ---------- Posing, every frame ---------- */
const tmp = new THREE.Vector3();
/* ---------- Sound: tiny cute blips, synthesised with Web Audio (no files) ----------
   Browsers only allow sound after the visitor clicks or presses a key: call unlockAudio() from such an event.
   sound.on = false mutes everything. */
export const sound = {on: true};
let ac = null, out = null;
export function unlockAudio() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
      out = ac.createGain(); out.gain.value = .32; out.connect(comp);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { ac = null; }
}
// One note: a pitch (that may glide to f2), a quick attack and a soft decay, panned left or right.
function note({f, f2 = f, at = 0, dur = .1, type = 'sine', vol = .4, vib = 0, pan = 0}) {
  const t0 = ac.currentTime + at + .005;
  const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  if (vib) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = 11; lg.gain.value = f * vib; l.connect(lg); lg.connect(o.frequency);
    l.start(t0); l.stop(t0 + dur + .05);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + .008);
  g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
  o.connect(g);
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(out); } else g.connect(out);
  o.start(t0); o.stop(t0 + dur + .02);
}
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
const SFX = {
  step: (v, pan, k) => note({f: (k ? 640 : 760) * v, f2: (k ? 520 : 600) * v, dur: .07, type: 'triangle', vol: .13, pan}),
  jump: (v, pan) => note({f: 280 * v, f2: 980 * v, dur: .22, vol: .38, vib: .04, pan}),
  land: (v, pan) => { note({f: 420 * v, f2: 150 * v, dur: .12, type: 'triangle', vol: .32, pan}); note({f: 1300 * v, f2: 900 * v, at: .02, dur: .05, vol: .06, pan}); },
  wave: (v, pan) => [1, 1.26, 1.5, 2].forEach((m, i) => note({f: 1047 * v * m, at: i * .07, dur: .16, type: 'triangle', vol: .17, pan})),
  spin: (v, pan) => { note({f: 380 * v, f2: 1500 * v, dur: .7, vol: .26, vib: .03, pan}); note({f: 2093 * v, at: .72, dur: .3, type: 'triangle', vol: .15, pan}); },
  beat: (v, pan, k) => { const f = 523 * v * PENTA[k % PENTA.length]; note({f, dur: .18, vol: .26, pan}); note({f: f * 4, dur: .05, vol: .05, pan}); },
  giggle: (v, pan) => [1, 1.12, 1, 1.25].forEach((m, i) => note({f: 900 * v * m, f2: 760 * v * m, at: .05 + i * .085, dur: .07, type: 'triangle', vol: .14, pan})),
};
function emit(d, name, k) {
  if (!ac || ac.state !== 'running' || !sound.on) return;
  SFX[name](d.def.voice || 1, (d.root.position.x / 6), k);
}

export function pose(d, t, dt) {
  d.now = t;
  const ph = d.seed, breathe = Math.sin(t * 2.1 + ph);
  let hopY = 0, sx = 1, sy = 1, twist = 0, sway = .03 * Math.sin(t * .9 + ph), lean = 0;
  const armZ = [-.42, .42], armX = [0, 0], legX = [0, 0], legZ = [0, 0];
  sy += .014 * breathe; sx -= .007 * breathe;
  armZ[0] -= .05 * breathe; armZ[1] += .05 * breathe;

  // Walking toward a target: turn to face it, then step.
  if (d.target) {
    tmp.copy(d.target).sub(d.root.position); tmp.y = 0;
    const dist = tmp.length();
    if (dist < .05) d.target = null;
    else {
      const want = Math.atan2(tmp.x, tmp.z);
      let diff = want - d.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      d.heading += diff * Math.min(1, dt * 8);
      const step = Math.min(dist, dt * 2.1 * (Math.abs(diff) > 1.2 ? .3 : 1));
      d.root.position.addScaledVector(tmp.normalize(), step);
    }
  }
  d.moving = lerp(d.moving, d.target ? 1 : 0, Math.min(1, dt * 10));
  if (d.moving > .01) {
    d.walk += dt * 10;
    const s = Math.sin(d.walk), m = d.moving;
    const foot = Math.floor(d.walk / Math.PI);                // a pip for every footfall
    if (foot !== d.foot) { d.foot = foot; if (m > .5) emit(d, 'step', foot & 1); }
    legX[0] += .75 * s * m; legX[1] -= .75 * s * m;
    armX[0] -= .7 * s * m; armX[1] += .7 * s * m;
    hopY += .08 * Math.abs(Math.cos(d.walk)) * m;
    sway += .07 * s * m; lean += .1 * m;
  }
  if (!d.target && d.restHeading != null) {
    let diff = d.restHeading - d.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    d.heading += diff * Math.min(1, dt * 3);
  }
  d.root.rotation.y = d.heading;

  // One-off actions.
  const a = d.action;
  if (a) {
    const u = (t - a.t0) / ACTIONS[a.name].dur;
    if (u >= 1) d.action = null;
    else if (u >= 0) {
      if (!a.sounded) { a.sounded = true; emit(d, a.name === 'dance' ? 'beat' : a.name, 0); if (a.giggle) emit(d, 'giggle'); }
      if (a.name === 'wave' && u > .45 && !a.again) { a.again = true; emit(d, 'wave'); }
      if (a.name === 'jump' && u > .78 && !a.landed) { a.landed = true; emit(d, 'land'); }
      if (a.name === 'dance') { const b = Math.floor((t - a.t0) * 6.5 / Math.PI); if (b !== a.beat) { a.beat = b; emit(d, 'beat', b); } }
      const env = S(u, 0, .12) * (1 - S(u, .85, 1));
      if (a.name === 'wave') {
        armZ[1] = lerp(armZ[1], 2.55 + .35 * Math.sin(t * 11), env);
        armX[1] = lerp(armX[1], -.25, env);
        sway += .08 * env * Math.sin(t * 5.5); twist += .15 * env;
      } else if (a.name === 'dance') {
        const b = t * 6.5;
        hopY += .22 * Math.abs(Math.sin(b)) * env;
        twist += .45 * Math.sin(b / 2) * env;
        sway += .12 * Math.sin(b / 2 + 1) * env;
        armZ[0] = lerp(armZ[0], -1.9 - .7 * Math.sin(b), env);
        armZ[1] = lerp(armZ[1], 1.9 - .7 * Math.sin(b), env);
        legZ[0] = -.25 * Math.max(0, Math.sin(b / 2)) * env; legZ[1] = .25 * Math.max(0, -Math.sin(b / 2)) * env;
      } else if (a.name === 'jump') {
        if (u < .22) { const k = S(u, 0, .22); sy -= .16 * k; sx += .09 * k; }
        else if (u < .78) {
          const k = (u - .22) / .56; hopY += 1.5 * Math.sin(Math.PI * k);
          sy += .1 * Math.sin(Math.PI * k); sx -= .05 * Math.sin(Math.PI * k);
          armZ[0] = -2.3; armZ[1] = 2.3; legX[0] = legX[1] = -.45 * Math.sin(Math.PI * k);
        } else { const k = 1 - S(u, .78, 1); sy -= .14 * k; sx += .08 * k; }
      } else if (a.name === 'spin') {
        twist += TAU * ease(u);
        hopY += .25 * Math.sin(Math.PI * u);
        armZ[0] = lerp(armZ[0], -1.45, env); armZ[1] = lerp(armZ[1], 1.45, env);
      }
    }
  }

  d.hop.position.y = d.lift + hopY;
  d.hop.scale.set(sx, sy, sx);
  d.torso.rotation.set(lean, twist, sway);
  d.arms.forEach((j, i) => {
    j.rotation.z += (armZ[i] - j.rotation.z) * Math.min(1, dt * 14);
    j.rotation.x += (armX[i] - j.rotation.x) * Math.min(1, dt * 14);
    const held = j.userData.hand.userData.hold;          // held things keep their angle as the arm swings
    if (held) held.obj.rotation.set(held.rx - j.rotation.x, 0, held.rz - j.rotation.z);
  });
  d.legs.forEach((j, i) => { j.rotation.x = legX[i]; j.rotation.z = legZ[i]; });

  // Face: blink now and then; squeeze the eyes shut when happy.
  let want = 'open';
  if (t < d.happyUntil) want = 'happy';
  else if (t > d.blinkAt) { want = 'shut'; if (t > d.blinkAt + .13) d.blinkAt = t + 2 + Math.random() * 3.5; }
  if (want !== d.faceState) { d.face.mat.map = d.face.tex[want]; d.faceState = want; }
}
