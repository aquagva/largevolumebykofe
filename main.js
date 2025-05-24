import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let objects = [];
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let minFps = Infinity;
let frameTimes = [];
const FPS_HISTORY_SIZE = 60 * 5;

let objectsVisible = true;

const fpsDisplay = document.getElementById('fps-display');
const avgFpsDisplay = document.getElementById('avg-fps-display');
const minFpsDisplay = document.getElementById('min-fps-display');
const frameTimeDisplay = document.getElementById('frame-time-display');
const objCountDisplay = document.getElementById('obj-count-display');
const polyCountDisplay = document.getElementById('poly-count-display');

const objectCountSlider = document.getElementById('object-count');
const currentObjectCountSpan = document.getElementById('current-object-count');
const polyDetailSlider = document.getElementById('poly-detail');
const currentPolyDetailSpan = document.getElementById('current-poly-detail');
const startTestButton = document.getElementById('start-test');
const toggleObjectsButton = document.getElementById('toggle-objects');

let objectCount = parseInt(objectCountSlider.value);
let polyDetail = parseInt(polyDetailSlider.value);
let totalPolygons = 0;

currentObjectCountSpan.textContent = objectCount;
currentPolyDetailSpan.textContent = polyDetail;

objectCountSlider.addEventListener('input', (event) => {
    objectCount = parseInt(event.target.value);
    currentObjectCountSpan.textContent = objectCount;
    resetScene();
});

polyDetailSlider.addEventListener('input', (event) => {
    polyDetail = parseInt(event.target.value);
    currentPolyDetailSpan.textContent = polyDetail;
    resetScene();
});

startTestButton.addEventListener('click', () => {
    minFps = Infinity;
    frameTimes = [];
    frameCount = 0;
    lastFrameTime = performance.now();

    resetScene();
    if (!renderer) {
        init();
    }
    animate();
});

toggleObjectsButton.addEventListener('click', () => {
    objectsVisible = !objectsVisible;
    objects.forEach(obj => {
        obj.visible = objectsVisible;
    });
    if (objectsVisible) {
        polyCountDisplay.textContent = Math.round(totalPolygons).toLocaleString();
        objCountDisplay.textContent = objectCount;
    } else {
        polyCountDisplay.textContent = '0';
        objCountDisplay.textContent = '0';
    }
});


function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCameraPosition();
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(5, 5, 5).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xcccccc, 0.5);
    directionalLight2.position.set(-5, -5, -5).normalize();
    scene.add(directionalLight2);

    addObjects();

    window.addEventListener('resize', onWindowResize);
}

function updateCameraPosition() {
    let zPos = 12; // Для 1 объекта
    if (objectCount === 2) {
        zPos = 18; // Для 2 объектов
    } else if (objectCount === 3) {
        zPos = 25; // Для 3 объектов
    } else if (objectCount === 4) {
        zPos = 30; // Для 4 объектов
    }
    camera.position.set(0, 0, zPos);
    if (controls) {
        controls.update();
    }
    camera.updateProjectionMatrix();
}

function getHighPolyGeometry(detail) {
    let segments = 32;
    for (let i = 1; i < detail; i++) {
        segments *= 2;
    }
    segments = Math.min(segments, 4096);

    return new THREE.SphereGeometry(5, segments, segments / 2);
}

function addObjects() {
    objects.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
    });
    objects = [];
    totalPolygons = 0;

    const geometry = getHighPolyGeometry(polyDetail);
    const singleObjectTriangles = geometry.attributes.position.count / 3;

    const positions = [];
    if (objectCount === 1) {
        positions.push(new THREE.Vector3(0, 0, 0));
    } else if (objectCount === 2) {
        positions.push(new THREE.Vector3(-7, 0, 0));
        positions.push(new THREE.Vector3(7, 0, 0));
    } else if (objectCount === 3) {
        positions.push(new THREE.Vector3(0, 0, 0));
        positions.push(new THREE.Vector3(-10, 0, 0));
        positions.push(new THREE.Vector3(10, 0, 0));
    } else if (objectCount === 4) {
        positions.push(new THREE.Vector3(-7, 7, 0));
        positions.push(new THREE.Vector3(7, 7, 0));
        positions.push(new THREE.Vector3(-7, -7, 0));
        positions.push(new THREE.Vector3(7, -7, 0));
    }

    for (let i = 0; i < objectCount; i++) {
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()),
            flatShading: true
        });
        const object = new THREE.Mesh(geometry, material);
        object.position.copy(positions[i]);
        object.userData.rotationSpeed = new THREE.Vector3(
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01
        );
        object.visible = objectsVisible;
        scene.add(object);
        objects.push(object);
        totalPolygons += singleObjectTriangles;
    }

    objCountDisplay.textContent = objectsVisible ? objectCount : 0;
    polyCountDisplay.textContent = objectsVisible ? Math.round(totalPolygons).toLocaleString() : 0;

    updateCameraPosition();
}

function resetScene() {
    if (scene) {
        objects.forEach(obj => {
            scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        objects = [];
    }
    if (renderer) {
        addObjects();
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        controls.update();
    }

    if (objectsVisible) {
        objects.forEach(object => {
            object.rotation.x += object.userData.rotationSpeed.x;
            object.rotation.y += object.userData.rotationSpeed.y;
            object.rotation.z += object.userData.rotationSpeed.z;

            object.position.x += Math.sin(performance.now() * 0.00005 + object.position.y * 0.1) * 0.1;
            object.position.y += Math.cos(performance.now() * 0.00005 + object.position.x * 0.1) * 0.1;
            object.position.z += Math.sin(performance.now() * 0.00005 + object.position.z * 0.1) * 0.1;
        });
    }

    const currentTime = performance.now();
    const frameRenderTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    const currentFps = 1000 / frameRenderTime;
    fpsDisplay.textContent = `${Math.round(currentFps)}`;
    frameTimeDisplay.textContent = `${frameRenderTime.toFixed(2)}`;

    if (currentFps < minFps) {
        minFps = currentFps;
        minFpsDisplay.textContent = `${Math.round(minFps)}`;
    }

    frameTimes.push(frameRenderTime);
    if (frameTimes.length > FPS_HISTORY_SIZE) {
        frameTimes.shift();
    }
    const sumFrameTimes = frameTimes.reduce((a, b) => a + b, 0);
    const avgFps = frameTimes.length / (sumFrameTimes / 1000);
    avgFpsDisplay.textContent = `${Math.round(avgFps)}`;

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCameraPosition();
}