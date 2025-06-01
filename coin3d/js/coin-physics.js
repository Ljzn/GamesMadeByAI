/* filepath: /Users/linjiezhang/AI/Games/coin3d/js/coin-physics.js */
// 硬币物理模拟
// 使用全局THREE对象而非导入

// 硬币物理学参数
const GRAVITY = 9.8; // m/s^2
const ROTATION_DAMPING = 0.95; // 旋转阻尼
const FLIP_FORCE = 10; // 硬币翻转力度

// 硬币物理状态类
class CoinPhysics {
    constructor(coinObject) {
        this.coin = coinObject;
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.isFlipping = false;
        this.floorY = -3; // 地板位置
        this.lastTime = Date.now() * 0.001; // 秒为单位
    }
    
    // 随机翻转硬币
    flipCoin() {
        // 只在硬币不在翻转中时才允许翻转
        if (!this.isFlipping) {
            // 随机决定翻转方向
            const xForce = Math.random() * 2 - 1; 
            const yForce = (Math.random() * 0.5) + 0.5; 
            
            // 设置角速度进行翻转
            this.angularVelocity.set(
                xForce * FLIP_FORCE, // x方向翻转
                yForce * FLIP_FORCE * 0.2, // y方向轻微旋转
                0 // z方向不翻转
            );
            
            // 保存翻转前的位置
            this.originalPosition = this.coin.position.clone();
            this.isFlipping = true;
            
            // 添加上升的初速度
            this.verticalVelocity = FLIP_FORCE * 0.3;
            
            // 计算这一次翻转的结果（正面或反面）
            this.flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
            
            // 返回翻转结果（以便外部使用）
            return this.flipResult;
        }
        return null;
    }
    
    // 更新硬币物理状态
    update() {
        const currentTime = Date.now() * 0.001;
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // 处理翻转中的硬币
        if (this.isFlipping) {
            // 应用重力
            this.verticalVelocity -= GRAVITY * deltaTime;
            this.coin.position.y += this.verticalVelocity * deltaTime;
            
            // 应用角速度
            this.coin.rotation.x += this.angularVelocity.x * deltaTime;
            this.coin.rotation.y += this.angularVelocity.y * deltaTime;
            
            // 应用旋转阻尼
            this.angularVelocity.multiplyScalar(ROTATION_DAMPING);
            
            // 检测与地面碰撞
            if (this.coin.position.y <= this.floorY) {
                this.coin.position.y = this.floorY;
                this.verticalVelocity *= -0.6; // 反弹，但有能量损失
                
                // 如果速度很小，则停止翻转
                if (Math.abs(this.verticalVelocity) < 0.5) {
                    this.verticalVelocity = 0;
                    this.isFlipping = false;
                    
                    // 根据翻转结果调整硬币的朝向
                    if (this.flipResult === 'heads') {
                        // 正面朝上 - 大约回到原来的旋转状态
                        this.coin.rotation.x = Math.PI / 2;
                    } else {
                        // 反面朝上 - 额外旋转180度
                        this.coin.rotation.x = -Math.PI / 2;
                    }
                }
            }
        } else {
            // 非翻转状态下的轻微摇动效果
            const time = Date.now() * 0.001;
            this.coin.rotation.y = Math.sin(time * 0.5) * 0.1;
        }
    }
    
    // 检查硬币是否仍在翻转
    isInMotion() {
        return this.isFlipping;
    }
}

// 将CoinPhysics添加到全局对象
window.CoinPhysics = CoinPhysics;
