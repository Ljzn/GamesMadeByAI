document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const platformElement = document.querySelector('.platform');
    const coinsContainer = document.querySelector('.coins-container');
    const detectorElement = document.querySelector('.detector');
    const coinSlot = document.querySelector('.coin-slot');
    const slotIndicator = document.querySelector('.slot-indicator');
    const scoreDisplay = document.getElementById('score');
    const addCoinsButton = document.getElementById('add-coins');
    const resetButton = document.getElementById('reset-game');
    const pusherElement = document.querySelector('.pusher');

    // Game state
    let score = 0;
    let platformCoins = [];
    let currentDragCoin = null;
    let detectorDirection = 1; // 1 = right, -1 = left
    let pusherDirection = -1; // 1 = forward, -1 = backward
    let detectorPosition = 0;
    let pusherPosition = 0;
    
    // Detector and pusher animation properties
    const detectorSpeed = 0.7; // 降低速度，使检测器移动得更慢
    const detectorMaxPosition = 90; // percentage of screen width
    const pusherSpeed = 0.5;
    const pusherMaxPosition = 5; // percentage of platform depth
    
    // Physics constants
    const gravity = 0.2;
    const friction = 0.98;
    const restitution = 0.7; // Bounciness
    const coinSize = 50; // pixels, matching CSS
    
    // Game boundaries
    const platformBounds = {
        width: 0,
        height: 0
    };

    // Initialize game
    function initGame() {
        // Add initial coins to basket
        addCoins(8);
        
        // Create pins above detector
        createPins();
        
        // Start animations
        requestAnimationFrame(gameLoop);
        
        // Add event listeners
        addCoinsButton.addEventListener('click', () => addCoins(3));
        resetButton.addEventListener('click', resetGame);
        
        // Update platform dimensions
        updatePlatformBounds();
        window.addEventListener('resize', updatePlatformBounds);
        
        // Initialize two-level platform mechanics
        initPlatformLevels();
    }

    function updatePlatformBounds() {
        const rect = platformElement.getBoundingClientRect();
        platformBounds.width = rect.width;
        platformBounds.height = rect.height;
    }
    
    // Create SVG coin graphic
    function createCoinSVG(value) {
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
    function updateCoinCounter() {
        const visibleCoins = coinsContainer.children.length;
        const totalCoins = visibleCoins + hiddenCoinCount;
        
        // 创建或获取计数器元素
        let counterEl = document.querySelector('.coin-count');
        if (!counterEl) {
            counterEl = document.createElement('div');
            counterEl.className = 'coin-count';
            document.querySelector('.coin-basket h3').appendChild(counterEl);
        }
        
        // 如果有隐藏硬币，显示计数器
        if (hiddenCoinCount > 0) {
            counterEl.style.display = 'block';
            counterEl.textContent = `+${hiddenCoinCount}`;
        } else {
            counterEl.style.display = 'none';
        }
    }
    
    // 跟踪隐藏的硬币数量
    let hiddenCoinCount = 0;
    
    // Add coins to the basket
    function addCoins(numCoins) {
        for (let i = 0; i < numCoins; i++) {
            // 检查是否已达到最大显示硬币数量 (9个)
            if (coinsContainer.children.length >= 9) {
                hiddenCoinCount++;
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
            
            // Make coin draggable
            makeCoinDraggable(coin);
            
            // 添加点击事件 - 点击硬币自动投入
            coin.addEventListener('click', () => {
                // 如果不是拖动操作，则自动投入硬币
                if (!currentDragCoin) {
                    insertCoin(coin);
                }
            });
            
            // Add to basket
            coinsContainer.appendChild(coin);
        }
    }

    // Add a coin to the platform
    function addCoinToPlatform(x, y, value) {
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
        platformCoins.push({
            element: coin,
            x: x,
            y: y,
            vx: Math.random() * 2 - 1, // Small random initial velocity
            vy: 0,
            value: parseInt(value),
            width: coinSize,
            height: coinSize,
            rotation: Math.random() * 360,
            scored: false,
            level: 1 // Start on level 1
        });
        
        return coin;
    }

    // Make a coin draggable
    function makeCoinDraggable(coin) {
        coin.addEventListener('mousedown', startDrag);
        coin.addEventListener('touchstart', startDrag, { passive: false });
        
        function startDrag(e) {
            e.preventDefault();
            
            // Get touch or mouse position
            const event = e.touches ? e.touches[0] : e;
            const initialX = event.clientX;
            const initialY = event.clientY;
            
            // Get coin position
            const rect = coin.getBoundingClientRect();
            const offsetX = initialX - rect.left;
            const offsetY = initialY - rect.top;
            
            // Mark as dragging
            coin.classList.add('dragging');
            currentDragCoin = coin;
            
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
                
                // Update position
                coin.style.left = `${clientX - offsetX}px`;
                coin.style.top = `${clientY - offsetY}px`;
                
                // Check if over coin slot
                const slotRect = coinSlot.getBoundingClientRect();
                const coinRect = coin.getBoundingClientRect();
                
                if (isOverlapping(coinRect, slotRect)) {
                    slotIndicator.classList.add('active');
                } else {
                    slotIndicator.classList.remove('active');
                }
            }
            
            function dragEnd(e) {
                // Remove event listeners
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('touchmove', dragMove);
                document.removeEventListener('mouseup', dragEnd);
                document.removeEventListener('touchend', dragEnd);
                
                // Check if coin is dropped into slot
                const slotRect = coinSlot.getBoundingClientRect();
                const coinRect = coin.getBoundingClientRect();
                
                if (isOverlapping(coinRect, slotRect)) {
                    // Drop coin into slot
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
                currentDragCoin = null;
                slotIndicator.classList.remove('active');
            }
        }
    }

    // Insert coin into machine
    function insertCoin(coin) {
        const value = coin.dataset.value;
        
        // 处理硬币篮子逻辑
        if (hiddenCoinCount > 0) {
            // 如果有隐藏硬币，减少隐藏计数而不是删除可见硬币
            hiddenCoinCount--;
            updateCoinCounter();
        } else {
            // 移除可见硬币
            coin.remove();
        }
        
        // Flash slot indicator
        slotIndicator.classList.add('active');
        setTimeout(() => {
            slotIndicator.classList.remove('active');
        }, 300);
        
        // 获取屏幕区域的相关信息
        const screen = document.querySelector('.screen');
        const screenRect = screen.getBoundingClientRect();
        const platformRect = platformElement.getBoundingClientRect();
        
        // 计算硬币在屏幕顶部的起始位置
        // 改为从屏幕区域的顶部开始，而不是平台顶部
        const randomX = 30 + Math.random() * 40; // Drop between 30-70% width
        
        // 创建一个特殊的动画硬币，先出现在屏幕上方
        const animCoin = document.createElement('div');
        animCoin.className = 'coin platform-coin';
        animCoin.dataset.value = value;
        animCoin.style.left = `${randomX}%`;
        animCoin.style.top = `-${coinSize}px`; // 开始于屏幕外部
        animCoin.innerHTML = createCoinSVG(value);
        screen.appendChild(animCoin);
        
        // 创建物理属性用于下落模拟
        const screenCoin = {
            element: animCoin,
            x: randomX,
            y: -coinSize, // 开始于屏幕外部
            vx: Math.random() * 1 - 0.5, // 轻微的初始水平速度
            vy: 2, // 初始下落速度
            width: coinSize,
            height: coinSize,
            value: parseInt(value)
        };
        
        // 让硬币落下并通过检测器
        const fallInterval = setInterval(() => {
            // 应用物理
            screenCoin.vy += gravity * 0.5;
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
        
        // Play dropping sound (if you want to add sound)
        // playSound('coin-drop');
    }

    // Check if two rectangles overlap
    function isOverlapping(rect1, rect2) {
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }

    // 执行转盘抽奖
    let isRouletteSpinning = false;
    let isJackpotSpinning = false;
    
    function startRouletteSpin() {
        if (isRouletteSpinning) return;
        isRouletteSpinning = true;
        
        const rouletteContainer = document.querySelector('.roulette-container');
        const rouletteWheel = document.querySelector('.roulette-wheel');
        const prizes = ['3', '5', '8', 'crown'];
        
        // 获取所有奖项元素
        const prizeItems = rouletteWheel.querySelectorAll('.roulette-item');
        
        // 显示转盘
        rouletteContainer.style.display = 'block';
        
        // 随机选择奖品
        const randomIndex = Math.floor(Math.random() * prizes.length);
        const randomPrize = prizes[randomIndex];
        
        // 创建顺序高亮的视觉效果
        let currentHighlightIndex = 0;
        let spinSpeed = 150; // 开始时的高亮切换速度 (毫秒)
        let spinCount = 0;
        let totalSpins = 20 + randomIndex; // 总高亮次数，确保停在随机奖品上
        
        // 清除所有高亮
        prizeItems.forEach(item => {
            item.classList.remove('highlighted', 'winner');
        });
        
        // 创建顺序高亮效果
        const spinInterval = setInterval(() => {
            // 移除上一个高亮
            prizeItems.forEach(item => {
                item.classList.remove('highlighted');
            });
            
            // 高亮当前项目
            prizeItems[currentHighlightIndex].classList.add('highlighted');
            
            // 移动到下一个项目
            currentHighlightIndex = (currentHighlightIndex + 1) % prizes.length;
            
            // 增加旋转次数
            spinCount++;
            
            // 逐渐减慢高亮切换速度
            if (spinCount > 10) {
                spinSpeed += 10;
            } else if (spinCount > 15) {
                spinSpeed += 20;
            } else if (spinCount > 18) {
                spinSpeed += 30;
            }
            
            // 当达到目标高亮次数时停止
            if (spinCount >= totalSpins) {
                clearInterval(spinInterval);
                
                // 确保最终高亮的是随机选择的奖品
                prizeItems.forEach(item => {
                    item.classList.remove('highlighted');
                });
                prizeItems[randomIndex].classList.add('highlighted');
                prizeItems[randomIndex].classList.add('winner');
                
                // 旋转结束，执行结果操作
                setTimeout(() => {
                    isRouletteSpinning = false;
                    
                    // 根据结果执行不同操作
                    if (randomPrize === 'crown') {
                        // 如果获得皇冠，开始第二轮抽奖
                        setTimeout(() => {
                            prizeItems.forEach(item => {
                                item.classList.remove('highlighted', 'winner');
                            });
                            rouletteContainer.style.display = 'none';
                            startJackpotSpin();
                        }, 1000);
                    } else {
                        // 显示奖励
                        const prizeValue = parseInt(randomPrize);
                        showPrize(prizeValue);
                        
                        // 硬币掉落效果
                        setTimeout(() => {
                            prizeItems.forEach(item => {
                                item.classList.remove('highlighted', 'winner');
                            });
                            rouletteContainer.style.display = 'none';
                            createRewardCoins(prizeValue);
                            increaseScore(prizeValue);
                        }, 2000);
                    }
                }, 1000);
            }
        }, spinSpeed);
    }
    
    function startJackpotSpin() {
        if (isJackpotSpinning) return;
        isJackpotSpinning = true;
        
        const jackpotContainer = document.querySelector('.jackpot-container');
        const jackpotWheel = document.querySelector('.jackpot-wheel');
        const jackpotPrizes = ['500', '600', '800', '1000', '2000'];
        
        // 获取所有奖项元素
        const prizeItems = jackpotWheel.querySelectorAll('.jackpot-item');
        
        // 显示大奖转盘
        jackpotContainer.style.display = 'block';
        
        // 随机选择大奖
        const randomIndex = Math.floor(Math.random() * jackpotPrizes.length);
        const randomJackpot = jackpotPrizes[randomIndex];
        
        // 创建顺序高亮的视觉效果
        let currentHighlightIndex = 0;
        let spinSpeed = 150; // 开始时的高亮切换速度 (毫秒)
        let spinCount = 0;
        let totalSpins = 25 + randomIndex; // 总高亮次数，确保停在随机奖品上
        
        // 清除所有高亮
        prizeItems.forEach(item => {
            item.classList.remove('highlighted', 'winner');
        });
        
        // 创建顺序高亮效果
        const spinInterval = setInterval(() => {
            // 移除上一个高亮
            prizeItems.forEach(item => {
                item.classList.remove('highlighted');
            });
            
            // 高亮当前项目
            prizeItems[currentHighlightIndex].classList.add('highlighted');
            
            // 移动到下一个项目
            currentHighlightIndex = (currentHighlightIndex + 1) % jackpotPrizes.length;
            
            // 增加旋转次数
            spinCount++;
            
            // 逐渐减慢高亮切换速度
            if (spinCount > 15) {
                spinSpeed += 10;
            } else if (spinCount > 20) {
                spinSpeed += 20;
            } else if (spinCount > 23) {
                spinSpeed += 30;
            }
            
            // 当达到目标高亮次数时停止
            if (spinCount >= totalSpins) {
                clearInterval(spinInterval);
                
                // 确保最终高亮的是随机选择的奖品
                prizeItems.forEach(item => {
                    item.classList.remove('highlighted');
                });
                prizeItems[randomIndex].classList.add('highlighted');
                prizeItems[randomIndex].classList.add('winner');
                
                setTimeout(() => {
                    isJackpotSpinning = false;
                    
                    // 显示奖励
                    const jackpotValue = parseInt(randomJackpot);
                    showPrize(jackpotValue);
                    
                    // 关闭转盘并给予奖励
                    setTimeout(() => {
                        prizeItems.forEach(item => {
                            item.classList.remove('highlighted', 'winner');
                        });
                        jackpotContainer.style.display = 'none';
                        createRewardCoins(jackpotValue);
                        increaseScore(jackpotValue);
                    }, 2000);
                }, 1000);
            }
        }, spinSpeed);
    }
    
    // 创建奖励硬币掉落效果
    function createRewardCoins(value) {
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
    
    function showPrize(value) {
        const prizeDisplay = document.querySelector('.prize-display');
        const prizeValue = document.querySelector('.prize-value');
        
        prizeValue.textContent = `+${value}`;
        prizeDisplay.style.display = 'block';
        prizeDisplay.classList.add('show');
        
        setTimeout(() => {
            prizeDisplay.classList.remove('show');
            setTimeout(() => {
                prizeDisplay.style.display = 'none';
            }, 300);
        }, 2000);
    }
    
    // Update detector position
    function updateDetector() {
        // Update position
        detectorPosition += detectorSpeed * detectorDirection;
        
        // Reverse direction if hitting edges
        if (detectorPosition >= detectorMaxPosition) {
            detectorDirection = -1;
        } else if (detectorPosition <= 0) {
            detectorDirection = 1;
        }
        
        // Apply position
        detectorElement.style.left = `${detectorPosition}%`;
        
        // 如果转盘正在旋转，不检测碰撞
        if (isRouletteSpinning || isJackpotSpinning) return;
        
        // Check for coin collisions with detector
        const detectorRect = detectorElement.getBoundingClientRect();
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
        platformCoins.forEach(coin => {
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
                    platformCoins = platformCoins.filter(c => c !== coin);
                    coinElement.remove();
                    
                    // 触发转盘抽奖
                    startRouletteSpin();
                }, 300);
            }
        });
    }

    // Update pusher animation
    function updatePusher() {
        // Update position
        pusherPosition += pusherSpeed * pusherDirection;
        
        // Reverse direction if hitting limits
        if (pusherPosition >= pusherMaxPosition) {
            pusherDirection = -1;
        } else if (pusherPosition <= 0) {
            pusherDirection = 1;
        }
        
        // Apply position - simulating with a shadow as it moves
        pusherElement.style.boxShadow = `0 ${3 + pusherPosition}px 5px rgba(0, 0, 0, 0.5)`;
        
        // Apply force to coins that are near the pusher
        const pusherRect = pusherElement.getBoundingClientRect();
        
        platformCoins.forEach(coin => {
            const coinRect = coin.element.getBoundingClientRect();
            
            // If coin is near the pusher's front edge
            if (coinRect.top < pusherRect.bottom + 10 && 
                coinRect.top > pusherRect.bottom - 10) {
                
                // Apply a small push force
                if (pusherDirection === 1) { // Only push when moving forward
                    coin.vx += 0.5;
                }
            }
        });
    }

    // Enhanced flashDetector function with more dramatic effect
    function flashDetector() {
        // Add flashing class for CSS transition
        detectorElement.classList.add('flashing');
        
        // Create a pulse effect
        let pulseCount = 0;
        const maxPulses = 3;
        const pulseInterval = setInterval(() => {
            pulseCount++;
            if (pulseCount >= maxPulses) {
                clearInterval(pulseInterval);
                detectorElement.classList.remove('flashing');
            } else {
                detectorElement.classList.toggle('flashing');
            }
        }, 150);
    }
    
    // Create pins above detector
    function createPins() {
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
    
    // Platform level variables
    let isPlatformRetracting = false;
    let platformRetractTimer = null;
    
    // Initialize the two-level platform mechanics
    function initPlatformLevels() {
        const platformLevel1 = document.querySelector('.platform-level-1');
        
        // Start the platform retraction cycle
        startPlatformCycle();
    }
    
    // Platform retraction cycle
    function startPlatformCycle() {
        const platformLevel1 = document.querySelector('.platform-level-1');
        const cycleTime = 15000; // 15 seconds per complete cycle
        const retractedTime = 3000; // Platform stays retracted for 3 seconds
        
        platformRetractTimer = setInterval(() => {
            // Retract the platform
            platformLevel1.classList.add('retracted');
            isPlatformRetracting = true;
            
            // Extend the platform after a delay
            setTimeout(() => {
                platformLevel1.classList.remove('retracted');
                isPlatformRetracting = false;
            }, retractedTime);
        }, cycleTime);
    }
    
    // Check if a coin should be transferred from level 1 to level 2
    function checkCoinTransfer() {
        // Only check during platform retraction
        if (!isPlatformRetracting) return;
        
        const platformLevel1 = document.querySelector('.platform-level-1');
        const platformLevel2 = document.querySelector('.platform-level-2');
        const platformRect = platformElement.getBoundingClientRect();
        
        // Check all platform coins
        for (let i = platformCoins.length - 1; i >= 0; i--) {
            const coin = platformCoins[i];
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

    // Update physics for all platform coins
    function updateCoins() {
        const platformRect = platformElement.getBoundingClientRect();
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
        for (let i = platformCoins.length - 1; i >= 0; i--) {
            const coin = platformCoins[i];
            
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
                    if (!isPlatformRetracting) {
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
                (coin.y > level1Height && coin.level === 1 && isPlatformRetracting)) {
                
                if (coin.level === 1) {
                    // If falling from level 1 during retraction, move to level 2
                    coin.level = 2;
                    coin.y = 0; // Reset y position to top of level 2
                    
                    // Move coin element from level 1 to level 2
                    coin.element.remove();
                    platformLevel2.appendChild(coin.element);
                } else {
                    // If falling from level 2, remove and score
                    platformCoins.splice(i, 1);
                    coin.element.remove();
                    
                    // Award points if not already scored
                    if (!coin.scored) {
                        increaseScore(coin.value);
                    }
                }
                continue;
            }
            
            // Coin-to-coin collisions
            for (let j = 0; j < platformCoins.length; j++) {
                if (i === j) continue;
                
                const otherCoin = platformCoins[j];
                
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
                        coin.x -= moveXPercent;
                        coin.y -= moveY;
                        otherCoin.x += moveXPercent;
                        otherCoin.y += moveY;
                    }
                    
                    // Calculate velocity changes
                    const power = 0.1; // Collision strength
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
    
    // Check for collisions between a coin and pins
    function checkPinCollisions(coin) {
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

    // Update score and convert to coins
    function increaseScore(points) {
        points = parseInt(points);
        score += points;
        scoreDisplay.textContent = score;
        
        // 添加分数弹出动画
        const scorePopup = document.createElement('div');
        scorePopup.className = 'score-popup';
        scorePopup.textContent = `+${points}`;
        scorePopup.style.position = 'absolute';
        scorePopup.style.color = '#ffcc00';
        scorePopup.style.fontWeight = 'bold';
        scorePopup.style.fontSize = '20px';
        scorePopup.style.top = '10px';
        scorePopup.style.right = '10px';
        scorePopup.style.animation = 'fadeUp 1s forwards';
        
        document.querySelector('.score-container').appendChild(scorePopup);
        
        // 添加动画关键帧
        if (!document.querySelector('#score-animation')) {
            const style = document.createElement('style');
            style.id = 'score-animation';
            style.textContent = `
                @keyframes fadeUp {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(-30px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 移除动画元素
        setTimeout(() => {
            scorePopup.remove();
        }, 1000);
        
        // 将获得的分数转换为硬币篮子中的硬币
        // 每个硬币值1分，所以获得多少分就加多少硬币
        addCoins(points);
    }

    // Reset game
    function resetGame() {
        // 隐藏所有转盘和奖励显示
        document.querySelector('.roulette-container').style.display = 'none';
        document.querySelector('.jackpot-container').style.display = 'none';
        document.querySelector('.prize-display').style.display = 'none';
        
        // 清除所有高亮状态
        const prizeItems = document.querySelectorAll('.roulette-item, .jackpot-item');
        prizeItems.forEach(item => {
            item.classList.remove('highlighted', 'winner');
        });
        
        // 清除奖励硬币
        const rewardCoins = document.querySelector('.reward-coins');
        if (rewardCoins) rewardCoins.innerHTML = '';
        
        // 重置旋转标志
        isRouletteSpinning = false;
        isJackpotSpinning = false;
        
        // 重置两层平台
        const platformLevel1 = document.querySelector('.platform-level-1');
        platformLevel1.classList.remove('retracted');
        isPlatformRetracting = false;
        
        // 清除平台上的硬币
        platformCoins.forEach(coin => coin.element.remove());
        platformCoins = [];
        
        // 清除屏幕上的硬币
        document.querySelectorAll('.screen .coin').forEach(coin => coin.remove());
        
        // 清除篮子里的硬币
        while (coinsContainer.firstChild) {
            coinsContainer.firstChild.remove();
        }
        
        // 重新生成钉子
        createPins();
        
        // 重置隐藏硬币计数
        hiddenCoinCount = 0;
        updateCoinCounter();
        
        // 重置分数
        score = 0;
        scoreDisplay.textContent = score;
        
        // 添加初始硬币
        addCoins(8);
    }

    // Clean up function for the game
    function cleanupGame() {
        if (platformRetractTimer) {
            clearInterval(platformRetractTimer);
        }
    }

    // Main game loop
    function gameLoop() {
        updateDetector();
        updatePusher();
        updateCoins();
        checkCoinTransfer();
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    }

    // Start the game
    initGame();
});
