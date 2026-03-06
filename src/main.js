// ============================================
// MAIN ENTRY POINT - Steel and Sigils
// ============================================

const GAME_VERSION = '0.82';
console.log(`Steel and Sigils v${GAME_VERSION}`);

import { CONFIG } from './GameConfig.js';
import { BattleScene, PreGameScene } from './SceneManager.js';

// Note: UNIT_TYPES is available globally from units.js (loaded as script tag before this module)

// Phaser Game Configuration
// Fixed canvas size - maps stretch to fill
const config = {
    type: Phaser.AUTO,
    width: 640,  // 10 tiles * 64px
    height: 512, // 8 tiles * 64px
    parent: 'game-container',
    backgroundColor: '#1A1C1E',
    scene: [PreGameScene, BattleScene]
};

// Global game reference
let game = null;

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    game = new Phaser.Game(config);

    // Expose for debugging
    window.game = game;
});
