// 平台相关功能
import { checkPinCollisions, gravity, friction, restitution } from './physics.js';
import { addCoins, createCoinSVG } from './coin.js';

// 初始化两层平台机制
export function initPlatformLevels() {
    const platformLevel1 = document.querySelector('.platform-level-1');
    
    // 启动平台收缩周期
    startPlatformCycle();
}

// 平台收缩周期
function startPlatformCycle() {
    const platformLevel1 = document.querySelector('.platform-level-1');
    const cycleTime = 15000; // 15 seconds per complete cycle
    const retractedTime = 3000; // Platform stays retracted for 3 seconds
    
    window.platformRetractTimer = setInterval(() => {
        // Retract the platform
        platformLevel1.classList.add('retracted');
        window.isPlatformRetracting = true;
        
        // Extend the platform after a delay
        setTimeout(() => {
            platformLevel1.classList.remove('retracted');
            window.isPlatformRetracting = false;
        }, retractedTime);
    }, cycleTime);
}

// 检查硬币是否应该从一层转移到二层
export function checkCoinTransfer() {
    // Only check during platform retraction
    if (!window.isPlatformRetracting) return;
    
    const platformLevel1 = document.querySelector('.platform-level-1');
    const platformLevel2 = document.querySelector('.platform-level-2');
    const platformRect = window.platformElement.getBoundingClientRect();
    
    // Check all platform coins
    for (let i = window.platformCoins.length - 1; i >= 0; i--) {
        const coin = window.platformCoins[i];
        const coinRect = coin.element.getBoundingClientRect();
        
        // If coin is still on level 1 but platform is retracting
        if (coin.level === 1) {
            // Calculate if coin should fall to level 2
            // This happens when platform 1 has retracted past the coin's position
            const platformPos = platformLevel1.getBoundingClientRect();
            
            if (coinRect.left > platformPos.right || coinRect.right < platformPos.left) {
                // Coin falls to level 2
                coin.level = 2;
                coin.vy += 2; // Add some falling velocity
                
                // Move the coin element to level 2
                coin.element.remove();
                platformLevel2.appendChild(coin.element);
            }
        }
    }
}

// 更新所有平台上硬币的物理状态
export function updateCoins() {
    const platformRect = window.platformElement.getBoundingClientRect();
    const platformBottom = platformRect.height;
    const platformLevel1 = document.querySelector('.platform-level-1');
    const platformLevel2 = document.querySelector('.platform-level-2');
    
    // Get boundaries for each level
    const level1Rect = platformLevel1.getBoundingClientRect();
    const level2Rect = platformLevel2.getBoundingClientRect();
    
    // Calculate level heights relative to platform
    const level1Height = level1Rect.height / platformRect.height * 100;
    const level2Height = level2Rect.height / platformRect.height * 100;
    
    // Check for coins that should transfer between levels
    checkCoinTransfer();
    
    // Process each coin
    for (let i = window.platformCoins.length - 1; i >= 0; i--) {
        const coin = window.platformCoins[i];
        
        // Apply gravity
        coin.vy += gravity;
        
        // Apply physics
        coin.x += coin.vx * 0.1; // Scale down to percentage movement
        coin.y += coin.vy;
        
        // Apply friction
        coin.vx *= friction;
        coin.vy *= friction;
        
        // Check boundaries based on coin's current level
        if (coin.level === 1) {
            // Bottom boundary for level 1
            const level1Bottom = level1Height;
            if (coin.y > level1Bottom - coin.height) {
                // Only bounce if platform 1 is not retracting
                if (!window.isPlatformRetracting) {
                    coin.y = level1Bottom - coin.height;
                    coin.vy *= -restitution; // Bounce
                }
            }
        } else if (coin.level === 2) {
            // Bottom boundary for level 2
            if (coin.y > platformBottom - coin.height) {
                coin.y = platformBottom - coin.height;
                coin.vy *= -restitution; // Bounce
            }
        }
        
        // Left and right boundaries (same for both levels)
        if (coin.x < 0) {
            coin.x = 0;
            coin.vx *= -restitution;
        } else if (coin.x > 100 - (coin.width / platformRect.width * 100)) {
            coin.x = 100 - (coin.width / platformRect.width * 100);
            coin.vx *= -restitution;
        }
        
        // Check if coin fell out of platform (only score when falling from level 2)
        if ((coin.y > platformBottom && coin.level === 2) || 
            (coin.y > level1Height && coin.level === 1 && window.isPlatformRetracting)) {
            
            if (coin.level === 1) {
                // If falling from level 1 during retraction, move to level 2
                coin.level = 2;
                coin.y = 0; // Reset y position to top of level 2
                
                // Move coin element from level 1 to level 2
                coin.element.remove();
                platformLevel2.appendChild(coin.element);
            } else {
                // If falling from level 2, remove from platform and score
                window.platformCoins.splice(i, 1);
                
                // Award points if not already scored
                if (!coin.scored) {
                    // 创建硬币掉落到收集槽的动画效果
                    const dropRect = document.querySelector('.drop-zone').getBoundingClientRect();
                    const coinRect = coin.element.getBoundingClientRect();
                    
                    // 转换硬币为固定位置，使动画可以从当前位置开始
                    coin.element.style.position = 'fixed';
                    coin.element.style.left = `${coinRect.left}px`;
                    coin.element.style.top = `${coinRect.top}px`;
                    coin.element.style.zIndex = '100';
                    document.body.appendChild(coin.element);
                    
                    // 添加收集动画类
                    coin.element.classList.add('coin-collected-drop');
                    
                    // 动画结束后移除元素
                    setTimeout(() => {
                        coin.element.remove();
                        
                        // 将硬币添加到篮子中并得分
                        window.increaseScore(coin.value);
                        addCoins(1);
                        
                        // 显示 "+1 硬币" 提示
                        const coinPopup = document.createElement('div');
                        coinPopup.className = 'coin-popup';
                        coinPopup.innerHTML = `<img src="data:image/svg+xml,${encodeURIComponent(createCoinSVG(1))}" width="20" height="20"> +1`;
                        coinPopup.style.position = 'fixed';
                        coinPopup.style.top = `${window.coinsContainer.getBoundingClientRect().top}px`;
                        coinPopup.style.left = `${window.coinsContainer.getBoundingClientRect().left + 50}px`;
                        document.body.appendChild(coinPopup);
                        
                        setTimeout(() => coinPopup.remove(), 1500);
                    }, 800);
                } else {
                    coin.element.remove();
                }
            }
            continue;
        }
        
        // Coin-to-coin collisions
        for (let j = 0; j < window.platformCoins.length; j++) {
            if (i === j) continue;
            
            const otherCoin = window.platformCoins[j];
            
            // Only process collisions between coins on the same level
            if (coin.level !== otherCoin.level) continue;
            
            // Simple distance-based collision detection
            const dx = (otherCoin.x - coin.x) / 100 * platformRect.width;
            const dy = otherCoin.y - coin.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < coin.width * 0.9) { // 90% of coin width for overlap
                // Calculate collision response
                const angle = Math.atan2(dy, dx);
                const overlap = coin.width - distance;
                
                // Move coins apart to prevent sticking
                const moveX = Math.cos(angle) * overlap * 0.5;
                const moveY = Math.sin(angle) * overlap * 0.5;
                
                // Convert moveX back to percentage
                const moveXPercent = (moveX / platformRect.width) * 100;
                
                // Apply position corrections
                if (j > i) { // Avoid double correction
                    // (实际位置修正在这里应该实现)
                }
                
                // Calculate velocity changes
                const power = 0.1;
                coin.vx -= Math.cos(angle) * power;
                coin.vy -= Math.sin(angle) * power;
                otherCoin.vx += Math.cos(angle) * power;
                otherCoin.vy += Math.sin(angle) * power;
            }
        }
        
        // Update coin position
        coin.element.style.left = `${coin.x}%`;
        coin.element.style.top = `${coin.y}px`;
        
        // Optional: Add rotation effect for more realism
        coin.rotation += coin.vx * 2;
        coin.element.style.transform = `rotateZ(${coin.rotation}deg)`;
        
        // Check collision with pins when in screen (for falling coins)
        if (coin.element.closest('.screen')) {
            checkPinCollisions(coin);
        }
    }
}
