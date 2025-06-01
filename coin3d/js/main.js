// 使用全局THREE对象和其他全局对象，不再使用import

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
    
    // 添加轨道控制器，使硬币可以通过鼠标旋转查看
    controls = new THREE.OrbitControls(camera, renderer.domElement);
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
    light.shadow.camera.far = 50;
    scene.add(light);
    
    // 添加额外的点光源，使硬币有更好的反光效果
    const frontLight = new THREE.PointLight(0xffffff, 1);
    frontLight.position.set(0, 0, 5);
    scene.add(frontLight);
    
    const backLight = new THREE.PointLight(0xffffff, 0.5);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);
}

// 加载字体并创建硬币
function loadFontAndCreateCoin() {
    // 加载字体
    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(loadedFont) {
        font = loadedFont;
        createCoin();
    });
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

// 创建硬币
function createCoin() {
    // 硬币几何体 - 使用圆柱体
    const radius = 2;
    const height = 0.2;
    const segments = 64;
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    
    // 创建金色材质，使用更复杂的材质设置
    const goldColor = new THREE.Color(0xFFD700);
    const textureLoader = new THREE.TextureLoader();
    
    // 创建凹凸贴图，模拟硬币表面的微小凹凸
    const bumpTexture = createCoinBumpTexture();
    
    coinMaterial = new THREE.MeshStandardMaterial({
        color: goldColor,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x222200,
        bumpMap: bumpTexture,
        bumpScale: 0.02,
    });
    
    // 创建硬币网格
    coin = new THREE.Mesh(geometry, coinMaterial);
    coin.castShadow = true;
    coin.receiveShadow = true;
    
    // 旋转硬币使其平放
    coin.rotation.x = Math.PI / 2;
    
    // 添加到场景
    scene.add(coin);
    
    // 初始化硬币物理系统
    coinPhysics = new CoinPhysics(coin);
    
    // 添加硬币的详细特征
    addCoinDetails();
}

// 创建硬币凹凸贴图
function createCoinBumpTexture() {
    // 创建一个画布来绘制凹凸贴图
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    
    // 填充背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    
    // 绘制同心圆，模拟硬币的凹凸效果
    ctx.strokeStyle = '#FFF';
    const maxRings = 15;
    for (let i = 0; i < maxRings; i++) {
        const radius = size * 0.45 * (1 - i / maxRings);
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.arc(size/2, size/2, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 添加随机噪点，增强真实感
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 将画布转换为纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// 添加硬币的细节
function addCoinDetails() {
    if (!font) return;
    
    // 正面：添加数字 "1"
    const textGeometry = new THREE.TextGeometry('1', {
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
    
    // 添加硬币边缘的纹理
    addCoinEdgeDetails();
}

// 添加硬币背面的设计
function addCoinBackDesign() {
    // 创建五角星作为硬币背面的设计
    const starShape = new THREE.Shape();
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    const spikes = 5;
    
    // 创建五角星的形状
    for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / spikes) * Math.PI;
        const x = radius * Math.sin(angle);
        const y = radius * Math.cos(angle);
        
        if (i === 0) {
            starShape.moveTo(x, y);
        } else {
            starShape.lineTo(x, y);
        }
    }
    starShape.closePath();
    
    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3
    };
    
    const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.9,
        roughness: 0.1,
    });
    
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.position.y = -0.15;
    starMesh.rotation.x = Math.PI;
    starMesh.castShadow = true;
    
    coin.add(starMesh);
}

// 添加硬币边缘的细节
function addCoinEdgeDetails() {
    const edgeGeometry = new THREE.CylinderGeometry(2, 2, 0.2, 64, 8, true);
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.8,
        roughness: 0.4,
    });
    
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    
    // 添加边缘纹理
    const ridgeCount = 80;
    for (let i = 0; i < ridgeCount; i++) {
        const angle = (i / ridgeCount) * Math.PI * 2;
        const ridgeGeometry = new THREE.BoxGeometry(0.05, 0.22, 0.1);
        const ridge = new THREE.Mesh(ridgeGeometry, edgeMaterial);
        
        ridge.position.x = Math.cos(angle) * 2;
        ridge.position.z = Math.sin(angle) * 2;
        ridge.rotation.y = angle;
        
        edge.add(ridge);
    }
    
    coin.add(edge);
}

// 窗口大小调整处理
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 鼠标点击事件处理
function onMouseClick(event) {
    // 如果硬币正在翻转中，则不响应点击
    if (isFlipping) return;
    
    // 计算鼠标在归一化设备坐标中的位置
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 从相机位置沿着鼠标点击方向发射射线
    raycaster.setFromCamera(mouse, camera);
    
    // 检查射线是否与硬币相交
    const intersects = raycaster.intersectObject(coin);
    
    if (intersects.length > 0) {
        // 点击到了硬币，执行翻转
        flipCoin();
    }
}

// 创建粒子效果
function createParticles(position, color, count = 30) {
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.2,
        transparent: true,
        opacity: 0.8
    });
    
    const particlePositions = [];
    const particleVelocities = [];
    
    // 创建粒子初始位置和速度
    for (let i = 0; i < count; i++) {
        // 随机位置（围绕指定位置）
        particlePositions.push(
            position.x + (Math.random() - 0.5) * 0.5,
            position.y + (Math.random() - 0.5) * 0.5,
            position.z + (Math.random() - 0.5) * 0.5
        );
        
        // 随机速度（向各方向散开）
        particleVelocities.push(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1
        );
    }
    
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.velocities = particleVelocities;
    particleSystem.life = 2.0; // 生命周期，秒
    
    scene.add(particleSystem);
    
    // 将粒子系统添加到跟踪数组中
    if (!particles) particles = [];
    particles.push(particleSystem);
    
    return particleSystem;
}

// 翻转硬币
function flipCoin() {
    if (coinPhysics && !isFlipping) {
        isFlipping = true;
        
        // 播放翻转音效
        audioManager.play('flip');
        
        // 禁用轨道控制器，以便集中注意力在翻转上
        controls.enabled = false;
        
        // 执行物理翻转
        const result = coinPhysics.flipCoin();
        
        // 创建翻转特效
        createParticles(coin.position, 0xFFD700, 50);
        
        // 更新信息显示
        infoElement.textContent = "硬币正在翻转...";
        
        // 等待翻转结束
        const checkFlipEnd = setInterval(() => {
            if (!coinPhysics.isInMotion()) {
                clearInterval(checkFlipEnd);
                isFlipping = false;
                
                // 播放落地音效
                audioManager.play('land');
                
                // 显示结果
                infoElement.textContent = `结果: ${result === 'heads' ? '正面' : '反面'} - 点击硬币再次翻转`;
                
                // 创建结果特效
                createParticles(
                    new THREE.Vector3(coin.position.x, -2.8, coin.position.z), 
                    result === 'heads' ? 0x00FF00 : 0xFF9900, 
                    30
                );
                
                // 如果是正面，播放胜利音效
                if (result === 'heads') {
                    setTimeout(() => {
                        audioManager.play('win');
                    }, 300);
                }
                
                // 重新启用轨道控制器
                controls.enabled = true;
            }
        }, 100);
    }
}

// 更新粒子系统
function updateParticles() {
    if (!particles || particles.length === 0) return;
    
    const particlesToRemove = [];
    
    // 更新每个粒子系统
    for (let i = 0; i < particles.length; i++) {
        const particleSystem = particles[i];
        
        // 减少生命周期
        particleSystem.life -= 0.016; // 大约60FPS的delta time
        
        // 如果生命周期结束，标记为移除
        if (particleSystem.life <= 0) {
            particlesToRemove.push(i);
            scene.remove(particleSystem);
            continue;
        }
        
        // 更新粒子位置
        const positions = particleSystem.geometry.attributes.position.array;
        
        for (let j = 0; j < positions.length; j += 3) {
            const vIndex = j / 3;
            const vx = particleSystem.velocities[vIndex * 3];
            const vy = particleSystem.velocities[vIndex * 3 + 1];
            const vz = particleSystem.velocities[vIndex * 3 + 2];
            
            positions[j] += vx;
            positions[j + 1] += vy;
            positions[j + 2] += vz;
            
            // 应用轻微重力
            particleSystem.velocities[vIndex * 3 + 1] -= 0.002;
        }
        
        // 降低不透明度
        particleSystem.material.opacity = Math.max(0, particleSystem.life / 2.0);
        
        // 更新GPU上的顶点数据
        particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    // 从数组中移除已完成的粒子系统
    if (particlesToRemove.length > 0) {
        for (let i = particlesToRemove.length - 1; i >= 0; i--) {
            particles.splice(particlesToRemove[i], 1);
        }
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新硬币物理状态
    if (coinPhysics) {
        coinPhysics.update();
    }
    
    // 更新粒子系统
    updateParticles();
    
    // 更新控制器（仅在非翻转状态下）
    if (!isFlipping) {
        controls.update();
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // 如果DOM已加载，直接初始化
    init();
}
