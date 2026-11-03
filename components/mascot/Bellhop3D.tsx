"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Botones de Kabeli: personaje 3D de estilo "vinyl toy" (cabezón, mate y suave) modelado
// por código, con uniforme de botones y animación de saludo. Sin assets externos.

const COLORS = {
  skin: "#8FD4B9", // verde menta (guiño al coquí)
  jacket: "#C8452C", // rojo botones (cercano al coral de la marca)
  jacketDark: "#A93A25",
  navy: "#1E2A4F",
  gold: "#E8B649",
  glove: "#FBF8F3",
  shoe: "#1A1A1F",
  eye: "#141418",
  cheek: "#F59A9E",
  mouth: "#3A1F22",
  bow: "#0B6E69", // laguna
};

const WAVE_DURATION = 2.8;

type Props = {
  className?: string;
  /** Saluda solo cada cierto tiempo (además de al hacer clic). */
  autoWave?: boolean;
  /** Cambia este número para disparar un saludo desde fuera. */
  waveSignal?: number;
};

export function Bellhop3D({ className, autoWave = true, waveSignal = 0 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (waveSignal > 0) waveRef.current();
  }, [waveSignal]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- Renderer, escena y cámara ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cursor = "pointer";
    renderer.domElement.style.touchAction = "manipulation";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.5, 7.2);
    camera.lookAt(0, 1.3, 0);

    scene.add(new THREE.HemisphereLight("#fff6ea", "#c9d6d2", 0.9));
    const key = new THREE.DirectionalLight("#ffffff", 2.2);
    key.position.set(2.5, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -1;
    key.shadow.radius = 6;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight("#ffe2c2", 1.2);
    rim.position.set(-3, 3, -3);
    scene.add(rim);

    // --- Materiales ---
    const disposables: { dispose: () => void }[] = [envTex, pmrem];
    const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);
    const vinyl = (color: string, rough = 0.55) =>
      track(
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: rough,
          clearcoat: 0.25,
          clearcoatRoughness: 0.55,
          sheen: 0.35,
          sheenRoughness: 0.8,
          sheenColor: new THREE.Color("#ffffff"),
        }),
      );
    const fabric = (color: string) =>
      track(new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffd2c4") }));
    const M = {
      skin: vinyl(COLORS.skin),
      jacket: fabric(COLORS.jacket),
      jacketDark: fabric(COLORS.jacketDark),
      navy: track(new THREE.MeshPhysicalMaterial({ color: COLORS.navy, roughness: 0.75, sheen: 0.8, sheenColor: new THREE.Color("#8fa0d0") })),
      gold: track(new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 1, roughness: 0.3 })),
      glove: vinyl(COLORS.glove, 0.6),
      shoe: track(new THREE.MeshPhysicalMaterial({ color: COLORS.shoe, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 })),
      eye: track(new THREE.MeshPhysicalMaterial({ color: COLORS.eye, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 })),
      shine: track(new THREE.MeshBasicMaterial({ color: "#ffffff" })),
      cheek: vinyl(COLORS.cheek, 0.7),
      mouth: vinyl(COLORS.mouth, 0.5),
      bow: vinyl(COLORS.bow, 0.5),
    };
    const geo = <T extends THREE.BufferGeometry>(g: T) => track(g);
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, shadow = true) => {
      const o = new THREE.Mesh(g, m);
      o.castShadow = shadow;
      parent.add(o);
      return o;
    };

    // --- Personaje ---
    const root = new THREE.Group();
    scene.add(root);

    // Piernas y zapatos
    const legGeo = geo(new THREE.CapsuleGeometry(0.15, 0.24, 8, 24));
    const shoeGeo = geo(new THREE.SphereGeometry(0.17, 32, 20));
    const stripeGeo = geo(new THREE.CapsuleGeometry(0.012, 0.3, 4, 8));
    for (const side of [-1, 1]) {
      const leg = mesh(legGeo, M.navy, root);
      leg.position.set(side * 0.17, 0.34, 0);
      const stripe = mesh(stripeGeo, M.gold, root, false);
      stripe.position.set(side * 0.318, 0.36, 0);
      const shoe = mesh(shoeGeo, M.shoe, root);
      shoe.scale.set(1.05, 0.58, 1.35);
      shoe.position.set(side * 0.18, 0.09, 0.05);
    }

    // Cuerpo (rebota) → torso (respira), cabeza y brazos
    const body = new THREE.Group();
    root.add(body);
    const torso = new THREE.Group();
    torso.position.y = 0.5;
    torso.scale.z = 0.88;
    body.add(torso);

    const profile = new THREE.SplineCurve([
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.32, 0.0),
      new THREE.Vector2(0.44, 0.06),
      new THREE.Vector2(0.48, 0.22),
      new THREE.Vector2(0.47, 0.4),
      new THREE.Vector2(0.42, 0.6),
      new THREE.Vector2(0.32, 0.76),
      new THREE.Vector2(0.18, 0.85),
      new THREE.Vector2(0.0, 0.87),
    ]).getPoints(48);
    const radiusAt = (y: number) => {
      for (let i = 1; i < profile.length; i++) {
        const a = profile[i - 1];
        const b = profile[i];
        if ((a.y <= y && b.y >= y) || (a.y >= y && b.y <= y)) {
          const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
          return a.x + (b.x - a.x) * t;
        }
      }
      return 0;
    };
    mesh(geo(new THREE.LatheGeometry(profile, 64)), M.jacket, torso);

    // Doble fila de botones dorados
    const buttonGeo = geo(new THREE.SphereGeometry(0.036, 20, 12));
    for (const y of [0.2, 0.36, 0.52]) {
      for (const x of [-0.13, 0.13]) {
        const r = radiusAt(y);
        const b = mesh(buttonGeo, M.gold, torso, false);
        b.position.set(x, y, Math.sqrt(Math.max(r * r - x * x, 0)));
        b.scale.set(1, 1, 0.75 / 0.88);
      }
    }
    // Ribete dorado en el borde de la chaqueta y cuello
    const hem = mesh(geo(new THREE.TorusGeometry(radiusAt(0.035), 0.026, 12, 64)), M.gold, torso, false);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.035;
    const collar = mesh(geo(new THREE.TorusGeometry(radiusAt(0.78) + 0.01, 0.045, 12, 48)), M.jacketDark, torso);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.78;
    // Línea de cierre central
    const seam = mesh(geo(new THREE.CapsuleGeometry(0.008, 0.5, 4, 8)), M.jacketDark, torso, false);
    seam.position.set(0, 0.36, radiusAt(0.36) + 0.002);
    seam.scale.z = 1 / 0.88;

    // Corbatín
    const bow = new THREE.Group();
    bow.position.set(0, 1.21, radiusAt(0.71) * 0.88 + 0.04);
    body.add(bow);
    const wingGeo = geo(new THREE.ConeGeometry(0.075, 0.13, 20));
    for (const side of [-1, 1]) {
      const wing = mesh(wingGeo, M.bow, bow);
      wing.rotation.z = side * (Math.PI / 2);
      wing.position.x = -side * 0.07;
      wing.scale.z = 0.5;
    }
    mesh(geo(new THREE.SphereGeometry(0.04, 16, 12)), M.bow, bow).scale.z = 0.7;

    // Cabeza
    const neck = new THREE.Group();
    neck.position.y = 1.3;
    body.add(neck);
    const head = new THREE.Group();
    head.position.y = 0.5;
    neck.add(head);
    const R = { x: 0.66, y: 0.55, z: 0.58 };
    const skull = mesh(geo(new THREE.SphereGeometry(1, 64, 48)), M.skin, head);
    skull.scale.set(R.x, R.y, R.z);

    // Coloca un objeto sobre la superficie del elipsoide de la cabeza, orientado a la normal.
    const onHead = (o: THREE.Object3D, x: number, y: number, inset = 0) => {
      const z = R.z * Math.sqrt(Math.max(1 - (x / R.x) ** 2 - (y / R.y) ** 2, 0));
      const n = new THREE.Vector3(x / R.x ** 2, y / R.y ** 2, z / R.z ** 2).normalize();
      o.position.set(x, y, z).addScaledVector(n, -inset);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      head.add(o);
      return o;
    };

    const eyes: THREE.Object3D[] = [];
    const eyeGeo = geo(new THREE.SphereGeometry(0.078, 32, 20));
    const shineGeo = geo(new THREE.SphereGeometry(0.022, 12, 8));
    for (const side of [-1, 1]) {
      const eye = onHead(new THREE.Group(), side * 0.22, 0.06, 0.012);
      const ball = mesh(eyeGeo, M.eye, eye, false);
      ball.scale.set(0.85, 1.15, 0.5);
      const shine = mesh(shineGeo, M.shine, eye, false);
      shine.position.set(0.025, 0.04, 0.035);
      eyes.push(eye);
    }
    const cheekGeo = geo(new THREE.SphereGeometry(0.075, 24, 12));
    for (const side of [-1, 1]) {
      const cheek = onHead(new THREE.Group(), side * 0.39, -0.1, 0.01);
      mesh(cheekGeo, M.cheek, cheek, false).scale.set(1.3, 0.8, 0.25);
    }
    const mouth = onHead(new THREE.Group(), 0, -0.1, 0.004);
    const smile = mesh(geo(new THREE.TorusGeometry(0.075, 0.017, 10, 32, Math.PI)), M.mouth, mouth, false);
    smile.rotation.z = Math.PI;

    // Gorro pillbox con ribete dorado, visera y tres estrellas
    const hat = new THREE.Group();
    hat.position.set(0.1, 0.47, 0.0);
    hat.rotation.set(-0.08, 0, -0.2);
    head.add(hat);
    const hatBody = mesh(geo(new THREE.CylinderGeometry(0.27, 0.29, 0.25, 48)), M.navy, hat);
    hatBody.position.y = 0.125;
    const hatTop = mesh(geo(new THREE.TorusGeometry(0.255, 0.022, 10, 48)), M.navy, hat, false);
    hatTop.rotation.x = Math.PI / 2;
    hatTop.position.y = 0.245;
    mesh(geo(new THREE.CylinderGeometry(0.255, 0.255, 0.045, 48)), M.navy, hat, false).position.y = 0.235;
    const band = mesh(geo(new THREE.CylinderGeometry(0.296, 0.298, 0.05, 48)), M.gold, hat, false);
    band.position.y = 0.04;
    const visor = mesh(geo(new THREE.CylinderGeometry(0.29, 0.29, 0.018, 40, 1, false, -Math.PI / 2, Math.PI)), M.shoe, hat);
    visor.scale.set(1.02, 1, 1.55);
    visor.position.y = 0.012;
    visor.rotation.x = 0.12;
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.014 : 0.032;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starGeo = geo(new THREE.ExtrudeGeometry(star, { depth: 0.01, bevelEnabled: false }));
    for (const a of [-0.28, 0, 0.28]) {
      const s = mesh(starGeo, M.gold, hat, false);
      s.position.set(Math.sin(a) * 0.282, 0.13, Math.cos(a) * 0.282);
      s.rotation.y = a;
    }

    // Brazos: hombro → codo → mano (guante blanco con pulgar)
    const upperGeo = geo(new THREE.CapsuleGeometry(0.1, 0.12, 8, 20));
    const foreGeo = geo(new THREE.CapsuleGeometry(0.095, 0.1, 8, 20));
    const cuffGeo = geo(new THREE.TorusGeometry(0.094, 0.024, 10, 32));
    const handGeo = geo(new THREE.SphereGeometry(0.125, 28, 20));
    const thumbGeo = geo(new THREE.SphereGeometry(0.05, 16, 12));
    const makeArm = (side: 1 | -1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.39, 1.17, 0);
      body.add(shoulder);
      mesh(geo(new THREE.SphereGeometry(0.115, 20, 16)), M.jacket, shoulder);
      mesh(upperGeo, M.jacket, shoulder).position.y = -0.13;
      const elbow = new THREE.Group();
      elbow.position.y = -0.25;
      shoulder.add(elbow);
      mesh(foreGeo, M.jacket, elbow).position.y = -0.08;
      const cuff = mesh(cuffGeo, M.gold, elbow, false);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.17;
      const hand = new THREE.Group();
      hand.position.y = -0.27;
      elbow.add(hand);
      mesh(handGeo, M.glove, hand).scale.set(1, 1.05, 0.9);
      mesh(thumbGeo, M.glove, hand).position.set(-side * 0.075, 0.05, 0.07);
      return { shoulder, elbow, hand };
    };
    const armR = makeArm(1); // brazo que saluda (derecha de la pantalla)
    const armL = makeArm(-1);

    // Suelo: captura de sombra + sombra de contacto suave
    const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(8, 8)), track(new THREE.ShadowMaterial({ opacity: 0.12 })));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const blobCanvas = document.createElement("canvas");
    blobCanvas.width = blobCanvas.height = 128;
    const ctx = blobCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(19,48,46,0.45)");
    grad.addColorStop(1, "rgba(19,48,46,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const blobTex = track(new THREE.CanvasTexture(blobCanvas));
    const blob = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.5, 1.0)), track(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.002;
    scene.add(blob);

    // --- Animación ---
    let waveStart = -Infinity;
    const clock = new THREE.Clock();
    const wave = () => {
      const t = clock.getElapsedTime();
      if (t - waveStart > WAVE_DURATION * 0.85) waveStart = t;
    };
    waveRef.current = wave;
    const startDelay = 0.6;
    let nextAutoWave = startDelay;

    const pointer = new THREE.Vector2();
    const look = new THREE.Vector2();
    const onPointerMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.5, 1.5),
        THREE.MathUtils.clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1.5, 1.5),
      );
    };
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", wave);

    const smooth = THREE.MathUtils.smoothstep;
    const lerp = THREE.MathUtils.lerp;
    let nextBlink = 2;
    let frame = 0;

    const render = () => {
      const t = clock.getElapsedTime();
      if (autoWave && !reducedMotion && t >= nextAutoWave) {
        wave();
        nextAutoWave = t + 7 + Math.random() * 3;
      }

      const w = t - waveStart;
      const active = w >= 0 && w <= WAVE_DURATION;
      // up: 0 → 1 al levantar el brazo, 1 → 0 al bajarlo
      const up = active ? smooth(w, 0, 0.45) * (1 - smooth(w, WAVE_DURATION - 0.55, WAVE_DURATION)) : 0;
      const hop = active ? Math.sin(Math.min(w / 0.45, 1) * Math.PI) : 0;
      const idle = reducedMotion ? 0 : 1;

      // Cuerpo: respiración, rebote al empezar el saludo
      body.position.y = idle * Math.sin(t * 2.2) * 0.012 + hop * 0.07;
      torso.scale.y = 1 + idle * Math.sin(t * 2.2 + 0.6) * 0.012 - hop * 0.03;
      body.rotation.z = up * -0.06;

      // Cabeza: mira al puntero e inclina hacia el saludo
      look.lerp(pointer, 0.06);
      neck.rotation.y = look.x * 0.32;
      neck.rotation.x = -look.y * 0.14 + Math.sin(t * 1.3) * 0.015 * idle;
      neck.rotation.z = up * 0.14 + Math.sin(t * 0.9) * 0.02 * idle;
      hat.rotation.z = -0.2 + up * Math.sin(w * 14) * 0.03;

      // Brazo que saluda
      const wag = Math.sin((w - 0.35) * 13);
      armR.shoulder.rotation.z = lerp(0.12 + Math.sin(t * 2.2) * 0.02 * idle, 2.5, up);
      armR.shoulder.rotation.x = up * -0.25;
      armR.elbow.rotation.z = up * (0.35 + wag * 0.45);
      armR.hand.rotation.z = up * wag * 0.25;
      // Brazo en reposo
      armL.shoulder.rotation.z = -0.12 - Math.sin(t * 2.2) * 0.02 * idle - up * 0.08;
      armL.elbow.rotation.z = -0.1;

      // Parpadeo, y ojos "felices" mientras saluda
      if (t > nextBlink) nextBlink = t + 2.5 + Math.random() * 3;
      const blink = Math.max(0, 1 - Math.abs(t - (nextBlink - 0.08)) / 0.08);
      const eyeY = Math.min(1 - blink * 0.9, 1 - up * 0.35);
      for (const e of eyes) e.scale.y = eyeY;
      smile.scale.set(1 + up * 0.25, 1 + up * 0.5, 1);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // En contenedores angostos, retrocede para que el personaje quepa completo.
      camera.position.z = 7.2 * Math.max(1, 0.62 / camera.aspect);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();
    render();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", wave);
      waveRef.current = () => {};
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [autoWave]);

  return <div ref={mountRef} className={className} role="img" aria-label="Botones de Kabeli Resort saludando" />;
}
