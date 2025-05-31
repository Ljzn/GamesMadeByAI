// 转盘抽奖相关函数
import { createRewardCoins, addCoins } from './coin.js';

// 显示奖励值
export function showPrize(value) {
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

// 执行常规转盘抽奖
export function startRouletteSpin() {
    if (window.isRouletteSpinning) return;
    window.isRouletteSpinning = true;
    
    const rouletteContainer = document.querySelector('.roulette-container');
    const rouletteWheel = document.querySelector('.roulette-wheel');
    const prizes = ['3', '5', '8', 'crown'];
    
    // 获取所有奖项元素
    const prizeItems = rouletteWheel.querySelectorAll('.roulette-item');
    
    // 显示转盘
    rouletteContainer.style.display = 'block';
    
    // 随机选择奖品，但降低皇冠的概率为1%
    let randomPrize;
    // 生成1-100的随机数
    const randomChance = Math.floor(Math.random() * 100) + 1;
    
    // 只有1%的概率抽中皇冠
    if (randomChance <= 1) {
        randomPrize = 'crown';
    } else {
        // 从其他普通奖励中随机选择
        const normalPrizes = ['3', '5', '8'];
        randomPrize = normalPrizes[Math.floor(Math.random() * normalPrizes.length)];
    }
    
    // 找出对应的索引
    const randomIndex = prizes.indexOf(randomPrize);
    
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
                window.isRouletteSpinning = false;
                
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
                        window.increaseScore(prizeValue);
                        
                        // 将奖励转换为硬币添加到篮子中
                        const coinsToAdd = Math.max(1, Math.floor(prizeValue / 3));
                        addCoins(coinsToAdd);
                        
                        // 显示硬币添加提示
                        const coinPopup = document.createElement('div');
                        coinPopup.className = 'coin-popup';
                        coinPopup.innerHTML = `<img src="data:image/svg+xml,${encodeURIComponent(createCoinSVG(1))}" width="20" height="20"> +${coinsToAdd}`;
                        coinPopup.style.position = 'fixed';
                        coinPopup.style.top = `${window.coinsContainer.getBoundingClientRect().top}px`;
                        coinPopup.style.left = `${window.coinsContainer.getBoundingClientRect().left + 50}px`;
                        document.body.appendChild(coinPopup);
                        
                        setTimeout(() => coinPopup.remove(), 1500);
                    }, 2000);
                }
            }, 1000);
        }
    }, spinSpeed);
}

// 执行大奖转盘抽奖
export function startJackpotSpin() {
    if (window.isJackpotSpinning) return;
    window.isJackpotSpinning = true;
    
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
                window.isJackpotSpinning = false;
                
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
                    window.increaseScore(jackpotValue);
                    
                    // 将大奖转换为硬币添加到篮子中
                    const coinsToAdd = Math.max(3, Math.floor(jackpotValue / 100));
                    addCoins(coinsToAdd);
                    
                    // 显示硬币添加提示
                    const coinPopup = document.createElement('div');
                    coinPopup.className = 'coin-popup';
                    coinPopup.innerHTML = `<img src="data:image/svg+xml,${encodeURIComponent(createCoinSVG(1))}" width="20" height="20"> +${coinsToAdd}`;
                    coinPopup.style.position = 'fixed';
                    coinPopup.style.top = `${window.coinsContainer.getBoundingClientRect().top}px`;
                    coinPopup.style.left = `${window.coinsContainer.getBoundingClientRect().left + 50}px`;
                    document.body.appendChild(coinPopup);
                    
                    setTimeout(() => coinPopup.remove(), 1500);
                }, 2000);
            }, 1000);
        }
    }, spinSpeed);
}
