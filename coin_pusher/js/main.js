// 主要游戏入口文件
import { initPhysics, isOverlapping, checkPinCollisions } from './physics.js';
import { createCoinSVG, addCoins, makeCoinDraggable, insertCoin, addCoinToPlatform, createRewardCoins, updateCoinCounter } from './coin.js';
import { startRouletteSpin, startJackpotSpin, showPrize } from './wheel.js';
import { initPlatformLevels, checkCoinTransfer, updateCoins } from './platform.js';
import { updateDetector, updatePusher, createPins, flashDetector } from './detector.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    window.platformElement = document.querySelector('.platform');
    window.coinsContainer = document.querySelector('.coins-container');
    window.detectorElement = document.querySelector('.detector');
    window.coinSlot = document.querySelector('.coin-slot');
    window.slotIndicator = document.querySelector('.slot-indicator');
    window.scoreDisplay = document.getElementById('score');
    window.addCoinsButton = document.getElementById('add-coins');
    window.resetButton = document.getElementById('reset-game');
    window.pusherElement = document.querySelector('.pusher');

    // Game state
    window.score = 0;
    window.platformCoins = [];
    window.currentDragCoin = null;
    window.detectorDirection = 1; // 1 = right, -1 = left
    window.pusherDirection = -1; // 1 = forward, -1 = backward
    window.detectorPosition = 0;
    window.pusherPosition = 0;
    window.hiddenCoinCount = 0;
    
    // 将物理常量挂载到window对象，方便其他模块访问
    window.gravity = 0.2;
    window.friction = 0.98;
    window.restitution = 0.7;
    window.coinSize = 50;
    
    // 旋转状态
    window.isRouletteSpinning = false;
    window.isJackpotSpinning = false;
    
    // 平台状态
    window.isPlatformRetracting = false;
    window.platformRetractTimer = null;
    
    // Initialize game
    function initGame() {
        // 初始化物理系统
        initPhysics();
        
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
        window.platformBounds = {
            width: rect.width,
            height: rect.height
        };
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
        if (rewardCoins) {
            rewardCoins.innerHTML = '';
        }
        
        // 重置旋转标志
        window.isRouletteSpinning = false;
        window.isJackpotSpinning = false;
        
        // 重置两层平台
        const platformLevel1 = document.querySelector('.platform-level-1');
        platformLevel1.classList.remove('retracted');
        window.isPlatformRetracting = false;
        
        // 清除平台上的硬币
        window.platformCoins.forEach(coin => coin.element.remove());
        window.platformCoins = [];
        
        // 清除屏幕上的硬币
        document.querySelectorAll('.screen .coin').forEach(coin => coin.remove());
        
        // 清除篮子里的硬币
        while (coinsContainer.firstChild) {
            coinsContainer.firstChild.remove();
        }
        
        // 重新生成钉子
        createPins();
        
        // 重置隐藏硬币计数
        window.hiddenCoinCount = 0;
        updateCoinCounter();
        
        // 重置分数
        window.score = 0;
        scoreDisplay.textContent = '0';
    }

    // Update score and convert to coins
    window.increaseScore = function(points) {
        points = parseInt(points);
        window.score += points;
        window.scoreDisplay.textContent = window.score;
        
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
    };

    // Main game loop
    function gameLoop() {
        // Update physics and animations
        updateDetector();
        updatePusher();
        updateCoins();
        
        // Continue the loop
        requestAnimationFrame(gameLoop);
    }

    // Start the game
    initGame();
});
