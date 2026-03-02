// ============================================
// PVP MANAGER - High-level PVP session management
// ============================================

import { FirebaseAdapter, DEFAULT_FIREBASE_CONFIG } from './network/FirebaseAdapter.js';

/**
 * PVP Manager handles the overall PVP flow:
 * - Session creation/joining
 * - Battle progress tracking
 * - Spectator mode
 * - PVP round coordination
 */
export class PVPManager {
    constructor(scene) {
        this.scene = scene;
        this.network = null;
        this.sessionKey = null;
        this.playerNumber = null;
        this.sessionState = null;
        this.isPVPEnabled = false;
        
        // Game state
        this.myProgress = 1;  // Current battle (1-5)
        this.opponentProgress = 0;  // 0 = not connected yet
        this.myArmy = [];  // Persisted army through rounds
        this.opponentArmy = null;
        
        // Callbacks
        this.onOpponentConnected = null;
        this.onOpponentProgressUpdate = null;
        this.onOpponentReady = null;
        this.onPVPStateChange = null;
        this.onSpectatorData = null;
        this.onMatchEnd = null;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize with custom Firebase config (optional)
     */
    initialize(firebaseConfig = DEFAULT_FIREBASE_CONFIG) {
        this.network = new FirebaseAdapter(firebaseConfig);
    }

    /**
     * Enable/disable PVP mode
     */
    setEnabled(enabled) {
        this.isPVPEnabled = enabled;
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    async createSession() {
        if (!this.network) {
            this.initialize();
        }

        try {
            this.sessionKey = await this.network.createSession();
            this.playerNumber = 1;
            
            // Listen for session changes
            this.network.onStateChange(this.sessionKey, (state) => {
                this._handleSessionUpdate(state);
            });

            return this.sessionKey;
        } catch (error) {
            console.error('Failed to create session:', error);
            throw error;
        }
    }

    async joinSession(sessionKey) {
        if (!this.network) {
            this.initialize();
        }

        try {
            await this.network.joinSession(sessionKey);
            this.sessionKey = sessionKey.toUpperCase().trim();
            this.playerNumber = 2;
            
            // Listen for session changes
            this.network.onStateChange(this.sessionKey, (state) => {
                this._handleSessionUpdate(state);
            });

            return true;
        } catch (error) {
            console.error('Failed to join session:', error);
            throw error;
        }
    }

    async leaveSession() {
        if (this.network) {
            await this.network.leaveSession();
        }
        this._reset();
    }

    // ============================================
    // BATTLE PROGRESS
    // ============================================

    /**
     * Update battle progress after completing a PVE round
     */
    async updateProgress(battleNumber, armyData) {
        if (!this.isPVPEnabled || !this.network) return;

        this.myProgress = battleNumber;
        this.myArmy = armyData;

        await this.network.updateBattleProgress(battleNumber, armyData);

        // Check if we should start PVP round
        if (battleNumber === 6) {
            await this._handlePVPRoundStart();
        }
    }

    /**
     * Check if both players are ready for PVP round
     */
    bothPlayersAtPVPRound() {
        if (!this.sessionState) return false;
        return this.myProgress >= 6 && this.opponentProgress >= 6;
    }

    /**
     * Check if we should enter spectator mode
     */
    shouldEnterSpectatorMode() {
        return this.myProgress >= 6 && this.opponentProgress < 6;
    }

    // ============================================
    // PVP ROUND MANAGEMENT
    // ============================================

    /**
     * Get assigned side for PVP round
     */
    getMySide() {
        if (!this.sessionState?.pvpRound) return null;
        
        // First check if sides are assigned in pvpRound
        if (this.sessionState.pvpRound.sidesAssigned) {
            if (this.playerNumber === 1) {
                return this.sessionState.pvpRound.player1Side;
            } else {
                return this.sessionState.pvpRound.player2Side;
            }
        }
        
        // Fallback: check player data directly
        const playerKey = this.playerNumber === 1 ? 'player1' : 'player2';
        return this.sessionState[playerKey]?.side || null;
    }
    
    /**
     * Check if sides have been assigned
     */
    areSidesAssigned() {
        return this.sessionState?.pvpRound?.sidesAssigned || false;
    }

    /**
     * Check if placement phase is active
     */
    isPlacementPhase() {
        return this.sessionState?.state === 'pvp_placement';
    }

    /**
     * Check if PVP battle is active
     */
    isPVPBattleActive() {
        return this.sessionState?.state === 'pvp_battle';
    }

    /**
     * Set ready status for placement phase
     */
    async setReady(ready) {
        if (!this.network) return;
        await this.network.setReadyStatus(ready);
    }

    /**
     * Check if both players are ready
     */
    bothPlayersReady() {
        if (!this.sessionState?.pvpRound) return false;
        return this.sessionState.pvpRound.player1Ready && this.sessionState.pvpRound.player2Ready;
    }

    /**
     * Send battle event (for spectator/replay)
     */
    async sendBattleEvent(event) {
        if (!this.network) return;
        await this.network.sendBattleEvent(event);
    }

    /**
     * Report match winner
     */
    async reportWinner(winnerPlayerNumber) {
        if (!this.network) return;
        await this.network.reportWinner(winnerPlayerNumber);
    }

    // ============================================
    // SPECTATOR MODE
    // ============================================

    /**
     * Update spectator data for opponent viewing
     */
    async updateSpectatorData(data) {
        if (!this.network || !this.shouldEnterSpectatorMode()) return;
        await this.network.updateSpectatorData(data);
    }

    /**
     * Get opponent's current battle state (for spectator)
     */
    getOpponentBattleState() {
        return this.sessionState?.spectatorData;
    }

    // ============================================
    // UTILITY
    // ============================================

    getSessionKey() {
        return this.sessionKey;
    }

    getPlayerNumber() {
        return this.playerNumber;
    }

    getOpponentData() {
        return this.network?.getOpponentData(this.sessionState);
    }

    isOpponentConnected() {
        return this.sessionState?.player2?.connected || false;
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    _handleSessionUpdate(state) {
        this.sessionState = state;

        if (!state) return;

        // Track opponent connection
        const wasConnected = this.opponentProgress > 0;
        const nowConnected = state.player2?.connected;

        if (!wasConnected && nowConnected && this.playerNumber === 1) {
            this.opponentProgress = state.player2.currentBattle || 1;
            if (this.onOpponentConnected) {
                this.onOpponentConnected(state.player2);
            }
        }

        // Track opponent progress
        const opponentData = this.network?.getOpponentData(state);
        if (opponentData) {
            const oldProgress = this.opponentProgress;
            this.opponentProgress = opponentData.currentBattle || 0;
            
            if (this.opponentProgress !== oldProgress && this.onOpponentProgressUpdate) {
                this.onOpponentProgressUpdate(this.opponentProgress);
            }

            // Store opponent army for PVP round
            if (opponentData.army && opponentData.army.length > 0) {
                this.opponentArmy = opponentData.army;
            }
        }

        // Handle state changes
        if (this.onPVPStateChange) {
            this.onPVPStateChange(state.state, state);
        }

        // Handle spectator data
        if (state.spectatorData && this.onSpectatorData) {
            this.onSpectatorData(state.spectatorData);
        }

        // Handle match end
        if (state.state === 'finished' && state.pvpRound?.winner && this.onMatchEnd) {
            this.onMatchEnd(state.pvpRound.winner);
        }
    }

    async _handlePVPRoundStart() {
        // Only player 1 initializes the PVP round
        if (this.playerNumber !== 1) return;

        // Wait for opponent to also reach round 6
        if (!this.bothPlayersAtPVPRound()) return;

        // Initialize PVP round with random sides
        await this.network.initPVPRound();
    }

    _reset() {
        this.sessionKey = null;
        this.playerNumber = null;
        this.sessionState = null;
        this.myProgress = 1;
        this.opponentProgress = 0;
        this.myArmy = [];
        this.opponentArmy = null;
    }
}
