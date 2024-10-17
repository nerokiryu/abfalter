import { combatManager } from "../combatManager.js";
import { playerCombatType } from "./playerCombatType.js";
import { combatAttackDialog } from "../dialogs/combatAttackDialog.js";
import { combatDefenseDialog } from "../dialogs/combatDefenseDialog.js";
import { genericDialogs } from "../../dialogs.js";
import { assertCurrentScene, assertGMActive, getSelectedToken, getTargetToken, canOwnerReceiveMessage } from "../utilities.js";
import { gmCombatDialog } from "../dialogs/gmCombatDialog.js";
import { gmCombatType } from "../gm/gmCombatType.js";
import { gmCombatManager } from "../gm/gmCombatManager.js";
export class playerCombatManager extends combatManager {
    constructor(game) {
        super(game);
    }
    receive(msg) {
        switch (msg.type) {
            case gmCombatType.CounterAttack:
                this.manageCounterAttack(msg);
                break;
            case gmCombatType.Attack:
                this.manageDefense(msg);
                break;
            case gmCombatType.CancelCombat:
                this.endCombat();
                break;
            case gmCombatType.RequestToAttackResponse:
                this.manageAttackRequest(msg);
                break;
            default:
                console.warn("Unknown message", msg);
        }
    }

    isMyToken(tokenId) {
        console.log(this.game.canvas.tokens?.ownedTokens)
        return this.game.canvas.tokens?.ownedTokens.filter((tk) => tk.id === tokenId).length === 1;
    }

    endCombat() {
        console.log("combat closed/ended");
        if (this.combat) {
            const msg = { type: gmCombatType.CancelCombat, combatId: this.combat.id };
            this.emit(msg);
            this.combat.close({ executeHook: false });
            this.combat = undefined;
        }
        if (this.defenseDialog) {
            this.defenseDialog.close({ force: true });
            this.defenseDialog = undefined;
        }
        if (this.attackDialog) {
            this.attackDialog.close({ force: true });
            this.attackDialog = undefined;
        }
    }

    async sendAttackRequest() {
        assertGMActive();
        assertCurrentScene(); // Checks if the token is in the current scene.
        const { user } = this.game;
        if (!user) return;
        const attackerToken = getSelectedToken(this.game); // makes the selected token the attacker, there can only be 1 attacker.
        const { targets } = user;
        const targetToken = getTargetToken(attackerToken, targets);

        if (targetToken.length === undefined) {
            console.log("Single Attack");
            if (attackerToken?.id) {
                await genericDialogs.confirm(
                    this.game.i18n.format("abfalter.autoCombat.dialog.attackConfirm.title"),
                    this.game.i18n.format("abfalter.autoCombat.dialog.attackConfirm.body.title", { target: targetToken.name }),
                    {
                        onConfirm: () => {
                            if (attackerToken?.id && targetToken?.id) {
                                const msg = {
                                    type: playerCombatType.RequestToAttack,
                                    senderId: user.id,
                                    payload: {
                                        attackerTokenId: attackerToken.id,
                                        defenderTokenId: targetToken.id,
                                    },
                                };
                                this.emit(msg);
                                this.manageAttack(attackerToken, targetToken);
                            }
                        },
                    }
                );
            }
        } else {
            console.log("Aoe Attack"); //not implemented
        }
    }

    manageAttack(attacker, defender, bonus) {
        this.attackDialog = new combatAttackDialog(
            attacker,
            defender,
            {
                onAttack: (result) => {
                    const newMsg = {
                        type: playerCombatType.Attack,
                        payload: { attackerTokenId: attacker.id, defenderTokenId: defender.id, result },
                    };
                    this.emit(newMsg);
                },
            },
            { counterAttackBonus: bonus }
        );
    }

    async manageCounterAttack(msg) {
        const { attackerTokenId, defenderTokenId, counterAttackBonus } = msg.payload;

        if (!this.isMyToken(attackerTokenId)) {
            return;
        }

        const attacker = this.findTokenById(attackerTokenId);
        const defender = this.findTokenById(defenderTokenId);

        this.manageAttack(attacker, defender, counterAttackBonus);
        this.attackDialog.updatePermissions(true);
    }

    async manageDefense(msg) {
        const { result, attackerTokenId, defenderTokenId } = msg.payload;
        
        if (!this.isMyToken(defenderTokenId)) {
            return;
        }

        const attacker = this.findTokenById(attackerTokenId);
        const defender = this.findTokenById(defenderTokenId);

        try {
            this.defenseDialog = new combatDefenseDialog(
                attacker,
                defender,
                {
                    onDefense: (result) => {
                        const newMsg = {
                            type: playerCombatType.Defend,
                            payload: { attackerTokenId: attacker.id, defenderTokenId: defender.id, result },
                        };

                        this.emit(newMsg);
                    },
                },
                { result: result, damageType: result.values.damage.type, atPen: result.values.damage.atPen, attackType: result.type }
            );
            this.defenseDialog.updatePermissions(true);
        } catch (err) {
            if (err) {
                console.error(err);
            }
            this.endCombat();
        }
    }

    async manageAttackRequest(msg) {
        if (msg.toUserId !== this.game.user.id) return;
        if (!this.attackDialog) return;

        if (msg.payload.allowed) {
            this.attackDialog.updatePermissions(msg.payload.allowed);
        } else {
            this.endCombat();

            if (msg.payload.alreadyInACombat) {
                genericDialogs.prompt(this.game.i18n.localize("abfalter.autoCombat.dialog.error.alreadyInCombat.title"));
            } else {
                genericDialogs.prompt(this.game.i18n.localize("abfalter.autoCombat.dialog.error.requestRejected.title"));
            }
        }
    }
}
