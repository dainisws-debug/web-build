import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const canvas = document.querySelector("#scene");
const loader = document.querySelector("#loader");
const loaderBar = document.querySelector("#loaderBar");
const loaderCount = document.querySelector("#loaderCount");

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x10100e, 0.025);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(8, 4.8, 12);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const hemiLight = new THREE.HemisphereLight(0xf4f0e8, 0x233834, 2.4);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff0c2, 5.6);
keyLight.position.set(4.5, 8, 3.5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5ec4b6, 3.2);
rimLight.position.set(-6, 3, -5);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(12, 96),
  new THREE.MeshStandardMaterial({
    color: 0x151510,
    roughness: 0.86,
    metalness: 0.05,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.04;
floor.receiveShadow = true;
scene.add(floor);

const houseGroup = new THREE.Group();
scene.add(houseGroup);

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://unpkg.com/three@0.164.1/examples/jsm/libs/draco/");
gltfLoader.setDRACOLoader(dracoLoader);

let modelReady = false;
const target = new THREE.Vector3(0, 0.6, 0);
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

gltfLoader.load(
  "assets/modern_house.optimized.glb",
  (gltf) => {
    const model = gltf.scene;
    model.rotation.x = 0;
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z);
    const scale = 6.7 / footprint;

    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(scaledCenter);
    model.updateMatrixWorld(true);

    const alignedBox = new THREE.Box3().setFromObject(model);
    model.position.y -= alignedBox.min.y;

    model.traverse((child) => {
      if (!child.isMesh) return;
      const childBox = new THREE.Box3().setFromObject(child);
      const childSize = childBox.getSize(new THREE.Vector3());
      const largeFlatBase =
        childSize.x > footprint * 0.62 && childSize.z > footprint * 0.62 && childSize.y < size.y * 0.08;

      if (largeFlatBase) {
        child.visible = false;
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.envMapIntensity = 0.8;
        child.material.needsUpdate = true;
      }
    });

    houseGroup.add(model);
    houseGroup.rotation.y = -0.72;
    houseGroup.position.y = 0.1;
    modelReady = true;

    hideLoader();
  },
  (event) => {
    if (!event.total) return;
    const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
    loaderBar.style.width = `${progress}%`;
    loaderCount.textContent = `${progress}%`;
  },
  () => {
    loaderCount.textContent = "Modelis nav ieladejies";
  },
);

function hideLoader() {
  loaderBar.style.width = "100%";
  loaderCount.textContent = "100%";
  window.setTimeout(() => loader.classList.add("is-hidden"), 350);
}

function getScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? window.scrollY / maxScroll : 0;
}

function updateScene() {
  const elapsed = clock.getElapsedTime();
  const progress = getScrollProgress();
  const mobile = window.innerWidth < 760;

  const cameraRadius = mobile ? 18 : 16.5;
  const orbit = 0.15 + progress * 1.25 + mouse.x * 0.12;
  const cameraX = Math.sin(orbit) * cameraRadius;
  const cameraZ = Math.cos(orbit) * cameraRadius;
  const cameraY = THREE.MathUtils.lerp(1.8, 1.35, progress) + mouse.y * 0.22;

  camera.position.lerp(new THREE.Vector3(cameraX, cameraY, cameraZ), 0.055);
  camera.lookAt(target);

  if (modelReady) {
    houseGroup.rotation.y += 0.0025;
    houseGroup.rotation.x = Math.sin(elapsed * 0.55) * 0.018;
    houseGroup.position.x = mobile ? 4.25 : THREE.MathUtils.lerp(4.85, -0.25, progress);
    houseGroup.position.y = 0.05 + Math.sin(elapsed * 0.8) * 0.035;
  }

  floor.material.color.lerp(new THREE.Color(progress > 0.62 ? 0x10201d : 0x151510), 0.035);
  renderer.render(scene, camera);
  requestAnimationFrame(updateScene);
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener("resize", handleResize);
window.addEventListener("pointermove", (event) => {
  mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = -(event.clientY / window.innerHeight - 0.5) * 2;
});

updateScene();
