import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

let scene, camera, renderer;
let objects = [];
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

const fpsDisplay = document.getElementById('fps-display');
const objectCountSlider = document.getElementById('object-count');
const currentObjectCountSpan = document.getElementById('current-object-count');
const startTestButton = document.getElementById('start-test');

let maxObjects = parseInt(objectCountSlider.value); // Начальное количество объектов

currentObjectCountSpan.textContent = maxObjects;

objectCountSlider.addEventListener('input', (event) => {
    maxObjects = parseInt(event.target.value);
    currentObjectCountSpan.textContent = maxObjects;
    resetScene(); // Сброс сцены при изменении количества объектов
});

startTestButton.addEventListener('click', () => {
    resetScene();
    if (!renderer) { // Инициализация рендерера только один раз
        init();
    }
    animate();
});

function init() {
    // Сцена
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Камера
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    // Рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Добавляем свет
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);

    addObjects();

    // Обработка изменения размера окна
    window.addEventListener('resize', onWindowResize);
}

function addObjects() {
    // Очищаем старые объекты
    objects.forEach(obj => scene.remove(obj));
    objects = [];

    const geometry = new THREE.SphereGeometry(0.5, 16, 16); // Простая геометрия
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });

    for (let i = 0; i < maxObjects; i++) {
        const object = new THREE.Mesh(geometry, material.clone()); // Каждый объект с новой копией материала
        object.position.set(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50
        );
        object.userData.rotationSpeed = new THREE.Vector3(
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01
        );
        scene.add(object);
        objects.push(object);
    }
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
        // Если рендерер уже инициализирован, просто добавляем новые объекты
        addObjects();
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Обновление объектов
    objects.forEach(object => {
        object.rotation.x += object.userData.rotationSpeed.x;
        object.rotation.y += object.userData.rotationSpeed.y;
        object.rotation.z += object.userData.rotationSpeed.z;

        // Простое движение для усложнения
        object.position.x += Math.sin(performance.now() * 0.0001 + object.position.y * 0.1) * 0.05;
        object.position.y += Math.cos(performance.now() * 0.0001 + object.position.x * 0.1) * 0.05;
        object.position.z += Math.sin(performance.now() * 0.0001 + object.position.z * 0.1) * 0.05;
    });

    // Измерение FPS
    const currentTime = performance.now();
    frameCount++;
    const deltaTime = currentTime - lastFrameTime;

    if (deltaTime >= 1000) { // Обновляем FPS каждую секунду
        fps = (frameCount / deltaTime) * 1000;
        fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
        frameCount = 0;
        lastFrameTime = currentTime;
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}