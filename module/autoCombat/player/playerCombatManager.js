import { combatManager } from "../combatManager.js"

export class playerCombatManager extends combatManager {
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
                Log.warn('Unknown message', msg);
        }
    }

    endCombat() {
        console.log("combat closed/ended");
        if (this.combat) {
            const msg = { type: gmCombatType.CancelCombat, combatId: this.combat.id };
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
            onCounterAttack: bonus => {
                this.endCombat();
                this.combat = new gmCombatDialog(defender, attacker, {
                    onClose: () => {
                        this.endCombat();
                    },
                    onCounterAttack: () => {
                        this.endCombat();
                    }
                }, { isCounter: true, counterAttackBonus: bonus });
                if (canOwnerReceiveMessage(defender.actor)) {
                    const newMsg = {
                        type: gmCombatType.counterAttack,
                        payload: { attackerTokenId: defender.id, defenderTokenId: attacker.id, counterAttackBonus: bonus }
                    };
                    this.emit(newMsg);
                } else {
                    this.manageAttack(defender, attacker, bonus);
                }
            }
        });
        console.log("I did it: Created New Combat Ending");

    }

    async sendAttack() {
        assertCurrentScene(); // Checks if the token is in the current scene.
        const { user } = this.game;
        if (!user) return;
        const attackerToken = getSelectedToken(this.game); // makes the selected token the attacker, there can only be 1 attacker.
        const { targets } = user;
        const targetToken = getTargetToken(attackerToken, targets);

        if (targetToken.length === undefined) {
            console.log("Single Attack");
            if (attackerToken?.id) {
                await genericDialogs.confirm(this.game.i18n.format('abfalter.autoCombat.dialog.attackConfirm.title'), this.game.i18n.format('abfalter.autoCombat.dialog.attackConfirm.body.title', { target: targetToken.name }), {
                    onConfirm: () => {
                        if (attackerToken?.id && targetToken?.id) {
                            this.combat = this.createNewCombat(attackerToken, targetToken);
                            this.manageAttack(attackerToken, targetToken);
                        }
                    }
                });
            }
        } else {
            console.log("Aoe Attack"); //not implemented
        }
    }

    manageAttack(attacker, defender, bonus) {
        this.attackDialog = new combatAttackDialog(attacker, defender, {
            onAttack: result => {
                this.attackDialog?.close({ force: true });
                this.attackDialog = undefined;
                if (this.combat) {
                    this.combat.updateAttackerData(result);
                    if (canOwnerReceiveMessage(defender.actor)) {
                        const newMsg = {
                            type: gmCombatType.Attack,
                            payload: { attackerTokenId: attacker.id, defenderTokenId: defender.id, result }
                        };
                        this.emit(newMsg);
                    }
                    else {
                        const { critic } = result.values;
                        try {
                            this.manageDefense(attacker, defender, result.type, critic);
                        }
                        catch (err) {
                            if (err) {
                                Log.error(err);
                            }
                            this.endCombat();
                        }
                    }
                }
            }
        }, { counterAttackBonus: bonus });
    }
    manageDefense(attacker, defender, attackType, critic) {
        this.defendDialog = new combatDefenseDialog({ token: attacker, attackType, critic }, defender, {
            onDefense: result => {
                if (this.defendDialog) {
                    this.defendDialog.close({ force: true });
                    this.defendDialog = undefined;
                    if (this.combat) {
                        this.combat.updateDefenderData(result);
                    }
                }
            }
        });
    }


    async managePlayerAttackRequest(msg) {

    }



}