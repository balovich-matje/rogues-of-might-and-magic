// ============================================
// NETWORK ADAPTER - Abstract base class for network implementations
// ============================================

/**
 * Abstract base class defining the interface for network adapters.
 * Implementations: FirebaseAdapter, SocketAdapter (for self-hosted)
 */
export class NetworkAdapter {
    constructor() {
        if (this.constructor === NetworkAdapter) {
            throw new Error('NetworkAdapter is abstract - cannot instantiate directly');
        }
        this.playerId = this.generatePlayerId();
        this.sessionKey = null;
        this.onStateChangeCallback = null;
        this.isConnected = false;
    }

    // ============================================
    // SESSION MANAGEMENT
    // ============================================

    /**
     * Create a new game session
     * @returns {Promise<string>} Session key
     */
    async createSession() {
        throw new Error('createSession() must be implemented');
    }

    /**
     * Join an existing session
     * @param {string} sessionKey 
     * @returns {Promise<boolean>} Success status
     */
    async joinSession(sessionKey) {
        throw new Error('joinSession() must be implemented');
    }

    /**
     * Leave current session
     * @returns {Promise<void>}
     */
    async leaveSession() {
        throw new Error('leaveSession() must be implemented');
    }

    // ============================================
    // STATE SYNCHRONIZATION
    // ============================================

    /**
     * Subscribe to session state changes
     * @param {string} sessionKey 
     * @param {Function} callback - Receives state updates
     */
    onStateChange(sessionKey, callback) {
        this.sessionKey = sessionKey;
        this.onStateChangeCallback = callback;
        throw new Error('onStateChange() must be implemented');
    }

    /**
     * Unsubscribe from state changes
     */
    offStateChange() {
        this.onStateChangeCallback = null;
    }

    /**
     * Send state update to session
     * @param {Object} data 
     * @returns {Promise<void>}
     */
    async send(data) {
        throw new Error('send() must be implemented');
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Generate unique player ID
     * @returns {string}
     */
    generatePlayerId() {
        return 'p_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate 6-character session key
     * @returns {string}
     */
    generateSessionKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 6; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }

    /**
     * Get current player ID
     * @returns {string}
     */
    getPlayerId() {
        return this.playerId;
    }

    /**
     * Get current session key
     * @returns {string|null}
     */
    getSessionKey() {
        return this.sessionKey;
    }

    // ============================================
    // PVP-SPECIFIC HELPERS
    // ============================================

    /**
     * Get which player number we are (1 or 2)
     * @param {Object} sessionState 
     * @returns {number|null}
     */
    getPlayerNumber(sessionState) {
        if (!sessionState) return null;
        if (sessionState.player1?.id === this.playerId) return 1;
        if (sessionState.player2?.id === this.playerId) return 2;
        return null;
    }

    /**
     * Check if both players are connected
     * @param {Object} sessionState 
     * @returns {boolean}
     */
    isSessionFull(sessionState) {
        return sessionState?.player1?.connected && sessionState?.player2?.connected;
    }

    /**
     * Get opponent's player number
     * @param {Object} sessionState 
     * @returns {number|null}
     */
    getOpponentNumber(sessionState) {
        const myNumber = this.getPlayerNumber(sessionState);
        if (myNumber === 1) return 2;
        if (myNumber === 2) return 1;
        return null;
    }

    /**
     * Get opponent's data from session state
     * @param {Object} sessionState 
     * @returns {Object|null}
     */
    getOpponentData(sessionState) {
        const opponentNum = this.getOpponentNumber(sessionState);
        if (opponentNum === 1) return sessionState?.player1;
        if (opponentNum === 2) return sessionState?.player2;
        return null;
    }
}

// ============================================
// SESSION STATE SCHEMA (for reference)
// ============================================

/**
 * Session state structure:
 * 
 * {
 *   player1: {
 *     id: string,
 *     name: string,
 *     connected: boolean,
 *     currentBattle: number,  // 1-5 for PVE rounds, 6 for PVP
 *     army: Array<{type, x, y, health, statModifiers, bloodlustStacks, buffs}>,
 *     ready: boolean,  // For placement phase
 *     side: 'left' | 'right' | null,  // Assigned side for PVP round
 *     lastSeen: timestamp
 *   },
 *   player2: { ...same structure... },
 *   
 *   state: 'waiting' | 'playing' | 'pvp_pending' | 'pvp_placement' | 'pvp_battle' | 'finished',
 *   createdAt: timestamp,
 *   updatedAt: timestamp,
 *   
 *   // PVP Round specific
 *   pvpRound: {
 *     player1Side: 'left' | 'right',  // Random assignment
 *     player1Ready: boolean,
 *     player2Ready: boolean,
 *     battleStarted: boolean,
 *     winner: 1 | 2 | null,
 *     battleEvents: Array  // For spectator sync
 *   },
 *   
 *   // For spectator mode - sync battle state
 *   spectatorData: {
 *     activePlayer: 1 | 2,  // Whose turn we're watching
 *     units: Array,  // Current unit positions/stats
 *     lastAction: Object  // Last action taken
 *   }
 * }
 */
