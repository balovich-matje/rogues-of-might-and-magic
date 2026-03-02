// ============================================
// PVP BATTLE SCENE - Final PVP battle between two players
// ============================================

import { BattleScene } from './SceneManager.js';
import { CONFIG, SPELLS } from './GameConfig.js';
import { GridSystem } from './InputHandler.js';
import { UnitManager, TurnSystem } from './EntityManager.js';
import { SpellSystem } from './SpellSystem.js';
import { UIManager } from './UIHandler.js';

/**
 * PVPBattleScene extends BattleScene for the final player-vs-player battle.
 * Key differences:
 * - Both sides are player-controlled (but we control only our side)
 * - Random side assignment
 * - Can view opponent unit stats but not control them
 * - Synchronized via Firebase
 */
export class PVPBattleScene extends BattleScene {
    constructor() {
        super({ key: 'PVPBattleScene' });
        
        this.pvpManager = null;
        this.playerSide = null;  // 'left' or 'right'
        this.myArmy = [];
        this.opponentArmy = [];
        this.onComplete = null;
        
        // PVP-specific tracking
        this.isSyncing = false;
    }

    init(data) {
        this.pvpManager = data.pvpManager;
        this.playerSide = data.playerSide;
        this.myArmy = data.myArmy || [];
        this.opponentArmy = data.opponentArmy || [];
        this.onComplete = data.onComplete;
        this.magicBuffs = data.myMagicBuffs || [];
        
        // Apply magic buffs
        this._applyMagicBuffs();
    }

    create() {
        // Initialize systems
        this.gridSystem = new GridSystem(this);
        this.unitManager = new UnitManager(this);
        this.turnSystem = new TurnSystem(this);
        this.spellSystem = new SpellSystem(this);
        this.uiManager = new UIManager(this);

        this.gridSystem.create();
        
        // Create units with proper sides
        this._createPVPUnits();
        
        // Update UI
        this.uiManager.updateManaDisplay();
        
        // Start game
        this.turnSystem.initQueue();
        
        window.gameScene = this;
        
        // Keyboard controls
        this.input.keyboard.on('keydown-S', () => this.openSpellBook());
        this.input.keyboard.on('keydown-E', () => this.endTurn());
        this.input.keyboard.on('keydown-ESC', () => this.cancelSpell());
        
        // Listen for battle events from opponent
        this.pvpManager.onSpectatorData = (data) => {
            this._handleOpponentAction(data);
        };
    }

    // ============================================
    // UNIT CREATION
    // ============================================

    _createPVPUnits() {
        // Create my units
        for (const unitData of this.myArmy) {
            const unit = this.unitManager.addUnit(unitData.type, unitData.x, unitData.y);
            if (unit) {
                // Apply saved stats
                this._restoreUnitStats(unit, unitData);
                // Override isPlayer based on side
                unit.isPlayer = (this.playerSide === 'left');
            }
        }
        
        // Create opponent units
        for (const unitData of this.opponentArmy) {
            // Mirror X position for opponent
            const mirrorX = (CONFIG.GRID_WIDTH - 1) - unitData.x;
            const unit = this.unitManager.addUnit(unitData.type, mirrorX, unitData.y);
            if (unit) {
                this._restoreUnitStats(unit, unitData);
                // Override isPlayer based on side
                unit.isPlayer = (this.playerSide !== 'left');
            }
        }
    }

    _restoreUnitStats(unit, unitData) {
        // Restore health
        if (unitData.health !== undefined) {
            unit.health = Math.min(unitData.health, unit.maxHealth);
        }
        
        // Restore stat modifiers
        if (unitData.statModifiers) {
            unit.statModifiers = unitData.statModifiers;
            if (unitData.statModifiers.damage) unit.damage += unitData.statModifiers.damage;
            if (unitData.statModifiers.maxHealth) {
                unit.maxHealth += unitData.statModifiers.maxHealth;
                unit.health += unitData.statModifiers.maxHealth;
            }
            if (unitData.statModifiers.moveRange) unit.moveRange += unitData.statModifiers.moveRange;
            if (unitData.statModifiers.initiative) unit.initiative += unitData.statModifiers.initiative;
            if (unitData.statModifiers.rangedRange) unit.rangedRange = unitData.statModifiers.rangedRange;
            
            // Restore legendary buffs
            if (unitData.statModifiers.hasDoubleStrike) unit.hasDoubleStrike = true;
            if (unitData.statModifiers.hasCleave) unit.hasCleave = true;
            if (unitData.statModifiers.hasRicochet) unit.hasRicochet = true;
            if (unitData.statModifiers.hasPiercing) unit.hasPiercing = true;
        }
        
        // Restore Bloodlust stacks
        if (unitData.bloodlustStacks) {
            unit.bloodlustStacks = unitData.bloodlustStacks;
            unit.damage += unitData.bloodlustStacks * 15;
        }
        
        // Restore buffs
        if (unitData.buffs) {
            if (unitData.buffs.hasteRounds) {
                unit.hasteRounds = unitData.buffs.hasteRounds;
                unit.moveRange += unitData.buffs.hasteValue || 0;
            }
            if (unitData.buffs.shieldRounds) {
                unit.shieldRounds = unitData.buffs.shieldRounds;
                unit.shieldValue = unitData.buffs.shieldValue || 0;
            }
            if (unitData.buffs.blessRounds) {
                unit.blessRounds = unitData.buffs.blessRounds;
                unit.blessValue = unitData.buffs.blessValue || 1;
            }
            if (unitData.buffs.regenerateRounds) {
                unit.regenerateRounds = unitData.buffs.regenerateRounds;
                unit.regenerateAmount = unitData.buffs.regenerateAmount || 0;
            }
        }
        
        unit.updateHealthBar();
    }

    _applyMagicBuffs() {
        for (const buff of this.magicBuffs) {
            if (buff.type === 'manaRegen') this.manaRegen += buff.value;
            if (buff.type === 'manaCost') this.manaCostMultiplier = Math.max(0.2, 1 - buff.value);
            if (buff.type === 'spellPower') this.spellPowerMultiplier += buff.value;
            if (buff.type === 'spellsPerRound') this.spellsPerRound += buff.value;
            if (buff.type === 'maxMana') this.maxMana += buff.value;
            if (buff.type === 'permanentBuffs') this.permanentBuffs = true;
            if (buff.type === 'armyBuffs') this.armyBuffs = true;
        }
    }

    // ============================================
    // UNIT SELECTION & CONTROL
    // ============================================

    selectUnit(unit) {
        // Check if this is my unit
        const isMyUnit = this._isMyUnit(unit);
        
        // If spell active, handle spell targeting
        if (this.spellSystem.activeSpell) {
            const spell = SPELLS[this.spellSystem.activeSpell];
            if (spell) {
                // For enemy-targeting spells, target opponent units
                if (spell.targetType === 'enemy' && !isMyUnit) {
                    if (spell.effect === 'aoeDamage' || spell.effect === 'iceStorm' || spell.effect === 'meteor') {
                        this.spellSystem.executeSpellAt(unit.gridX, unit.gridY);
                        this._syncAction('spell', { spell: this.spellSystem.activeSpell, targetX: unit.gridX, targetY: unit.gridY });
                    } else {
                        this.spellSystem.executeUnitSpell(spell, unit);
                        this._syncAction('spell_unit', { spell: this.spellSystem.activeSpell, targetUnit: unit.type });
                    }
                    return;
                }
                // For ally-targeting spells, target my units
                else if (spell.targetType === 'ally' && isMyUnit) {
                    this.spellSystem.executeUnitSpell(spell, unit);
                    this._syncAction('spell_ally', { spell: this.spellSystem.activeSpell, targetUnit: unit.type });
                    return;
                }
            }
        }

        // If it's my unit and my turn, allow control
        if (isMyUnit && this.turnSystem.currentUnit === unit) {
            this.gridSystem.highlightValidMoves(unit);
            this.uiManager.updateUnitInfo(unit);
            this.selectedUnit = unit;
            
            if (unit.rangedRange > 0 && unit.canAttack()) {
                this.gridSystem.highlightRangedAttackRange(unit);
            }
        } else {
            // Show unit info but no control
            this.uiManager.updateUnitInfo(unit);
        }
    }

    _isMyUnit(unit) {
        // My units are on my side
        if (this.playerSide === 'left') {
            return unit.isPlayer;
        } else {
            return !unit.isPlayer;
        }
    }

    // ============================================
    // COMBAT ACTIONS
    // ============================================

    performAttack(attacker, defender, isSecondStrike = false) {
        // Only allow if it's my turn and I'm controlling the attacker
        if (!this._isMyUnit(attacker) && !isSecondStrike) {
            return;
        }
        
        super.performAttack(attacker, defender, isSecondStrike);
        
        if (!isSecondStrike) {
            this._syncAction('attack', { 
                attacker: attacker.type, 
                defender: defender.type,
                attackerX: attacker.gridX,
                attackerY: attacker.gridY
            });
        }
    }

    performRangedAttack(attacker, defender) {
        if (!this._isMyUnit(attacker)) return;
        
        super.performRangedAttack(attacker, defender);
        
        this._syncAction('ranged_attack', { 
            attacker: attacker.type, 
            defender: defender.type 
        });
    }

    moveUnit(unit, newX, newY) {
        if (!this._isMyUnit(unit)) return;
        
        super.moveUnit(unit, newX, newY);
        
        this._syncAction('move', { 
            unit: unit.type, 
            fromX: unit.gridX, 
            fromY: unit.gridY,
            toX: newX, 
            toY: newY 
        });
    }

    endTurn() {
        if (this.turnSystem.currentUnit && this._isMyUnit(this.turnSystem.currentUnit)) {
            super.endTurn();
            this._syncAction('end_turn', {});
        }
    }

    // ============================================
    // SYNCHRONIZATION
    // ============================================

    async _syncAction(actionType, data) {
        if (!this.pvpManager) return;
        
        await this.pvpManager.sendBattleEvent({
            type: actionType,
            data: data,
            player: this.pvpManager.getPlayerNumber(),
            turn: this.turnSystem.roundNumber
        });
    }

    _handleOpponentAction(spectatorData) {
        // Handle actions from opponent
        if (!spectatorData || !spectatorData.lastAction) return;
        
        const action = spectatorData.lastAction;
        
        // Only process if it's from opponent
        if (action.player === this.pvpManager.getPlayerNumber()) return;
        
        // Apply action (simplified - in real implementation would need proper unit resolution)
        // This is a basic framework - full implementation would need careful state sync
        console.log('[PVP] Opponent action:', action);
    }

    // ============================================
    // VICTORY CHECK
    // ============================================

    checkVictoryCondition() {
        const myUnits = this._getMyUnits();
        const opponentUnits = this._getOpponentUnits();
        
        if (opponentUnits.length === 0) {
            this._endPVPBattle(this.pvpManager.getPlayerNumber());
        } else if (myUnits.length === 0) {
            const opponentNumber = this.pvpManager.getOpponentNumber();
            this._endPVPBattle(opponentNumber);
        }
    }

    _getMyUnits() {
        return this.unitManager.units.filter(u => this._isMyUnit(u) && !u.isDead && u.health > 0);
    }

    _getOpponentUnits() {
        return this.unitManager.units.filter(u => !this._isMyUnit(u) && !u.isDead && u.health > 0);
    }

    async _endPVPBattle(winner) {
        this.victoryShown = true;
        
        if (this.onComplete) {
            this.onComplete(winner);
        }
    }

    // ============================================
    // UI OVERRIDES
    // ============================================

    openSpellBook() {
        // Only allow if it's my turn
        if (this.turnSystem.currentUnit && !this._isMyUnit(this.turnSystem.currentUnit)) {
            this.uiManager.showFloatingText('Wait for your turn!', 400, 300, '#ff4444');
            return;
        }
        super.openSpellBook();
    }
}
