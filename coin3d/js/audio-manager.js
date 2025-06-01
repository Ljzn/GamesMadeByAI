/* filepath: /Users/linjiezhang/AI/Games/coin3d/js/audio-manager.js */
// 管理游戏中的所有音频效果

class AudioManager {
    constructor() {
        this.context = null;
        this.muted = false;
        this.initialized = false;
        
        // 在用户首次点击时初始化音频上下文
        document.addEventListener('click', () => this.initAudio(), { once: true });
    }
    
    // 初始化 Web Audio API 上下文
    initAudio() {
        if (this.initialized) return;
        
        try {
            // 创建音频上下文
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🎵 音频系统初始化成功');
        } catch (e) {
            console.error('❌ 无法初始化音频系统:', e);
        }
    }
    
    // 生成硬币翻转的声音
    createFlipSound() {
        if (!this.context || this.muted) return;
        
        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            
            // 设置音色为三角波，听起来更圆润一些
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1200, this.context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.context.currentTime + 0.2);
            
            // 设置音量包络
            gainNode.gain.setValueAtTime(0.4, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
            
            // 连接节点
            oscillator.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            // 播放声音
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.2);
            
            return oscillator;
        } catch (e) {
            console.error('❌ 生成翻转声音出错:', e);
            return null;
        }
    }
    
    // 生成硬币落地的声音
    createLandSound() {
        if (!this.context || this.muted) return;
        
        try {
            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();
            const filter = this.context.createBiquadFilter();
            
            // 设置为噪声模拟碰撞声
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, this.context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.08);
            
            // 设置过滤器
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            
            // 设置音量包络（快速衰减）
            gainNode.gain.setValueAtTime(0.6, this.context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
            
            // 连接节点
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.context.destination);
            
            // 播放声音
            oscillator.start();
            oscillator.stop(this.context.currentTime + 0.1);
            
            // 添加额外的碰撞声
            setTimeout(() => {
                if (this.context && !this.muted) {
                    const osc2 = this.context.createOscillator();
                    const gain2 = this.context.createGain();
                    
                    osc2.type = 'triangle';
                    osc2.frequency.value = 200;
                    gain2.gain.setValueAtTime(0.3, this.context.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.05);
                    
                    osc2.connect(gain2);
                    gain2.connect(this.context.destination);
                    
                    osc2.start();
                    osc2.stop(this.context.currentTime + 0.05);
                }
            }, 20);
            
            return oscillator;
        } catch (e) {
            console.error('❌ 生成落地声音出错:', e);
            return null;
        }
    }
    
    // 生成胜利的声音
    createWinSound() {
        if (!this.context || this.muted) return;
        
        try {
            // 创建几个音符形成一个欢快的旋律
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const duration = 0.15;
            
            notes.forEach((note, i) => {
                setTimeout(() => {
                    if (!this.context || this.muted) return;
                    
                    const oscillator = this.context.createOscillator();
                    const gainNode = this.context.createGain();
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.value = note;
                    
                    gainNode.gain.setValueAtTime(0.3, this.context.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.context.destination);
                    
                    oscillator.start();
                    oscillator.stop(this.context.currentTime + duration);
                }, i * (duration * 1000));
            });
            
            return true;
        } catch (e) {
            console.error('❌ 生成胜利声音出错:', e);
            return null;
        }
    }
    
    // 播放指定的声音
    play(name) {
        if (this.muted || !this.context) return null;
        
        // 确保音频上下文已经初始化
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        
        switch (name) {
            case 'flip':
                return this.createFlipSound();
            case 'land':
                return this.createLandSound();
            case 'win':
                return this.createWinSound();
            default:
                console.warn(`⚠️ 未知的声音类型: ${name}`);
                return null;
        }
    }
    
    // 静音所有音效
    mute() {
        this.muted = true;
        console.log('🔇 音效已静音');
    }
    
    // 取消静音所有音效
    unmute() {
        this.muted = false;
        console.log('🔊 音效已恢复');
    }
    
    // 切换静音状态
    toggleMute() {
        this.muted = !this.muted;
        console.log(this.muted ? '🔇 音效已静音' : '🔊 音效已恢复');
        return this.muted;
    }
}

// 将AudioManager添加到全局对象
window.AudioManager = AudioManager;
