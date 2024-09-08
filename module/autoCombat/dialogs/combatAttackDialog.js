import { templates } from "../../utilities/templates.js";
import abfalterRoll from "../../rolls/abfalterRolls.js";
import { rollCharacteristic, abilityRoll, rollCombatWeapon, openRollFunction, fumbleRollFunction, rollResistance, rollBreakage } from "../../diceroller.js";

const getInitialData = (attacker, defender, options = {}) => {
    const showRollByDefault = true; // !!game.settings.get('animabf', ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT);
    const isGM = !!game.user?.isGM;
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    const combatDistance = true; // !!game.settings.get('animabf',ABFSettingsKeys.AUTOMATE_COMBAT_DISTANCE);
    return {
        ui: {
            isGM,
            hasFatiguePoints: attackerActor.system.fatigue.value > 0,
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            showRoll: !isGM || showRollByDefault,
            withoutRoll: false,
            poorVisibility: false,
            targetInCover: false,
            zen: false,//attackerActor.system.general.settings.zen.value,
            inhuman: false,//attackerActor.system.general.settings.inhuman.value,
            immaterial: false,//attackerActor.system.general.settings.immaterial.value,
            distance: {
                value: 0,
                enable: combatDistance,
                check: false
            },
            combat: {
                counterAttackBonus: options.counterAttackBonus || 0,
                fatigueUsed: 0,
                modifier: 0,
                unarmed: false,
                weaponsList: undefined,
                weaponUsed: undefined,
                weapon: undefined,
                visible: true,
                highGround: false,
                distanceCheck: false,
                projectile: {
                    value: false,
                    type: ''
                },
                damage: {
                    base: 0,
                    special: 0,
                    final: 0,
                    atPen: 0,
                    type: undefined,
                },
            } /*,
            mystic: {
                modifier: 0,
                magicProjection: {
                base: attackerActor.system.mystic.magicProjection.imbalance.offensive.base.value,
                final: attackerActor.system.mystic.magicProjection.imbalance.offensive.final.value,
                },
                spellUsed: undefined,
                spellGrade: 'base',
                attainableSpellGrades: [],
                spellCasting: {
                zeon: { accumulated: 0, cost: 0 },
                canCast: { prepared: false, innate: false },
                casted: { prepared: false, innate: false },
                override: false
                },
                overrideMysticCast: false,
                critic: NoneWeaponCritic.NONE,
                resistanceEffect: { value: 0, type: undefined, check: false },
                visible: false,
                distanceCheck: false,
                projectile: {
                value: true,
                type: 'shot'
                },
                damage: {
                special: 0,
                final: 0
                }
            },
            mystic: {
                modifier: 0,
                magicProjectionType: 'normal',
                spellUsed: undefined,
                spellGrade: 'base',
                critic: NoneWeaponCritic.NONE,
                damage: 0
            },
            psychic: {
                modifier: 0,
                psychicProjection: attackerActor.data.data.psychic.psychicProjection.imbalance.offensive.final.value,
                psychicPotential: { special: 0, final: attackerActor.data.data.psychic.psychicPotential.final.value },
                powerUsed: undefined,
                critic: NoneWeaponCritic.NONE,
                damage: 0
            },
            psychic: {
                modifier: 0,
                psychicProjection:
                attackerActor.system.psychic.psychicProjection.imbalance.offensive.final.value,
                psychicPotential: {
                special: 0,
                final: attackerActor.system.psychic.psychicPotential.final.value
                },
                powerUsed: undefined,
                critic: NoneWeaponCritic.NONE,
                eliminateFatigue: false,
                mentalPatternImbalance: false,
                resistanceEffect: { value: 0, type: undefined, check: false },
                visible: false,
                distanceCheck: false,
                projectile: {
                value: true,
                type: 'shot'
                },
                damageModifier: 0,
            }*/,
        },
        defender: {
            token: defender,
            actor: defenderActor,
        },
        attackSent: false,
        allowed: false,
    };
};
export class combatAttackDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));
        this.data = getInitialData(attacker, defender, options);
        const { combat } = this.data.attacker

        if (this.data.attacker.distance.enable) {
            console.log(canvas.grid)
            const calculateDistance = canvas.grid.measureDistance(
                this.data.attacker.token,
                this.data.defender.token,
                { gridSpaces: true }
            ) / canvas.grid.distance;
            this.data.attacker.distance.value = calculateDistance;
        }


        const weapons = attacker.actor.items.filter((item) => item.type === "weapon"); //filters through actor items for weapons
        this.data.attacker.combat.weaponsList = weapons; //sends filtered weapons to form data
        if (weapons.length > 0) {
            combat.weaponUsed = weapons[0]._id; //sets first weapon on select list
            combat.weapon = weapons[0]
            combat.damage.base = combat.weapon.system.finalDmg
            combat.damage.final = combat.weapon.system.finalDmg
        } else {
            combat.unarmed = true;
        }
        this.data.allowed = game.user?.isGm || (options.allowed ?? false);
        this.hooks = hooks;
        this.render(true);
    }


    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["combatAttackDialog noClose"],
            submitOnChange: true,
            closeOnSubmit: false,
            resizable: true,
            width: null,
            height: null,
            template: templates.dialog.combat.combatAttackDialog.main,
            title: "Attacker",
            tabs: [
                {
                    navSelector: ".sheet-tabs",
                    contentSelector: ".sheet-body",
                    initial: "combat",
                },
            ],
        });
    }
    get attackerActor() {
        return this.data.attacker.token.actor;
    }
    updatePermissions(allowed) {
        //checks if user is waiting or is allowed to input
        this.data.allowed = allowed;
        this.render();
    }
    async close(options) {
        if (options?.force) {
          return super.close(options);
        }
        // eslint-disable-next-line no-useless-return,consistent-return
        return;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('select[name="attacker.combat.weaponUsed"]').on("change", this._onWeaponSelectionChange.bind(this));
        html.find('select[name="attacker.combat.weaponUsed"]').on("load", this._onWeaponSelectionLoad.bind(this));
        html.find('select[name="attacker.combat.weaponType"]').on("change", this._onWeaponTypeChange.bind(this));
        html.find('input[name="attacker.combat.fatigueUsed"]').on("change", this._onFatigueChange.bind(this));
        html.find('input[name="attacker.combat.modifier"]').on("change", this._onModifierChange.bind(this));
        html.find('input[name="attacker.combat.damage.special"]').on("change", this._onDamageModifierChange.bind(this));

        html.find(".sendNormAttack").click(async () => {
            const {distance,highGround,poorVisibility, targetInCover, combat: { fatigueUsed, modifier, counterAttackBonus, unarmed, weaponsList, weaponUsed, damage }} = this.data.attacker; // from getInitial Data stuff
            //console.log(this.data.attacker.combat);

            let finalMod = 0;
            const weapon = weaponsList.find((w) => w._id === weaponUsed);
            this.data.attacker.combat.weapon = weapon;
            if (unarmed) {
                damage.type = "IMP";
                damage.base = this.data.attacker.actor.system.fistDamage.final;
            } else {
                if (damage.type === undefined) {
                    damage.type = weapon.system.primDmgT;
                }

                if (this.data.attacker.combat.projectile.value /*weapon?.system.isRanged*/) {
                    let projectile = {
                      value: true,
                      type: weapon.system.shotType.value
                    };
                    if (weapon.system.shotType.value === 'shot') {
                      projectile.name = weapon.system.ammo?.name
                    }
                    if (
                      (!distance.enable && distance.check) ||
                      (distance.enable && distance.value <= 1)
                    ) {
                        finalMod += 30;
                    }
                    if (highGround) {
                      finalMod += 20;
                    }
                    if (poorVisibility) {
                        finalMod += -20;
                    }
                    if (targetInCover) {
                      finalMod += -40;
                    }
                }
                damage.base = weapon.system.finalDmg;
            }
            damage.atPen = weapon.system.atPenFinal;
            damage.final = damage.base + damage.special;
            this.attackerActor.setFlag('abfalter', 'lastOffensiveWeaponUsed', weaponUsed);



            console.log(weapon);
            this.data.attackSent = true;

            console.log(this.data.attacker.actor);
            finalMod += weapon.system.finalAtk + Math.floor(fatigueUsed * 15) + modifier + counterAttackBonus;
            if (damage.type == weapon.system.secDmgT) {
                finalMod += -20;
            }
            //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
            //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);
            const roll = rollCombatWeapon(html, this.data.attacker.actor, finalMod, game.i18n.localize("abfalter.dialogs.rollingAtk"), weapon.system.complex);

            const result = {
                roll: roll,
                combat: this.data.attacker.combat,
                resultTotal: -1,
                type: "combat",
            };
            this.hooks.onAttack(result);

            this.render();
        });
        html.find(".sendMysticAttack").click(() => {
            const { weapon, criticSelected, modifier, fatigueUsed, damage } = this.data.attacker.combat; // from getInitial Data stuff
            if (typeof damage !== "undefined") {
                this.data.attackSent = true;
                this.render();
            }
        });
        html.find(".sendPsychicAttack").click(() => {
            const { weapon, criticSelected, modifier, fatigueUsed, damage } = this.data.attacker.combat; // from getInitial Data stuff
            if (typeof damage !== "undefined") {
                this.data.attackSent = true;
                this.render();
            }
        });
    }

    getData() {
        const weapons = this.attackerActor.items.filter((item) => item.type === "weapon");
        return this.data;
    }

    _onWeaponSelectionLoad(event) {
        if (this.data.attacker.combat.weaponsList.length > 0) {
            this.data.attacker.combat.weaponUsed = this.data.attacker.combat.weaponsList[0]._id; // Update the selected weapon
            this.data.attacker.combat.weapon = this.data.attacker.combat.weaponsList[0];
        }
    }

    _onWeaponSelectionChange(event) {
        event.preventDefault();
        const selectedWeaponId = event.target.value;
        this.data.attacker.combat.weaponUsed = selectedWeaponId; // Update the selected weapon
        this.data.attacker.combat.weapon = this.data.attacker.combat.weaponsList.find((w) => w._id === selectedWeaponId);
        this.data.attacker.combat.damage.type = this.data.attacker.combat.weapon.primDmgT;
        this.data.attacker.combat.damage.base = this.data.attacker.combat.weapon.system.finalDmg
        this._updateObject(event); // Call the update method with the updated data
    }
    _onWeaponTypeChange(event) {
        event.preventDefault();
        const selectedWeaponType = event.target.value;
        console.log(event.target.value);
        this.data.attacker.combat.damage.type = selectedWeaponType; // Update the selected weapon
        this._updateObject(event); // Call the update method with the updated data
    }
    _onFatigueChange(event) {
        event.preventDefault();
        console.log(event);
        const fatigueUsedValue = event.target.value;
        this.data.attacker.combat.fatigueUsed = parseInt(fatigueUsedValue); // Update the fatigue used
        this._updateObject(event); // Call the update method with the updated data
    }
    _onModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.attacker.combat.modifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onDamageModifierChange(event) {
        event.preventDefault();
        const damageModifierValue = event.target.value;
        this.data.attacker.combat.damage.special = parseInt(damageModifierValue); // Update the modifier
        this.data.attacker.combat.damage.final = this.data.attacker.combat.damage.base + this.data.attacker.combat.damage.special
        this._updateObject(event); // Call the update method with the updated data
    }

    async _updateObject(event, formData) {
        this.render();
    }
}
