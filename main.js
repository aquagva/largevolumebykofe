import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let objects = []; // Теперь это массив, так как объектов может быть несколько
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let minFps = Infinity;
let frameTimes = [];
const FPS_HISTORY_SIZE = 60 * 5; // Для расчета среднего FPS за 5 секунд

const fpsDisplay = document.getElementById('fps-display');
const avgFpsDisplay = document.getElementById('avg-fps-display');
const minFpsDisplay = document.getElementById('min-fps-display');
const frameTimeDisplay = document.getElementById('frame-time-display');
const objCountDisplay = document.getElementById('obj-count-display'); // Добавлено
const polyCountDisplay = document.getElementById('poly-count-display');

const objectCountSlider = document.getElementById('object-count'); // Добавлено
const currentObjectCountSpan = document.getElementById('current-object-count'); // Добавлено
const polyDetailSlider = document.getElementById('poly-detail');
const currentPolyDetailSpan = document.getElementById('current-poly-detail');
const startTestButton = document.getElementById('start-test');

let objectCount = parseInt(objectCountSlider.value); // Текущее количество объектов
let polyDetail = parseInt(polyDetailSlider.value); // Уровень детализации полигонов
let totalPolygons = 0;

currentObjectCountSpan.textContent = objectCount; // Обновляем
currentPolyDetailSpan.textContent = polyDetail;

// Обработчик для ползунка количества объектов
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
    // Сбрасываем все метрики при перезапуске
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

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Положение камеры зависит от количества объектов
    updateCameraPosition();
    camera.lookAt(0, 0, 0); // Камера смотрит в центр

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0); // Устанавливаем цель OrbitControls в центр

    // Добавляем свет
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(5, 5, 5).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xcccccc, 0.5);
    directionalLight2.position.set(-5, -5, -5).normalize();
    scene.add(directionalLight2);

    addObjects(); // Добавляем объекты

    window.addEventListener('resize', onWindowResize);
}

// Новая функция для обновления позиции камеры в зависимости от количества объектов
function updateCameraPosition() {
    let zPos = 10; // По умолчанию для 1 объекта
    if (objectCount === 2) {
        zPos = 15;
    } else if (objectCount === 3) {
        zPos = 20;
    } else if (objectCount === 4) {
        zPos = 25;
    }
    camera.position.set(0, 0, zPos);
    if (controls) { // Если controls уже инициализированы, обновим их
        controls.update(); // Для применения новой позиции камеры
    }
    camera.updateProjectionMatrix();
}

function getHighPolyGeometry(detail) {
    let segments = 32;
    for (let i = 1; i < detail; i++) {
        segments *= 2;
    }
    segments = Math.min(segments, 4096); // Максимальное количество сегментов

    return new THREE.SphereGeometry(5, segments, segments / 2); // Радиус 5
}

function addObjects() { // Переименована из addMainObject
    // Очищаем старые объекты
    objects.forEach(obj => {
        scene.remove(obj);
        obj.geometry.dispose();
        obj.material.dispose();
    });
    objects = [];
    totalPolygons = 0;

    const geometry = getHighPolyGeometry(polyDetail);
    const singleObjectPolygons = geometry.attributes.position.count / 3;

    // Определяем фиксированные позиции для 1-4 объектов
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

    // Создаем и добавляем объекты
    for (let i = 0; i < objectCount; i++) {
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()), // Рандомный цвет для каждого объекта
            flatShading: true
        });
        const object = new THREE.Mesh(geometry, material);
        object.position.copy(positions[i]); // Устанавливаем предопределенную позицию
        object.userData.rotationSpeed = new THREE.Vector3( // Индивидуальная скорость вращения
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01,
            Math.random() * 0.02 - 0.01
        );
        scene.add(object);
        objects.push(object); // Добавляем в массив для анимации
        totalPolygons += singleObjectPolygons; // Накапливаем общее количество полигонов
    }

    // Обновляем отображение количества объектов и полигонов
    objCountDisplay.textContent = objectCount;
    polyCountDisplay.textContent = Math.round(totalPolygons).toLocaleString();

    // Обновляем позицию камеры, если количество объектов изменилось
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
        addObjects(); // Добавляем новые объекты
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        controls.update();
    }

    // Обновление всех объектов в массиве
    objects.forEach(object => {
        object.rotation.x += object.userData.rotationSpeed.x;
        object.rotation.y += object.userData.rotationSpeed.y;
        object.rotation.z += object.userData.rotationSpeed.z;

        // Более сложное движение
        object.position.x += Math.sin(performance.now() * 0.00005 + object.position.y * 0.1) * 0.1;
        object.position.y += Math.cos(performance.now() * 0.00005 + object.position.x * 0.1) * 0.1;
        object.position.z += Math.sin(performance.now() * 0.00005 + object.position.z * 0.1) * 0.1;
    });

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
    // Обновляем позицию камеры при изменении размера окна
    updateCameraPosition();
}