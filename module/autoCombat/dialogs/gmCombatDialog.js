import { templates } from "../../utilities/templates.js";
import { findVar, shieldCheck, calculateDamage } from "../utilities.js";

import { rollCharacteristic, abilityRoll, rollCombatWeapon, openRollFunction, fumbleRollFunction, rollResistance, rollBreakage } from "../../diceroller.js";

const getInitialData = (attacker, defender, options = {}) => {
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    return {
        ui: {
            isCounter: options.isCounter ?? false,
            resistanceRoll: false,
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            customModifier: 0,
            rollResult: undefined,
            counterAttackBonus: options.counterAttackBonus,
            isReady: false,
        },
        defender: {
            token: defender,
            actor: defenderActor,
            customModifier: 0,
            rollResult: undefined,
            supernaturalShield: {
                doubleDamage: false,
                immuneToDamage: false,
            },
            isReady: false,
        },
    };
};
export class gmCombatDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));
        this.hooks = hooks;
        this.data = getInitialData(attacker, defender, options);

        this.render(true);
    }
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gmCombatDialog"],
            submitOnChange: true,
            closeOnSubmit: false,
            resizable: true,
            height: 500,
            width: 600,
            template: templates.dialog.combat.gmCombatDialog.main,
            title: "GM Combat",
        });
    }
    get attackerActor() {
        return this.data.attacker.token.actor;
    }
    get defenderActor() {
        return this.data.defender.token.actor;
    }
    get attackerToken() {
        return this.data.attacker;
    }
    get defenderToken() {
        return this.data.defender;
    }
    get isDamagingCombat() {
        const { attacker } = this.data;

        const isPhysicalDamagingCombat = attacker.result?.type === "combat" && attacker.result.values.damage.final !== 0;

        const isMysticDamagingCombat = attacker.result?.type === "mystic" && attacker.result.values.damage.final !== 0;

        const isPsychicDamagingCombat = attacker.result?.type === "psychic" && attacker.result.values.damage.final !== 0;

        return isPhysicalDamagingCombat || isMysticDamagingCombat || isPsychicDamagingCombat;
    }
    get canApplyDamage() {
        const { calculations } = this.data;

        if (!calculations) return false;
        if (calculations.canCounter) return false;

        const attackOverpassDefense = calculations.difference > 0;

        const hasDamage = calculations.damage !== undefined && calculations?.damage > 0;

        return this.isDamagingCombat && attackOverpassDefense && hasDamage;
    }

    async close(options = { executeHook: true }) {
        if (options?.executeHook) {
            await this.hooks.onClose();
        }
        return super.close();
    }
    activateListeners(html) {
        super.activateListeners(html);

        html.find('input[name="attacker.customModifier"]').on("change", this._onAttackerCustomModifierChange.bind(this));
        html.find('input[name="defender.customModifier"]').on("change", this._onDefenderCustomModifierChange.bind(this));
        html.find('input[name="attacker.updateRoll"]').on("click", this._onUpdateAttackRoll.bind(this));
        html.find('input[name="defender.updateRoll"]').on("click", this._onUpdateDefenseRoll.bind(this));
        html.find('input[name="defender.supernaturalShield.immuneToDamage"]').on("click", this._onShieldImmuneDamageRoll.bind(this));
        html.find('input[name="defender.supernaturalShield.doubleDamage"]').on("click", this._onShieldDoubleDamageRoll.bind(this));
        html.find(".combatMod-apply").on("click", this._onCombatModApply.bind(this));
        html.find(".calculate-attack").on("click", this._onCalculate.bind(this));
        html.find(".cancelButton").click(() => {
            this.close();
        });
        html.find(".make-counter").click(async () => {
            this.applyValuesIfAble();
            if (this.data.calculations?.canCounter) {
                this.hooks.onCounterAttack(this.data.calculations.counterAttackBonus);
            }
        });
        html.find(".apply-values").click(async () => {
            this.applyValuesIfAble();
            this.close();
        });
        html.find(".show-results").click(async () => {
            this.showResults();
        });
        html.find(".roll-resistance").click(async () => {
            const { value, type } = this.data.attacker.result.values?.resistanceEffect;

            const resistanceRoll = await this.rollResist(type, value, html);

            if (resistanceRoll._total < 0 && this.data.attacker.result.values.damage > 0) {
                this.defenderActor.applyDamage(this.data.attacker.result.values.damage);
            }
            this.data.calculations.resistanceResult = resistanceRoll._total;
            this.applyValuesIfAble(resistanceRoll._total);
            this.close();
        });

        html.find(".roll-crit").click(async () => {
            const resistanceRoll = await this.rollResist("Physical", 0, html);
            const critRoll = await this.rollCritic(this.data.calculations.critLevel, html);
            const critResult = critRoll[0].total - resistanceRoll._total;
            console.log("critResult");
            console.log(critResult);
            this.data.calculations.critResult = critResult;
            if (critResult > 0) {
                let location = "";
                if (critResult > 50) {
                    location = await this.rollCritLocation();
                }

                this.data.calculations.location = location;
                this.data.calculations.critResultRound = this.calculateCritResultRound(critResult);
            }
            this.applyValuesIfAble();
            this.close();
        });
    }

    getData() {
        return this.data;
    }

    async _updateObject(event, formData) {
        console.log(formData);
        this.data = mergeObject(this.data, formData);

        this.render();
    }

    async rollCritLocation() {
        const roll = await new Roll("1d100", this.data.attacker.actor).roll();
        let result = 1;
        switch (true) {
            case roll.total < 11:
                result = 1;
                break;
            case roll.total < 21:
                result = 11;
                break;
            case roll.total < 31:
                result = 21;
                break;
            case roll.total < 36:
                result = 31;
                break;
            case roll.total < 49:
                result = 36;
                break;
            case roll.total < 51:
                result = 49;
                break;
            case roll.total < 55:
                result = 51;
                break;
            case roll.total < 59:
                result = 55;
                break;
            case roll.total < 61:
                result = 59;
                break;
            case roll.total < 65:
                result = 61;
                break;
            case roll.total < 69:
                result = 65;
                break;
            case roll.total < 71:
                result = 69;
                break;
            case roll.total < 75:
                result = 71;
                break;
            case roll.total < 79:
                result = 75;
                break;
            case roll.total < 81:
                result = 79;
                break;
            case roll.total < 85:
                result = 81;
                break;
            case roll.total < 89:
                result = 85;
                break;
            case roll.total < 91:
                result = 89;
                break;
            case roll.total >= 91:
                result = 91;
                break;
        }
        const hitLocation = game.i18n.localize("abfalter.autoCombat.dialog.crit.location." + result + ".title");

        return hitLocation;
    }

    async rollCritic(critLevel, html) {
        const flavor = game.i18n.format("abfalter.autoCombat.dialog.physicalAttack.crit.title", {
            target: this.data.defender.token.name,
        });

        const roll = await abilityRoll(html, this.data.attacker.actor, critLevel, flavor);
        return roll;
    }

    async rollResist(type, value, html) {
        const resistance = this.defenderActor.system.resistances[type].final;
        let finalMod = resistance - value;
        const flavor = game.i18n.format("abfalter.autoCombat.dialog.physicalDefense.resist.title", {
            target: this.data.attacker.token.name,
        });

        const roll = await rollResistance(html, this.data.defender.actor, finalMod, flavor);
        return roll;
    }

    async applyValuesIfAble() {
        this.showResults();
        if (this.data.attacker.result?.type === "combat") {
            this.attackerActor.applyFatigue(this.data.attacker.result.values.fatigueUsed);
        }

        if (this.data.defender.result?.type === "combat") {
            this.defenderActor.applyFatigue(this.data.defender.result.values.fatigueUsed);
        }

        this.mysticCastEvaluateIfAble();
        this.accumulateDefensesIfAble();
        this.newSupernaturalShieldIfBeAble();

        if (this.canApplyDamage) {
            this.defenderActor.applyDamage(this.data.calculations.damage);
            if (this.data.calculations.critResult != undefined && this.data.calculations.critResult > 0) {
                this.defenderActor.applyAAMCrit(-this.data.calculations.critResult);
            }
        } else {
            this.applyDamageSupernaturalShieldIfBeAble();
        }

        //this.executeCombatMacro(resistanceRoll);
    }

    mysticCastEvaluateIfAble() {
        if (this.data.attacker.result?.type === "mystic") {
            const { spellCasting, spellName, spellGrade } = this.data.attacker.result.values;
            this.attackerActor.mysticCast(spellCasting, spellName, spellGrade);
        }

        if (this.data.defender.result?.type === "mystic") {
            const { spellCasting, spellName, spellGrade, supShield } = this.data.defender.result.values;
            if (supShield.create) {
                this.defenderActor.mysticCast(spellCasting, spellName, spellGrade);
            }
        }
    }

    newSupernaturalShieldIfBeAble() {
        console.log(this.data.defender.result);
        const { supShield } = this.data.defender.result?.values;
        if (this.data.defender.result?.type === "mystic" && supShield.create) {
            const shieldLP = shieldCheck(this.data.defender.result.spell.system.description, this.data.defender.result.spell.system[this.data.defender.result.values?.spellGrade].rollDesc);
            this.defenderActor.newSupernaturalShield(shieldLP);
        } else if (this.data.defender.result?.type === "psychic" && supShield.create) {
            const shieldLP = shieldCheck(this.data.defender.result.power.system.description, this.data.defender.result.power.system[this.data.defender.result.values?.powerLevel]);
            this.defenderActor.newSupernaturalShield(shieldLP);
        }
    }

    applyDamageSupernaturalShieldIfBeAble() {
        console.log("applyDamageSupernaturalShieldIfBeAble");
        const { doubleDamage, immuneToDamage } = this.data.defender.supernaturalShield;
        const defenderIsWinner = this.data.calculations.winner == this.data.defender.token;
        const damage = this.data.attacker.result?.values.damage;
        if (defenderIsWinner && (this.data.defender.result?.type === "mystic" || this.data.defender.result?.type === "psychic") && !immuneToDamage) {
            const newCombatResult = {
                attack: 0,
                armor: 0,
                halvedAbsorption: false,
            };

            if (this.isDamagingCombat) {
                const { attacker, defender } = this.data;

                newCombatResult.attack = attacker.rollResult.total + this.data.attacker.customModifier;
                newCombatResult.armor = defender.result.values.armor;
                newCombatResult.halvedAbsorption = defender.result.type === "resistance" ? defender.result.values.surprised : false;
            }

            console.log(damage);
            console.log(newCombatResult);
            console.log(doubleDamage);
            this.defenderActor.applyDamageSupernaturalShield(damage, doubleDamage, newCombatResult);
        }
    }

    accumulateDefensesIfAble() {
        if (this.data.defender.result?.type === "combat") {
            this.defenderActor.accumulateDefenses(this.data.defender.result.values?.accumulateDefenses);
        }
    }

    async resolveRoll(roll) {
        let rollResolved = await roll;
        console.log(rollResolved);
        console.log(rollResolved.length);
        let LastRoll = rollResolved[rollResolved.length - 1];
        console.log(LastRoll);
        return LastRoll;
    }
    async updateAttackerData(result) {
        const { attacker } = this.data;
        this.data.attacker.result = result;
        console.log("result*-------------------------------------------------------");
        console.log(attacker.result);

        attacker.rollResult = await this.resolveRoll(attacker.result.roll);
        console.log(attacker.result.roll);
        console.log(this.data.attacker.result.roll);
        console.log(attacker.result.roll.length);
        console.log(this.data.attacker.rollResult);
        this.data.attacker.isReady = true;
        //if combat/mystic/psychic
        if (result.type === "combat") {
            attacker.result.weapon = attacker.result.values.weapon;
        }

        if (result.type === "mystic") {
            attacker.result.spell = attacker.result.values.spell;
        }

        if (result.type === "psychic") {
            attacker.result.power = attacker.result.values.power;
        }

        this.render();
    }
    async updateDefenderData(result) {
        const { defender } = this.data;
        defender.result = result;
        defender.rollResult = await this.resolveRoll(defender.result.roll);
        defender.isReady = true;
        // if shield or marial
        if (result.type === "combat") {
            defender.result.weapon = defender.result.values.weapon;
        }
        if (result.type === "mystic") {
            defender.result.spell = defender.result.values.spell;
        }

        if (result.type === "psychic") {
            defender.result.power = defender.result.values.power;
        }
        this.render();
    }
    async _updateObject(event, formData) {
        this.render();
    }

    async showResults() {
        console.log(this.data.defender.token.texture.src);
        const data = {
            attacker: {
                name: this.data.attacker.token.name,
                img: this.data.attacker.token.texture.src,
            },
            defender: {
                name: this.data.defender.token.name,
                img: this.data.defender.token.texture.src,
                defenseType: this.data.defender.result.type
            },
            result: this.data.calculations?.difference,
            canCounter: this.data.calculations?.canCounter,
            isCrit: this.data.calculations.isCrit,
            defenseType: this.data.defender.result.type,
            attackType: this.data.attacker.result.type,
            
            shieldBreakDamage: this.data.calculations?.shieldBreakDamage || 0,
        };
        console.log(data);
        if (this.data.calculations?.canCounter) {
            data.bonus = this.data.calculations.counterAttackBonus;
            if(this.data.defender.supernaturalShield.immuneToDamage){
                data.rawDamage = 0;
            }else if (this.data.defender.supernaturalShield.doubleDamage){
                data.rawDamage = this.data.attacker.result.values.damage.final*2;
            }else{
                data.rawDamage = this.data.attacker.result.values.damage.final;
            }
            
        }
        data.damage = this.data.calculations?.damage;
        if (this.data.calculations.isCrit) {
            data.critLevel = this.data.calculations.critLevel;
            data.critResult = this.data.calculations.critResult;
            if (data.critResult > 0) {
                data.critResultRound = this.data.calculations.critResultRound;
                data.location = this.data.calculations.location;
            }
        }
        if (this.data.ui.resistanceRoll) {
            data.resistanceEffect = this.data.attacker.result.values?.resistanceEffect.effects.join(" -> ");
            data.resistanceResult = this.data.calculations.resistanceResult;
        }

        console.log("result should be here");
        console.log(data.defender.defenseType);
        await renderTemplate(templates.chat.combatResult, data).then((content) => {
            ChatMessage.create({
                content,
            });
        });
    }

    calculateCritResultRound(critResult) {
        let result = 1;
        switch (true) {
            case critResult < 51:
                result = 1;
                break;
            case critResult < 101:
                result = 51;
                break;
            case critResult < 151:
                result = 101;
                break;
            case critResult >= 151:
                result = 151;
                break;
            default:
                console.error(`This is not a crit. This should never have happened`);
                break;
        }

        return result;
    }

    _onAttackerCustomModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.attacker.customModifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onDefenderCustomModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.customModifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    async _onUpdateAttackRoll(event) {
        event.preventDefault();
        const temp = await this.resolveRoll(this.data.attacker.result.roll);
        this.data.attacker.rollResult = temp; // Update the modifier
        console.log(this.data.attacker.rollResult);
        console.log(this.data.attacker.token);
        this._updateObject(event); // Call the update method with the updated data
    }
    async _onUpdateDefenseRoll(event) {
        event.preventDefault();
        const temp = await this.resolveRoll(this.data.defender.result.roll);
        this.data.defender.rollResult = temp; // Update the modifier
        console.log(this.data.defender.token);
        this._updateObject(event); // Call the update method with the updated data
    }
    _onShieldDoubleDamageRoll(event) {
        event.preventDefault();
        this.data.defender.supernaturalShield.doubleDamage = !this.data.defender.supernaturalShield.doubleDamage; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onShieldImmuneDamageRoll(event) {
        event.preventDefault();
        this.data.defender.supernaturalShield.immuneToDamage = !this.data.defender.supernaturalShield.immuneToDamage; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onCombatModApply(event) {
        event.preventDefault();
        const targetApply = event.target.name;
        const targetValue = targetApply.replace(/.apply/, ".value");

        let targetApplyVar = findVar(this.data, targetApply);
        let targetValueVar = findVar(this.data, targetValue);
        const arrayTarget = targetApply.split(".");

        this.data[arrayTarget[0]][arrayTarget[1]][arrayTarget[2]][arrayTarget[3]][arrayTarget[4]][arrayTarget[5]] = !targetApplyVar;
        if (targetApplyVar) {
            this.data[arrayTarget[0]].rollResult.total -= targetValueVar;
        } else {
            this.data[arrayTarget[0]].rollResult.total += targetValueVar;
        }

        this._updateObject(event); // Call the update method with the updated data
    }

    _onCalculate(event) {
        event.preventDefault();
        const { attacker, defender } = this.data;

        if (attacker.result && defender.result) {
            const attackerTotal = attacker.rollResult.total + attacker.customModifier;
            const defenderTotal = defender.rollResult.total + defender.customModifier;

            const winner = attackerTotal > defenderTotal ? attacker.token : defender.token;

            const armor = Math.max(0, defender.result.values?.armor - attacker.result.values.damage?.atPen);

            const armorResistance = armor * 10 + 20;

            if (this.isDamagingCombat) {
                const combatResult = calculateCombatResult(
                    attackerTotal,
                    defenderTotal,
                    armor,
                    attacker.result.values.damage.final,
                    defender.result.type === "resistance" ? defender.result.surprised : false
                );

                const distance = attacker.result.distance;
                const projectile = attacker.result.values.projectile;

                if (combatResult.canCounterAttack && (!projectile.value || distance.check || (distance.enable && distance.value <= 1))) {
                    const shieldValue = defender.actor.system.shield.value - attacker.result.values.damage.final;
                    console.log("qsdkldjlqs-----------------------");
                    console.log(shieldValue);
                    if (defender.result.type == "combat" || shieldValue > 0) {
                        this.data.calculations = {
                            difference: attackerTotal - defenderTotal,
                            armorResistance,
                            canCounter: true,
                            isCrit: false,
                            winner,
                            counterAttackBonus: combatResult.counterAttackBonus,
                        };
                    } else {
                        const shieldBreak = calculateCombatResult(attackerTotal, 0, armor, Math.abs(shieldValue), defender.result.type === "resistance" ? defender.result.surprised : false);
                        console.log(shieldBreak);
                        this.data.calculations = {
                            difference: attackerTotal - defenderTotal,
                            armorResistance,
                            canCounter: true,
                            isCrit: shieldBreak.damage >= defender.actor.system.lp.value / 2,
                            critLevel: calculateCritLevel(defender, shieldBreak.damage),
                            winner,
                            counterAttackBonus: combatResult.counterAttackBonus,
                            shieldBreakDamage: shieldBreak.damage,
                        };
                        console.log(this.data.calculations);
                    }
                } else {
                    this.data.calculations = {
                        difference: attackerTotal - defenderTotal,
                        armorResistance,
                        canCounter: false,
                        isCrit: combatResult.damage >= defender.actor.system.lp.value / 2,
                        critLevel: calculateCritLevel(defender, combatResult.damage),
                        winner,
                        damage: combatResult.damage,
                    };
                }
            } else {
                this.data.calculations = {
                    difference: attackerTotal - defenderTotal,
                    armorResistance,
                    canCounter: false,
                    isCrit: false,
                    winner,
                };
            }

            const minimumDamage10 = this.data.calculations.difference - armorResistance >= 10;
            if (winner === attacker.token) {
                if (minimumDamage10) {
                    if (attacker.result.values?.resistanceEffect.check) {
                        this.data.ui.resistanceRoll = true;
                    }
                }
            }
            if (winner === defender.token || !minimumDamage10) {
                this.data.ui.resistanceRoll = false;
            }
        }
        this._updateObject(event); // Call the update method with the updated data
    }
}

export const calculateCombatResult = (attack, defense, armor, damage, halvedAbsorption = false) => {
    if (attack < defense) {
        return {
            canCounterAttack: true,
            counterAttackBonus: Math.floor(((defense - attack - 1) / 2)/5) * 5,
        };
    } else {
        const result = calculateDamage(attack, defense, armor, damage, halvedAbsorption);
        return {
            canCounterAttack: false,
            damage: result,
        };
    }
};

export const calculateCritLevel = (defender, damageTotal, critBonus = 0) => {
    const total = damageTotal + critBonus;

    if (defender.actor.system.toggles.dmgRes) {
        return total / 2;
    } else {
        if (total > 200) {
            return 200 + (total - 200) / 2;
        } else {
            return total;
        }
    }
};
