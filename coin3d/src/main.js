import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { AudioManager } from './audio-manager.js';
import { CoinPhysics } from './coin-physics.js';

// 场景变量
let scene, camera, renderer, coin, controls;
let light, ambientLight;
let coinMaterial;
let font;
let coinPhysics;
let raycaster, mouse;
let infoElement;
let isFlipping = false;
let flipButton, resetButton;
let audioManager;
let particles;

// 初始化函数
function init() {
    // 创建音频管理器
    audioManager = new AudioManager();
    
    // 创建场景
    scene = new THREE.Scene();
    
    // 创建摄像机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // 创建渲染器，启用阴影
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x121212);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // 初始化射线投射器和鼠标坐标（用于检测点击）
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // 获取UI元素
    infoElement = document.getElementById('info');
    flipButton = document.getElementById('flip-btn');
    resetButton = document.getElementById('reset-btn');
    const soundButton = document.getElementById('sound-btn');
    
    // 添加轨道控制器，使硬币可以通过鼠标旋转查看
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 添加阻尼效果，使旋转更自然
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10;
    controls.minDistance = 2;
    
    // 创建灯光
    setupLights();
    
    // 创建地面
    createFloor();
    
    // 加载字体，然后创建硬币
    loadFontAndCreateCoin();
    
    // 添加事件监听器
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);
    
    // 按钮事件
    flipButton.addEventListener('click', () => {
        if (!isFlipping) {
            flipCoin();
        }
    });
    
    resetButton.addEventListener('click', () => {
        // 重置相机视角
        camera.position.set(0, 0, 5);
        controls.reset();
    });
    
    // 声音控制按钮事件
    soundButton.addEventListener('click', () => {
        const isMuted = audioManager.toggleMute();
        soundButton.textContent = isMuted ? '🔇 声音: 关' : '🔊 声音: 开';
        
        // 如果是取消静音，播放一个轻微的声音作为确认
        if (!isMuted) {
            setTimeout(() => audioManager.play('flip'), 100);
        }
    });
    
    // 开始动画循环
    animate();
}

// 设置灯光
function setupLights() {
    // 环境光 - 提供基础照明
    ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // 主方向光 - 模拟太阳光
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    light.castShadow = true;
    
    // 提升阴影质量
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    
    scene.add(light);
    
    // 添加额外的光源使金属效果更明显
    const frontLight = new THREE.PointLight(0xffffff, 0.5);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);
    
    const backLight = new THREE.PointLight(0xffffff, 0.3);
    backLight.position.set(0, 0, -10);
    scene.add(backLight);
}

// 创建地面
function createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    floor.receiveShadow = true;
    scene.add(floor);
}

// 加载字体和创建硬币
function loadFontAndCreateCoin() {
    // 加载字体
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        createCoin();
    });
}

// 创建硬币
function createCoin() {
    // 硬币尺寸
    const radius = 2;
    const height = 0.2;
    
    // 硬币几何体 - 使用圆柱体
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    
    // 创建金属质感材质
    coinMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,      // 金色
        metalness: 0.9,       // 金属感强
        roughness: 0.3,       // 一定的粗糙度，增加真实感
        envMapIntensity: 1.0, // 环境反射强度
    });
    
    // 创建硬币
    coin = new THREE.Mesh(geometry, coinMaterial);
    coin.castShadow = true;
    coin.receiveShadow = true;
    
    // 将硬币旋转，使其平放（而不是竖直）
    coin.rotation.x = Math.PI / 2;
    
    scene.add(coin);
    
    // 添加硬币细节
    addCoinDetails();
    
    // 创建硬币物理系统
    coinPhysics = new CoinPhysics(coin);
    
    // 创建粒子系统
    createParticleSystem();
}

// 添加硬币的细节
function addCoinDetails() {
    if (!font) return;
    
    // 正面：添加数字 "1"
    const textGeometry = new TextGeometry('1', {
        font: font,
        size: 0.8,
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
    });
    
    // 使文本居中
    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
    const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;
    
    textGeometry.translate(-textWidth / 2, -textHeight / 2, 0);
    
    const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.9,
        roughness: 0.1,
    });
    
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.y = 0.15; // 略高于硬币表面
    textMesh.castShadow = true;
    
    coin.add(textMesh);
    
    // 背面：添加一个简单的图案
    addCoinBackDesign();
}

// 添加硬币背面的设计
function addCoinBackDesign() {
    const circle = new THREE.Mesh(
        new THREE.CircleGeometry(0.6, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0xFFD700,
            metalness: 0.9,
            roughness: 0.1
        })
    );
    circle.position.y = -0.15; // 背面
    circle.rotation.y = Math.PI; // 翻转到背面
    
    coin.add(circle);
    
    // 添加一些装饰性线条
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffd700 });
    
    // 创建星形图案
    const starPoints = [];
    const outerRadius = 0.9;
    const innerRadius = 0.5;
    const spikes = 5;
    
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (spikes * 2)) * Math.PI * 2;
        starPoints.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            -0.14, // 略高于背面
            Math.sin(angle) * radius
        ));
    }
    
    // 闭合形状
    starPoints.push(starPoints[0].clone());
    
    const starGeometry = new THREE.BufferGeometry().setFromPoints(starPoints);
    const star = new THREE.Line(starGeometry, lineMaterial);
    
    coin.add(star);
}

// 创建粒子系统
function createParticleSystem() {
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < particleCount; i++) {
        // 设置每个粒子的初始位置（将在翻转时使用）
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        
        // 设置每个粒子的颜色（金色到黄色的随机色）
        color.setHSL(0.12, 0.8, Math.random() * 0.3 + 0.7);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    particles = new THREE.Points(geometry, particleMaterial);
    particles.visible = false; // 初始不可见
    scene.add(particles);
}

// 更新粒子效果
function updateParticles() {
    if (!particles || !particles.visible) return;
    
    const positions = particles.geometry.attributes.position;
    const count = positions.count;
    
    // 速度衰减
    const dampingFactor = 0.98;
    
    for (let i = 0; i < count; i++) {
        // 读取当前位置
        let x = positions.getX(i);
        let y = positions.getY(i);
        let z = positions.getZ(i);
        
        // 应用重力和阻力
        particles.userData.velocities[i].y -= 0.01; // 重力
        particles.userData.velocities[i].multiplyScalar(dampingFactor); // 阻力
        
        // 更新位置
        x += particles.userData.velocities[i].x;
        y += particles.userData.velocities[i].y;
        z += particles.userData.velocities[i].z;
        
        // 更新粒子位置
        positions.setXYZ(i, x, y, z);
    }
    
    positions.needsUpdate = true;
    
    // 如果所有粒子都落到地面以下，则隐藏粒子系统
    let allBelowGround = true;
    for (let i = 0; i < count; i++) {
        if (positions.getY(i) > -3) {
            allBelowGround = false;
            break;
        }
    }
    
    if (allBelowGround) {
        particles.visible = false;
    }
}

// 处理点击事件
function onMouseClick(event) {
    // 计算鼠标在归一化设备坐标中的位置
    // (-1 到 +1 区间)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 更新射线投射器
    raycaster.setFromCamera(mouse, camera);
    
    // 计算物体和射线的焦点
    const intersects = raycaster.intersectObject(coin, true);
    
    // 如果点击了硬币
    if (intersects.length > 0 && !isFlipping) {
        flipCoin();
    }
}

// 翻转硬币
function flipCoin() {
    if (coinPhysics && !isFlipping) {
        isFlipping = true;
        infoElement.textContent = "硬币正在翻转中...";
        
        // 播放翻转声音
        audioManager.play('flip');
        
        // 触发硬币物理翻转
        const result = coinPhysics.flipCoin();
        
        // 显示粒子效果
        showFlipParticles();
        
        // 等待硬币停止翻转
        const checkFlipEnd = setInterval(() => {
            if (!coinPhysics.isInMotion()) {
                clearInterval(checkFlipEnd);
                isFlipping = false;
                infoElement.textContent = result === 'heads' ? '结果: 正面!' : '结果: 反面!';
                
                // 播放落地声音
                audioManager.play('land');
                
                // 显示落地粒子效果
                showLandingParticles();
                
                // 如果是正面，播放胜利声音
                if (result === 'heads') {
                    setTimeout(() => audioManager.play('win'), 500);
                }
            }
        }, 100);
    }
}

// 显示翻转粒子效果
function showFlipParticles() {
    if (!particles) return;
    
    const positions = particles.geometry.attributes.position;
    const count = positions.count;
    
    // 初始化速度数组
    particles.userData = { velocities: [] };
    
    for (let i = 0; i < count; i++) {
        // 设置初始位置（在硬币位置附近）
        const offsetX = (Math.random() - 0.5) * 0.5;
        const offsetY = (Math.random() - 0.5) * 0.5;
        const offsetZ = (Math.random() - 0.5) * 0.5;
        
        positions.setXYZ(i, 
            coin.position.x + offsetX, 
            coin.position.y + offsetY, 
            coin.position.z + offsetZ);
        
        // 设置随机速度
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random()) * 0.1,
            (Math.random() - 0.5) * 0.05
        );
        
        particles.userData.velocities.push(velocity);
    }
    
    positions.needsUpdate = true;
    particles.visible = true;
}

// 显示落地粒子效果
function showLandingParticles() {
    if (!particles) return;
    
    const positions = particles.geometry.attributes.position;
    const count = positions.count;
    
    // 初始化速度数组
    particles.userData = { velocities: [] };
    
    for (let i = 0; i < count; i++) {
        // 设置初始位置（在硬币落地位置附近）
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        
        positions.setXYZ(i, 
            coin.position.x + Math.cos(angle) * radius, 
            -3, // 地板高度
            coin.position.z + Math.sin(angle) * radius);
        
        // 设置向上的速度
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.1
        );
        
        particles.userData.velocities.push(velocity);
    }
    
    positions.needsUpdate = true;
    particles.visible = true;
}

// 处理窗口大小变化
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新硬币物理
    if (coinPhysics) {
        coinPhysics.update();
    }
    
    // 更新粒子系统
    updateParticles();
    
    // 更新控制器
    if (controls) {
        controls.update();
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
