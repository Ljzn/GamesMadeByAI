// 检测器和钉子相关功能
import { startRouletteSpin } from './wheel.js';
import { isOverlapping } from './physics.js';

// 更新检测器位置
export function updateDetector() {
    // 检测器和推动器的动画属性
    const detectorSpeed = 0.7; // 降低速度，使检测器移动得更慢
    const detectorMaxPosition = 90; // percentage of screen width
    
    // Update position
    window.detectorPosition += detectorSpeed * window.detectorDirection;
    
    // Reverse direction if hitting edges
    if (window.detectorPosition >= detectorMaxPosition) {
        window.detectorDirection = -1;
    } else if (window.detectorPosition <= 0) {
        window.detectorDirection = 1;
    }
    
    // Apply position
    window.detectorElement.style.left = `${window.detectorPosition}%`;
    
    // 如果转盘正在旋转，不检测碰撞
    if (window.isRouletteSpinning || window.isJackpotSpinning) return;
    
    // Check for coin collisions with detector
    const detectorRect = window.detectorElement.getBoundingClientRect();
    const screenCoins = document.querySelectorAll('.screen .coin');
    
    // 检测屏幕上掉落的硬币
    screenCoins.forEach(coinElement => {
        const coinRect = coinElement.getBoundingClientRect();
        // 判断硬币下边缘是否接触到检测器
        if (coinRect.bottom >= detectorRect.top && 
            coinRect.left < detectorRect.right && 
            coinRect.right > detectorRect.left &&
            !coinElement.dataset.scored) {
            
            // 标记硬币已经得分
            coinElement.dataset.scored = "true";
            
            // 闪烁检测器
            flashDetector();
            
            // 添加硬币收集动画效果
            coinElement.classList.add('coin-collected');
            
            // 触发转盘抽奖而不是直接加分
            setTimeout(() => {
                coinElement.remove();
                startRouletteSpin();
            }, 300);
        }
    });
    
    // 同时检查平台上的硬币
    window.platformCoins.forEach(coin => {
        if (coin.scored) return;
        
        const coinElement = coin.element;
        const coinRect = coinElement.getBoundingClientRect();
        
        if (isOverlapping(coinRect, detectorRect)) {
            // 硬币击中检测器
            coin.scored = true;
            
            // 闪烁检测器
            flashDetector();
            
            // 添加视觉效果
            coinElement.style.opacity = '0.6';
            coinElement.classList.add('coin-collected');
            
            setTimeout(() => {
                // 移除硬币
                window.platformCoins = window.platformCoins.filter(c => c !== coin);
                coinElement.remove();
                
                // 触发转盘抽奖
                startRouletteSpin();
            }, 300);
        }
    });
}

// isOverlapping 已经从 physics.js 导入，这里不需要重新定义

// 更新推动器动画
export function updatePusher() {
    const pusherSpeed = 0.5;
    const pusherMaxPosition = 5; // percentage of platform depth
    
    // Update position
    window.pusherPosition += pusherSpeed * window.pusherDirection;
    
    // Reverse direction if hitting limits
    if (window.pusherPosition >= pusherMaxPosition) {
        window.pusherDirection = -1;
    } else if (window.pusherPosition <= 0) {
        window.pusherDirection = 1;
    }
    
    // Apply position - simulating with a shadow as it moves
    window.pusherElement.style.boxShadow = `0 ${3 + window.pusherPosition}px 5px rgba(0, 0, 0, 0.5)`;
    
    // Apply force to coins that are near the pusher
    const pusherRect = window.pusherElement.getBoundingClientRect();
    
    window.platformCoins.forEach(coin => {
        const coinRect = coin.element.getBoundingClientRect();
        
        // If coin is near the pusher's front edge
        if (coinRect.top < pusherRect.bottom + 10 && 
            coinRect.top > pusherRect.bottom - 10) {
            
            // Apply a small push force
            if (window.pusherDirection === 1) { // Only push when moving forward
                coin.vx += 0.5;
            }
        }
    });
}

// 创建钉子
export function createPins() {
    const pinsContainer = document.querySelector('.pins-container');
    const numPinsPerRow = 5; // 进一步减少每行的钉子数量，提高通过率
    const numRows = 2;
    
    // Clear any existing pins
    pinsContainer.innerHTML = '';
    
    // Create pins in a grid pattern
    for (let row = 0; row < numRows; row++) {
        for (let i = 0; i < numPinsPerRow; i++) {
            const pin = document.createElement('div');
            pin.className = 'pin';
            
            // Offset every other row for a more challenging pattern
            const offsetX = row % 2 === 0 ? 0 : 40 / (numPinsPerRow - 1) / 2;
            // 进一步增加间距，使硬币能更容易通过
            const xPos = 10 + offsetX + i * (80 / (numPinsPerRow - 1)); 
            const yPos = row * 55; // 增加垂直间距
            
            pin.style.left = `${xPos}%`;
            pin.style.top = `${yPos}px`;
            
            pinsContainer.appendChild(pin);
        }
    }
}

// 强化检测器闪烁效果
export function flashDetector() {
    // Add flashing class for CSS transition
    window.detectorElement.classList.add('flashing');
    
    // Create a pulse effect
    let pulseCount = 0;
    const maxPulses = 3;
    const pulseInterval = setInterval(() => {
        pulseCount++;
        if (pulseCount >= maxPulses) {
            clearInterval(pulseInterval);
            window.detectorElement.classList.remove('flashing');
        } else {
            window.detectorElement.classList.toggle('flashing');
        }
    }, 150);
}
