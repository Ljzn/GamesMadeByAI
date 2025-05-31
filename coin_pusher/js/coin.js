// 硬币相关的函数
import { isOverlapping, checkPinCollisions } from './physics.js';

// Create SVG coin graphic
export function createCoinSVG(value) {
    // Random gold shade
    const goldBase = Math.floor(Math.random() * 20) + 215; // 215-235
    const goldShade = `rgb(${goldBase}, ${goldBase - 40}, 0)`;
    const shine = `rgb(${Math.min(goldBase + 20, 255)}, ${Math.min(goldBase - 20, 255)}, 80)`;
    
    return `
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <!-- Coin base -->
            <circle cx="25" cy="25" r="23" fill="${goldShade}" stroke="#aa8800" stroke-width="2"/>
            
            <!-- Shine effect -->
            <ellipse cx="18" cy="18" rx="10" ry="8" fill="${shine}" opacity="0.6" />
            
            <!-- Edge detail -->
            <circle cx="25" cy="25" r="21" fill="none" stroke="#dd9900" stroke-width="1" />
            <circle cx="25" cy="25" r="19" fill="none" stroke="#aa7700" stroke-width="0.5" opacity="0.6" />
            
            <!-- Coin value -->
            <text x="25" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#aa7700">${value}</text>
        </svg>
    `;
}

// 更新硬币计数显示
export function updateCoinCounter() {
    const visibleCoins = window.coinsContainer.children.length;
    const totalCoins = visibleCoins + window.hiddenCoinCount;
    
    // 创建或获取计数器元素
    let counterEl = document.querySelector('.coin-count');
    if (!counterEl) {
        counterEl = document.createElement('div');
        counterEl.className = 'coin-count';
        document.querySelector('.coin-basket h3').appendChild(counterEl);
    }
    
    // 如果有隐藏硬币，显示计数器
    if (window.hiddenCoinCount > 0) {
        counterEl.style.display = 'block';
        counterEl.textContent = `+${window.hiddenCoinCount}`;
    } else {
        counterEl.style.display = 'none';
    }
}

// Add coins to the basket
export function addCoins(numCoins) {
    for (let i = 0; i < numCoins; i++) {
        // 检查是否已达到最大显示硬币数量 (9个)
        if (window.coinsContainer.children.length >= 9) {
            window.hiddenCoinCount++;
            updateCoinCounter();
            continue;
        }
        
        const coin = document.createElement('div');
        coin.className = 'coin';
        
        // 所有硬币面值统一为1
        const value = 1;
        coin.dataset.value = value;
        
        // Add coin SVG
        coin.innerHTML = createCoinSVG(value);
        
        // Make coin draggable (now also handles click detection)
        makeCoinDraggable(coin);
        
        // Add to basket
        window.coinsContainer.appendChild(coin);
    }
}

// Add a coin to the platform
export function addCoinToPlatform(x, y, value) {
    // Add to level 1 by default
    const platformLevel1 = document.querySelector('.platform-level-1');
    
    const coin = document.createElement('div');
    coin.className = 'coin platform-coin';
    coin.dataset.value = value;
    coin.style.left = `${x}%`;
    coin.style.top = `${y}px`;
    coin.innerHTML = createCoinSVG(value);
    platformLevel1.appendChild(coin);
    
    // Add to physics objects array
    window.platformCoins.push({
        element: coin,
        x: x,
        y: y,
        vx: Math.random() * 2 - 1, // Small random initial velocity
        vy: 0,
        value: parseInt(value),
        width: window.coinSize,
        height: window.coinSize,
        rotation: Math.random() * 360,
        scored: false,
        level: 1 // Start on level 1
    });
    
    return coin;
}

// Make a coin draggable
export function makeCoinDraggable(coin) {
    coin.addEventListener('mousedown', startDrag);
    coin.addEventListener('touchstart', startDrag, { passive: false });
    
    function startDrag(e) {
        e.preventDefault();
        
        // Get touch or mouse position
        const event = e.touches ? e.touches[0] : e;
        const initialX = event.clientX;
        const initialY = event.clientY;
        
        // Track initial position and time for click detection
        const startTime = Date.now();
        
        // Reset movement flag
        coin.wasMoved = false;
        
        // Get coin position
        const rect = coin.getBoundingClientRect();
        const offsetX = initialX - rect.left;
        const offsetY = initialY - rect.top;
        
        // Mark as dragging
        coin.classList.add('dragging');
        window.currentDragCoin = coin;
        
        // Set initial position
        coin.style.position = 'fixed';
        coin.style.left = `${rect.left}px`;
        coin.style.top = `${rect.top}px`;
        coin.style.zIndex = '1000';
        
        // Add move and end event listeners
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);
        
        function dragMove(e) {
            e.preventDefault();
            
            const event = e.touches ? e.touches[0] : e;
            const clientX = event.clientX;
            const clientY = event.clientY;
            
            // Mark this coin as having been moved
            coin.wasMoved = true;
            
            // Update position
            coin.style.left = `${clientX - offsetX}px`;
            coin.style.top = `${clientY - offsetY}px`;
            
            // Check if over coin slot
            const slotRect = window.coinSlot.getBoundingClientRect();
            const coinRect = coin.getBoundingClientRect();
            
            if (isOverlapping(coinRect, slotRect)) {
                window.slotIndicator.classList.add('active');
            } else {
                window.slotIndicator.classList.remove('active');
            }
        }
        
        function dragEnd(e) {
            // Remove event listeners
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchend', dragEnd);
            
            // Check if coin is dropped into slot
            const slotRect = window.coinSlot.getBoundingClientRect();
            const coinRect = coin.getBoundingClientRect();
            
            // Check if this was a genuine click (short duration, minimal movement)
            const endTime = Date.now();
            const wasBriefInteraction = (endTime - startTime) < 200;
            
            if (isOverlapping(coinRect, slotRect)) {
                // Drop coin into slot
                insertCoin(coin);
            } else if (wasBriefInteraction && !coin.wasMoved) {
                // This was a click, not a drag - also insert coin
                insertCoin(coin);
            } else {
                // Reset position to basket
                coin.style.position = '';
                coin.style.left = '';
                coin.style.top = '';
                coin.style.zIndex = '';
            }
            
            // Reset state
            coin.classList.remove('dragging');
            window.currentDragCoin = null;
            window.slotIndicator.classList.remove('active');
        }
    }
}

// Insert coin into machine
export function insertCoin(coin) {
    const value = coin.dataset.value;
    
    // 确保我们能访问到硬币元素
    if (!coin || !coin.parentNode) {
        console.warn("Attempted to insert an invalid coin");
        return;
    }
    
    // 处理硬币篮子逻辑
    if (window.hiddenCoinCount > 0) {
        // 如果有隐藏硬币，减少隐藏计数而不是删除可见硬币
        window.hiddenCoinCount--;
        updateCoinCounter();
    } else {
        // 移除可见硬币
        coin.remove();
    }
    
    // Flash slot indicator
    window.slotIndicator.classList.add('active');
    setTimeout(() => {
        window.slotIndicator.classList.remove('active');
    }, 300);
    
    // 获取屏幕区域的相关信息
    const screen = document.querySelector('.screen');
    const screenRect = screen.getBoundingClientRect();
    const platformRect = window.platformElement.getBoundingClientRect();
    
    // 计算硬币在屏幕顶部的起始位置
    // 改为从屏幕区域的顶部开始，而不是平台顶部
    const randomX = 30 + Math.random() * 40; // Drop between 30-70% width
    
    // 创建一个特殊的动画硬币，先出现在屏幕上方
    const animCoin = document.createElement('div');
    animCoin.className = 'coin platform-coin';
    animCoin.dataset.value = value;
    animCoin.style.left = `${randomX}%`;
    animCoin.style.top = `-${window.coinSize}px`; // 开始于屏幕外部
    animCoin.innerHTML = createCoinSVG(value);
    screen.appendChild(animCoin);
    
    // 创建物理属性用于下落模拟
    const screenCoin = {
        element: animCoin,
        x: randomX,
        y: -window.coinSize, // 开始于屏幕外部
        vx: Math.random() * 1 - 0.5, // 轻微的初始水平速度
        vy: 2, // 初始下落速度
        width: window.coinSize,
        height: window.coinSize,
        value: parseInt(value)
    };
    
    // 让硬币落下并通过检测器
    const fallInterval = setInterval(() => {
        // 应用物理
        screenCoin.vy += window.gravity * 0.5;
        screenCoin.y += screenCoin.vy;
        screenCoin.x += screenCoin.vx;
        
        // 检测与钉子的碰撞
        const coinRect = animCoin.getBoundingClientRect();
        document.querySelectorAll('.pin').forEach(pin => {
            const pinRect = pin.getBoundingClientRect();
            if (isOverlapping(coinRect, pinRect)) {
                // 计算反弹方向
                const coinCenterX = coinRect.left + coinRect.width / 2;
                const pinCenterX = pinRect.left + pinRect.width / 2;
                
                if (coinCenterX < pinCenterX) {
                    // 从左侧碰撞，向左反弹，力度更自然
                    screenCoin.vx = -Math.abs(screenCoin.vx) * 0.4 - 0.1;
                } else {
                    // 从右侧碰撞，向右反弹，力度更自然
                    screenCoin.vx = Math.abs(screenCoin.vx) * 0.4 + 0.1;
                }
                
                // 碰撞后增加下落速度，让物理效果更自然
                screenCoin.vy = Math.max(screenCoin.vy * 0.95, 1.2);
                
                // 视觉反馈 - 闪烁钉子
                pin.style.boxShadow = "0 0 10px white";
                setTimeout(() => {
                    pin.style.boxShadow = "";
                }, 100);
            }
        });
        
        // 检查左右边界
        if (screenCoin.x < 0) {
            screenCoin.x = 0;
            screenCoin.vx *= -0.8;
        } else if (screenCoin.x > 100) {
            screenCoin.x = 100;
            screenCoin.vx *= -0.8;
        }
        
        // 更新位置
        animCoin.style.left = `${screenCoin.x}%`;
        animCoin.style.top = `${screenCoin.y}px`;
        
        // 如果硬币落到屏幕底部
        if (screenCoin.y > screenRect.height) {
            clearInterval(fallInterval);
            animCoin.remove();
            
            // 硬币从屏幕底部过渡到平台顶部
            addCoinToPlatform(screenCoin.x, 0, value);
        }
    }, 20);
}

// 创建奖励硬币掉落效果
export function createRewardCoins(value) {
    // 创建奖励硬币容器
    let rewardCoinsContainer = document.querySelector('.reward-coins');
    if (!rewardCoinsContainer) {
        rewardCoinsContainer = document.createElement('div');
        rewardCoinsContainer.className = 'reward-coins';
        document.querySelector('.screen').appendChild(rewardCoinsContainer);
    }
    
    // 清除旧硬币
    rewardCoinsContainer.innerHTML = '';
    
    // 根据奖励值决定硬币数量
    const coinCount = value <= 10 ? value : Math.min(20, Math.floor(value / 10));
    
    // 创建掉落的硬币
    for (let i = 0; i < coinCount; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'reward-coin';
            coin.style.left = `${Math.random() * 90 + 5}%`;
            
            // 使用SVG硬币图形
            coin.innerHTML = createCoinSVG(1);
            
            rewardCoinsContainer.appendChild(coin);
            
            // 移除已完成动画的硬币
            setTimeout(() => {
                coin.remove();
            }, 1000);
        }, i * 100); // 硬币依次掉落
    }
}
