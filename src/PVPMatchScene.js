// ============================================
// PVP MATCH SCENE - Coordinates PVP tournament flow
// ============================================

import { CONFIG } from './GameConfig.js';

/**
 * PVPMatchScene manages the PVP tournament flow:
 * - Tracks both players' progress through 5 PVE rounds
 * - Handles spectator mode when one player finishes first
 * - Manages the transition to PVP placement and battle
 */
export class PVPMatchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPMatchScene' });
        
        this.pvpManager = null;
        this.sessionKey = null;
        this.playerNumber = null;
        
        // Progress tracking
        this.myProgress = 1;
        this.opponentProgress = 0;
        this.isSpectatorMode = false;
        
        // Army persistence
        this.myArmy = [];
        this.magicBuffs = [];
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.sessionKey = data.sessionKey;
        this.playerNumber = data.playerNumber;
        this.myArmy = data.army || [];
        this.magicBuffs = data.magicBuffs || [];
        
        // Set up callbacks
        this._setupCallbacks();
    }

    create() {
        window.gameScene = this;
        
        // Show appropriate UI based on state
        this._updateUI();
        
        // Start first battle
        this._startNextBattle();
    }

    // ============================================
    // CALLBACK SETUP
    // ============================================

    _setupCallbacks() {
        // Opponent connected
        this.pvpManager.onOpponentConnected = (opponentData) => {
            console.log('[PVP] Opponent connected:', opponentData.name);
            this.opponentProgress = opponentData.currentBattle || 1;
            this._updateProgressUI();
        };

        // Opponent progress update
        this.pvpManager.onOpponentProgressUpdate = (progress) => {
            console.log('[PVP] Opponent progress:', progress);
            this.opponentProgress = progress;
            this._updateProgressUI();
            
            // Check if we should enter spectator mode
            if (this.myProgress >= 6 && this.opponentProgress < 6) {
                this._enterSpectatorMode();
            }
        };

        // PVP state change
        this.pvpManager.onPVPStateChange = (state, fullState) => {
            console.log('[PVP] State changed:', state);
            this._handleStateChange(state, fullState);
        };

        // Match end
        this.pvpManager.onMatchEnd = (winner) => {
            this._showMatchResult(winner);
        };
    }

    // ============================================
    // BATTLE FLOW
    // ============================================

    _startNextBattle() {
        // Show progress overlay
        this._showProgressOverlay();
        
        // Start PVE battle
        this.scene.start('BattleScene', {
            isPVPContext: true,
            pvpManager: this.pvpManager,
            battleNumber: this.myProgress,
            placedUnits: this.myArmy,
            magicBuffs: this.magicBuffs
        });
    }

    /**
     * Called by BattleScene when a round is completed
     */
    async onBattleComplete(victory, armyData, magicBuffs) {
        if (!victory) {
            // Player lost - show defeat and end PVP
            this._showDefeat();
            return;
        }

        // Update progress
        this.myArmy = armyData;
        this.magicBuffs = magicBuffs;
        this.myProgress++;

        // Sync to Firebase
        await this.pvpManager.updateProgress(this.myProgress, armyData);

        // Check if we should proceed to PVP round
        if (this.myProgress === 6) {
            if (this.opponentProgress >= 6) {
                // Both ready - go to placement
                this._startPVPPlacement();
            } else {
                // Wait for opponent - enter spectator mode
                this._enterSpectatorMode();
            }
        } else {
            // Continue to next PVE round
            this._startNextBattle();
        }
    }

    // ============================================
    // SPECTATOR MODE
    // ============================================

    _enterSpectatorMode() {
        this.isSpectatorMode = true;
        
        // Show spectator UI
        document.getElementById('pvp-spectator-screen').classList.remove('hidden');
        document.getElementById('pvp-progress-overlay').classList.add('hidden');
        document.getElementById('ui-panel').classList.add('hidden');
        
        const opponentData = this.pvpManager.getOpponentData();
        if (opponentData) {
            document.getElementById('spectator-opponent-name').textContent = opponentData.name || 'Opponent';
        }

        // Listen for opponent's battle updates
        this.pvpManager.onSpectatorData = (data) => {
            this._updateSpectatorView(data);
        };

        // Update progress bar
        this._updateSpectatorProgress();
    }

    _updateSpectatorView(data) {
        if (!data) return;
        
        // Update battle number
        if (data.battleNumber) {
            document.getElementById('spectator-battle-num').textContent = Math.min(data.battleNumber, 5);
            this._updateSpectatorProgress();
        }

        // Could render a simplified view of opponent's battle here
        // For now, just track progress
    }

    _updateSpectatorProgress() {
        const progress = Math.min(this.opponentProgress, 5);
        const percent = (progress / 5) * 100;
        document.getElementById('spectator-progress-bar').style.width = percent + '%';
    }

    _exitSpectatorMode() {
        this.isSpectatorMode = false;
        document.getElementById('pvp-spectator-screen').classList.add('hidden');
        this.pvpManager.onSpectatorData = null;
    }

    // ============================================
    // PVP PLACEMENT & BATTLE
    // ============================================

    _startPVPPlacement() {
        this._exitSpectatorMode();
        
        // Wait for Firebase to update with side assignment
        const checkInterval = setInterval(() => {
            const mySide = this.pvpManager.getMySide();
            if (mySide) {
                clearInterval(checkInterval);
                this._showPlacementUI(mySide);
            }
        }, 500);
    }

    _showPlacementUI(mySide) {
        // Show placement screen
        document.getElementById('pvp-placement-screen').classList.remove('hidden');
        document.getElementById('pvp-progress-overlay').classList.add('hidden');
        document.getElementById('ui-panel').classList.add('hidden');
        
        // Update UI
        document.getElementById('pvp-your-side').textContent = mySide.toUpperCase();
        document.getElementById('pvp-units-to-place').textContent = this.myArmy.length;
        
        // Start placement scene
        this.scene.start('PVPPlacementScene', {
            pvpManager: this.pvpManager,
            mySide: mySide,
            myArmy: this.myArmy,
            opponentArmy: this.pvpManager.opponentArmy,
            onComplete: () => this._startPVPBattle()
        });
    }

    _startPVPBattle() {
        document.getElementById('pvp-placement-screen').classList.add('hidden');
        
        const mySide = this.pvpManager.getMySide();
        
        this.scene.start('PVPBattleScene', {
            pvpManager: this.pvpManager,
            playerSide: mySide,
            myArmy: this.myArmy,
            opponentArmy: this.pvpManager.opponentArmy,
            myMagicBuffs: this.magicBuffs,
            onComplete: (winner) => this._handlePVPResult(winner)
        });
    }

    async _handlePVPResult(winner) {
        // Report winner
        await this.pvpManager.reportWinner(winner);
    }

    // ============================================
    // STATE HANDLING
    // ============================================

    _handleStateChange(state, fullState) {
        switch (state) {
            case 'pvp_placement':
                if (this.myProgress >= 6 && this.opponentProgress >= 6) {
                    this._startPVPPlacement();
                }
                break;
                
            case 'pvp_battle':
                if (this.pvpManager.bothPlayersReady()) {
                    this._startPVPBattle();
                }
                break;
                
            case 'finished':
                this._showMatchResult(fullState.pvpRound?.winner);
                break;
        }
    }

    // ============================================
    // UI UPDATES
    // ============================================

    _updateUI() {
        this._updateProgressUI();
    }

    _showProgressOverlay() {
        const overlay = document.getElementById('pvp-progress-overlay');
        overlay.classList.remove('hidden');
        this._updateProgressUI();
    }

    _updateProgressUI() {
        // Update my progress
        document.getElementById('pvp-your-progress').textContent = 
            this.myProgress <= 5 ? `Battle ${this.myProgress}/5` : 'Ready for PVP';
        
        // Update opponent progress
        const oppText = this.opponentProgress === 0 
            ? 'Waiting...' 
            : (this.opponentProgress <= 5 ? `Battle ${this.opponentProgress}/5` : 'Ready for PVP');
        document.getElementById('pvp-opponent-progress').textContent = oppText;
        
        // Update status text
        const statusEl = document.getElementById('pvp-status-text');
        if (this.myProgress >= 6 && this.opponentProgress >= 6) {
            statusEl.textContent = '⚔️ PVP Battle Starting!';
            statusEl.style.color = '#FFD700';
        } else if (this.isSpectatorMode) {
            statusEl.textContent = '👁️ Watching opponent...';
            statusEl.style.color = '#4a7cd9';
        } else {
            statusEl.textContent = 'First to round 6 wins!';
            statusEl.style.color = '#8B7355';
        }
    }

    // ============================================
    // END GAME
    // ============================================

    _showMatchResult(winner) {
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');
        const rewardsContainer = document.getElementById('rewards-container');
        
        victoryScreen.classList.remove('hidden');
        rewardsContainer.style.display = 'none';
        document.getElementById('defeat-message').style.display = 'none';
        document.getElementById('confirm-rewards').style.display = 'none';
        document.getElementById('victory-subtitle').style.display = 'none';

        if (winner === this.playerNumber) {
            victoryText.innerHTML = '🏆 Tournament Victory! 🏆';
            victoryText.style.color = '#FFD700';
        } else {
            victoryText.innerHTML = 'Match Lost...';
            victoryText.style.color = '#9E4A4A';
        }

        // Add rematch button
        const rematchBtn = document.createElement('button');
        rematchBtn.className = 'spell-button';
        rematchBtn.style.cssText = 'margin-top: 30px; font-size: 16px; padding: 12px 30px;';
        rematchBtn.textContent = '⚔️ Play Again';
        rematchBtn.onclick = () => location.reload();
        victoryScreen.appendChild(rematchBtn);
    }

    _showDefeat() {
        const victoryScreen = document.getElementById('victory-screen');
        const victoryText = document.getElementById('victory-text');
        
        victoryScreen.classList.remove('hidden');
        document.getElementById('rewards-container').style.display = 'none';
        document.getElementById('defeat-message').style.display = 'block';
        document.getElementById('confirm-rewards').style.display = 'none';
        document.getElementById('victory-subtitle').style.display = 'none';
        
        victoryText.innerHTML = 'Defeated in Battle...';
        victoryText.style.color = '#9E4A4A';

        // Leave session
        this.pvpManager.leaveSession();
    }

    // ============================================
    // PUBLIC API FOR SCENES
    // ============================================

    /**
     * Called by BattleScene to report completion
     */
    reportBattleComplete(victory, armyData, magicBuffs) {
        this.onBattleComplete(victory, armyData, magicBuffs);
    }

    /**
     * Get current PVP manager
     */
    getPVPManager() {
        return this.pvpManager;
    }
}
