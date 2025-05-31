// 物理相关的函数
// 物理常量
export const gravity = 0.2;
export const friction = 0.98;
export const restitution = 0.7; // Bounciness
export const coinSize = 50; // pixels, matching CSS

// 初始化物理系统
export function initPhysics() {
    // 可以在这里初始化物理系统参数
    console.log("Physics system initialized");
}

// 检查两个矩形是否重叠（碰撞检测）
export function isOverlapping(rect1, rect2) {
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

// 检查硬币和钉子之间的碰撞
export function checkPinCollisions(coin) {
    const pins = document.querySelectorAll('.pin');
    const coinElement = coin.element;
    const coinRect = coinElement.getBoundingClientRect();
    
    pins.forEach(pin => {
        const pinRect = pin.getBoundingClientRect();
        
        // Check collision
        if (isOverlapping(coinRect, pinRect)) {
            // Calculate bounce direction
            const coinCenterX = coinRect.left + coinRect.width / 2;
            const pinCenterX = pinRect.left + pinRect.width / 2;
            
            // 进一步减小水平反弹力度，使反弹更自然
            if (coinCenterX < pinCenterX) {
                // Hit from left, bounce left with reduced force
                coin.vx = -Math.abs(coin.vx) * 0.4 - Math.random() * 0.15;
            } else {
                // Hit from right, bounce right with reduced force
                coin.vx = Math.abs(coin.vx) * 0.4 + Math.random() * 0.15;
            }
            
            // 保持较强的垂直方向速度，确保硬币能够更顺畅地下落
            coin.vy = Math.max(coin.vy * 0.9, 0.8);
            
            // Visual feedback - flash the pin
            pin.style.boxShadow = "0 0 10px white";
            setTimeout(() => {
                pin.style.boxShadow = "";
            }, 100);
        }
    });
}
