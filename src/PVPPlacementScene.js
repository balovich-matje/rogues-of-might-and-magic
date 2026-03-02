// ============================================
// PVP PLACEMENT SCENE - Unit placement for final PVP battle
// ============================================

import { CONFIG } from './GameConfig.js';

/**
 * PVPPlacementScene handles the placement phase before the final PVP battle.
 * Both players place their units on their assigned sides and confirm readiness.
 */
export class PVPPlacementScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PVPPlacementScene' });
        
        this.pvpManager = null;
        this.mySide = null;  // 'left' or 'right'
        this.myArmy = [];
        this.opponentArmy = [];
        
        // Placement state
        this.placedUnits = [];
        this.unitsToPlace = [];
        this.placementMode = true;
        this.isReady = false;
        
        // Callback
        this.onComplete = null;
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.mySide = data.mySide;
        this.myArmy = data.myArmy || [];
        this.opponentArmy = data.opponentArmy || [];
        this.onComplete = data.onComplete;
        
        // Prepare units for placement
        this.unitsToPlace = this.myArmy.map(u => u.type);
    }

    create() {
        window.gameScene = this;
        
        // Create grid
        this.gridGraphics = this.add.graphics();
        this.drawGrid();
        
        // Set up input
        this.setupInput();
        
        // Listen for opponent ready status
        this.pvpManager.onOpponentReady = (ready) => {
            this._updateOpponentReadyUI(ready);
        };

        // Listen for state changes
        this.pvpManager.onPVPStateChange = (state) => {
            if (state === 'pvp_battle' && this.onComplete) {
                this.onComplete();
            }
        };
        
        // Update UI
        this._updateUI();
    }

    // ============================================
    // GRID RENDERING
    // ============================================

    drawGrid() {
        this.gridGraphics.clear();
        
        const GRID_WIDTH = CONFIG.GRID_WIDTH;
        const GRID_HEIGHT = CONFIG.GRID_HEIGHT;
        const TILE_SIZE = CONFIG.TILE_SIZE;
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const isMySide = this._isMySideTile(x);
                const isOpponentSide = !isMySide && this._isOpponentSideTile(x);
                
                // Base color
                const baseColor = (x + y) % 2 === 0 ? CONFIG.COLORS.GRASS : CONFIG.COLORS.GRASS_DARK;
                
                // Highlight sides
                let alpha = 0.4;
                let color = baseColor;
                
                if (isMySide) {
                    // My side - blue tint
                    color = CONFIG.COLORS.PLAYER_SIDE;
                    alpha = 0.3;
                } else if (isOpponentSide) {
                    // Opponent side - red tint
                    color = CONFIG.COLORS.ENEMY_SIDE;
                    alpha = 0.2;
                }
                
                this.gridGraphics.fillStyle(color, alpha);
                this.gridGraphics.fillRect(
                    x * TILE_SIZE + 1,
                    y * TILE_SIZE + 1,
                    TILE_SIZE - 2,
                    TILE_SIZE - 2
                );
                
                // Border for placement zones
                if (isMySide) {
                    this.gridGraphics.lineStyle(1, 0x4a7cd9, 0.5);
                    this.gridGraphics.strokeRect(
                        x * TILE_SIZE + 2,
                        y * TILE_SIZE + 2,
                        TILE_SIZE - 4,
                        TILE_SIZE - 4
                    );
                }
            }
        }
        
        // Draw side labels
        const labelY = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE + 20;
        
        // My side label
        const mySideX = this.mySide === 'left' ? 0 : CONFIG.GRID_WIDTH - 2;
        const myLabelX = mySideX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE;
        this.add.text(myLabelX, labelY, 'YOUR SIDE', {
            fontSize: '14px',
            color: '#4a7cd9',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Opponent side label
        const oppSideX = this.mySide === 'left' ? CONFIG.GRID_WIDTH - 2 : 0;
        const oppLabelX = oppSideX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE;
        this.add.text(oppLabelX, labelY, 'OPPONENT', {
            fontSize: '14px',
            color: '#d94a4a',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    _isMySideTile(x) {
        if (this.mySide === 'left') {
            return x < 2;
        } else {
            return x >= CONFIG.GRID_WIDTH - 2;
        }
    }

    _isOpponentSideTile(x) {
        if (this.mySide === 'left') {
            return x >= CONFIG.GRID_WIDTH - 2;
        } else {
            return x < 2;
        }
    }

    // ============================================
    // INPUT HANDLING
    // ============================================

    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (!this.placementMode || this.isReady) return;
            
            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
            
            // Check if valid placement tile
            if (!this._isValidPlacementTile(gridX, gridY)) return;
            
            // Check if tile is occupied
            const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);
            if (isOccupied) return;
            
            // Place unit
            this._placeUnit(gridX, gridY);
        });
        
        this.input.on('pointermove', (pointer) => {
            if (!this.placementMode || this.isReady) return;
            
            this.drawGrid(); // Redraw to clear previous highlight
            
            const gridX = Math.floor(pointer.x / CONFIG.TILE_SIZE);
            const gridY = Math.floor(pointer.y / CONFIG.TILE_SIZE);
            
            if (this._isValidPlacementTile(gridX, gridY)) {
                const isOccupied = this.placedUnits.some(u => u.x === gridX && u.y === gridY);
                
                // Highlight tile
                this.gridGraphics.fillStyle(isOccupied ? 0x9E4A4A : 0x6B8B5B, 0.5);
                this.gridGraphics.fillRect(
                    gridX * CONFIG.TILE_SIZE + 4,
                    gridY * CONFIG.TILE_SIZE + 4,
                    CONFIG.TILE_SIZE - 8,
                    CONFIG.TILE_SIZE - 8
                );
            }
        });
    }

    _isValidPlacementTile(x, y) {
        // Check bounds
        if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) {
            return false;
        }
        
        // Must be on my side
        return this._isMySideTile(x);
    }

    _placeUnit(gridX, gridY) {
        if (this.unitsToPlace.length === 0) return;
        
        const unitType = this.unitsToPlace.shift();
        
        // Find original unit data
        const originalUnit = this.myArmy.find(u => u.type === unitType && 
            !this.placedUnits.some(p => p.originalIndex === this.myArmy.indexOf(u)));
        
        if (!originalUnit) return;
        
        const placedUnit = {
            ...originalUnit,
            x: gridX,
            y: gridY,
            originalIndex: this.myArmy.indexOf(originalUnit)
        };
        
        this.placedUnits.push(placedUnit);
        
        // Render unit
        const x = gridX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = gridY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        const text = this.add.text(x, y, UNIT_TYPES[unitType].emoji, {
            fontSize: '36px'
        }).setOrigin(0.5);
        
        placedUnit.sprite = text;
        
        // Update UI
        this._updateUI();
    }

    // ============================================
    // UI UPDATES
    // ============================================

    _updateUI() {
        // Update units to place count
        const remaining = this.unitsToPlace.length;
        document.getElementById('pvp-units-to-place').textContent = remaining;
        
        // Update confirm button
        const confirmBtn = document.getElementById('pvp-confirm-placement');
        confirmBtn.disabled = remaining > 0 || this.isReady;
        confirmBtn.textContent = this.isReady 
            ? '✅ Waiting for opponent...' 
            : (remaining > 0 ? `Place ${remaining} more unit${remaining > 1 ? 's' : ''}` : '✅ Confirm Placement');
    }

    _updateMyReadyUI(ready) {
        document.getElementById('pvp-your-ready').textContent = ready ? '✅ Ready' : '❌ Not Ready';
        document.getElementById('pvp-your-ready').style.color = ready ? '#4CAF50' : '#ff4444';
    }

    _updateOpponentReadyUI(ready) {
        document.getElementById('pvp-opponent-ready').textContent = ready ? '✅ Ready' : '❌ Not Ready';
        document.getElementById('pvp-opponent-ready').style.color = ready ? '#4CAF50' : '#ff4444';
    }

    // ============================================
    // CONFIRMATION
    // ============================================

    async confirmPVPPlacement() {
        if (this.unitsToPlace.length > 0 || this.isReady) return;
        
        this.isReady = true;
        this._updateMyReadyUI(true);
        this._updateUI();
        
        // Sync to Firebase
        await this.pvpManager.setReady(true);
        
        // Check if both ready
        if (this.pvpManager.bothPlayersReady()) {
            await this.pvpManager.network.startPVPBattle();
        }
    }

    // ============================================
    // UTILITY
    // ============================================

    getPlacedUnits() {
        return this.placedUnits;
    }

    shutdown() {
        // Cleanup
        this.placedUnits.forEach(u => {
            if (u.sprite) u.sprite.destroy();
        });
    }
}
