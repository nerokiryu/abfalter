import { combatManager } from "../combatManager.js";
import { gmCombatType } from "./gmCombatType.js";
import { playerCombatType } from "../player/playerCombatType.js";
import { assertCurrentScene, getSelectedToken, getTargetToken, canOwnerReceiveMessage } from "../utilities.js";
import { genericDialogs } from "../../dialogs.js";
import { gmCombatDialog } from "../dialogs/gmCombatDialog.js";
import { combatAttackDialog } from "../dialogs/combatAttackDialog.js";
import { combatDefenseDialog } from "../dialogs/combatDefenseDialog.js";

export class gmCombatManager extends combatManager {
    constructor(game) {
        super(game);
    }
    receive(msg) {
        switch (msg.type) {
            case playerCombatType.RequestToAttack:
                this.managePlayerAttackRequest(msg);
                break;
            case playerCombatType.Attack:
                this.managePlayerAttack(msg);
                break;
            case playerCombatType.Defend:
                this.managePlayerDefense(msg);
                break;
            default:
                Log.warn("Unknown message", msg);
        }
    }

    endCombat() {
        console.log("combat closed/ended");
        if (this.combat) {
            const msg = {
                type: gmCombatType.CancelCombat,
                combatId: this.combat.id,
            };
            this.emit(msg);
            this.combat.close({ executeHook: false });
            this.combat = undefined;
        }
        /*
        if (this.defendDialog) {
            this.defendDialog.close({ force: true });
            this.defendDialog = undefined;
        }
        if (this.attackDialog) {
            this.attackDialog.close({ force: true });
            this.attackDialog = undefined;
        }
        */
    }

    createNewCombat(attacker, defender) {
        console.log("I made it: Created New Combat");
        return new gmCombatDialog(attacker, defender, {
            onClose: () => {
                this.endCombat();
            },
            onCounterAttack: (bonus) => {
                this.endCombat();
                this.combat = new gmCombatDialog(
                    defender,
                    attacker,
                    {
                        onClose: () => {
                            this.endCombat();
                        },
                        onCounterAttack: () => {
                            this.endCombat();
                        },
                    },
                    { isCounter: true, counterAttackBonus: bonus }
                );
                if (canOwnerReceiveMessage(defender.actor)) {
                    const newMsg = {
                        type: gmCombatType.counterAttack,
                        payload: {
                            attackerTokenId: defender.id,
                            defenderTokenId: attacker.id,
                            counterAttackBonus: bonus,
                        },
                    };
                    this.emit(newMsg);
                } else {
                    this.manageAttack(defender, attacker, bonus);
                }
            },
        });
        console.log("I did it: Created New Combat Ending");
    }

    async sendAttack() {
        assertCurrentScene(); // Checks if the token is in the current scene.
        const { user } = this.game;
        if (!user) return;
        const attackerToken = getSelectedToken(this.game); // makes the selected token the attacker, there can only be 1 attacker.
        const { targets } = user;
        const targetToken = getTargetToken(attackerToken, targets).document;

        if (targetToken.length === undefined) {
            console.log("Single Attack");
            if (attackerToken?.id) {
                await genericDialogs.confirm(
                    this.game.i18n.format("abfalter.autoCombat.dialog.attackConfirm.title"),
                    this.game.i18n.format("abfalter.autoCombat.dialog.attackConfirm.body.title", { target: targetToken.name }),
                    {
                        onConfirm: () => {
                            if (attackerToken?.id && targetToken?.id) {
                                this.combat = this.createNewCombat(attackerToken, targetToken);
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

    manageAttack(attacker, defender, bonus = 0) {
        this.attackDialog = new combatAttackDialog(
            attacker,
            defender,
            {
                onAttack: (result) => {
                    console.log(result);
                    this.attackDialog?.close({ force: true });
                    this.attackDialog = undefined;
                    if (this.combat) {
                        this.combat.updateAttackerData(result);
                        if (canOwnerReceiveMessage(defender.actor)) {
                            const newMsg = {
                                type: gmCombatType.Attack,
                                payload: {
                                    attackerTokenId: attacker.id,
                                    defenderTokenId: defender.id,
                                    result,
                                },
                            };
                            this.emit(newMsg);
                        } else {
                            try {
                                this.manageDefense(attacker, defender, result);
                            } catch (err) {
                                if (err) {
                                    console.error(err);
                                }
                                this.endCombat();
                            }
                        }
                    }
                },
            },
            { counterAttackBonus: bonus }
        );
    }
    manageDefense(attacker, defender, attackResult) {
        this.defendDialog = new combatDefenseDialog(
            attacker,
            defender,
            {
                onDefense: (result) => {
                    if (this.defendDialog) {
                        this.defendDialog.close({ force: true });
                        this.defendDialog = undefined;
                        if (this.combat) {
                            this.combat.updateDefenderData(result);
                    
/*                             if (result.resultTotal < 0) {
                                const counterAttackBonus = Math.floor((-result.resultTotal - 1) / 10) * 5;
                                console.log(counterAttackBonus);
                                if (canOwnerReceiveMessage(attacker.actor)) {
                                    const newMsg = {
                                        type: gmCombatType.CounterAttack,
                                        payload: {
                                            attackerTokenId: attacker.id,
                                            defenderTokenId: defender.id,
                                            counterAttackBonus,
                                        },
                                    };
                                    this.emit(newMsg);
                                } else {
                                    try {
                                        this.manageAttack(defender, attacker, counterAttackBonus);
                                    } catch (err) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        this.endCombat();
                                    }
                                }
                            } */
                        }
                    }
                },
            },
            { result: attackResult, damageType: attackResult.values.damage.type, atPen: attackResult.values.damage.atPen, attackType: attackResult.type}
        );
    }

    /*
    async managePlayerAttack(msg) {
        if (this.combat) {
            this.combat.updateAttackerData(msg.payload);
            const { attackerToken, defenderToken, defenderActor } = this.combat;
            const { critic } = msg.payload.values;
            if (canOwnerReceiveMessafe(defenderActor)) {
                const newMsg = {
                    type: gmCombatType.Attack,
                    payload: { attackerTokenId: attackerToken.id, defenderTokenId: defenderToken.id, result: msg.payload }
                };
                this.emit(newMsg);
            } else {
                try {
                    this.manageDefense(attackerToken, defenderToken, msg.payload.type, critic);
                } catch (e) {
                    if (e) {
                        Log.error(e);
                    }
                    this.endCombat();
                }
            }
        }
    }

    managePlayerDefense(msg) {
        if (this.combat) {
            this.combat.updateDefenderData(msg.payload);
        } else {
            Log.warn('User attack received but none combat is running');
        }
    }
    */
    async managePlayerAttackRequest(msg) {}
}
