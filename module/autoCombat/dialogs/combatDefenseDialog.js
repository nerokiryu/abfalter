import { templates } from "../../utilities/templates.js";
import { otherResistanceEffectCheck, resistanceEffectCheck, mysticCanCastEvaluate, evaluateCast } from "../utilities.js";
import { rollCharacteristic, abilityRoll, rollCombatWeapon, openRollFunction, fumbleRollFunction, rollResistance, rollBreakage } from "../../diceroller.js";

const getInitialData = (attacker, defender, options = {}) => {
    //const showRollByDefault = !!game.settings.get('abfalter', ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT);
    const isGM = !!game.user?.isGM;
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    const activeTab = defenderActor.system.toggles.dmgRes ? "damageResistance" : "combat";

    const defensesCounter = /*defenderActor.getFlag('abfalter', 'defensesCounter') ||*/ {
        accumulated: 0,
        keepAccumulating: true,
    };

    return {
        ui: {
            isGM,
            hasFatiguePoints: defenderActor.system.fatigue.value > 0,
            activeTab,
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            visible: options.result.values.visible,
            projectile: options.result.values.projectile,
            attackType: options.result.values.type || "combat",
            damageType: options.damageType,
            damagePen: options.atPen || 0,
        },
        defender: {
            token: defender,
            actor: defenderActor,
            showRoll: !isGM, // || showRollByDefault,
            withoutRoll: false,
            blindness: false,
            distance: options.result.values.distance,
            zen: false, //attackerActor.system.general.settings.zen.value,
            inhuman: false, //attackerActor.system.general.settings.inhuman.value,
            immaterial: false, //attackerActor.system.general.settings.immaterial.value,
            combat: {
                fatigueUsed: 0,
                multipleDefensesPenalty: defensesCounterCheck(defensesCounter),
                accumulateDefenses: defensesCounter.keepAccumulating,
                modifier: 0,
                armor: 0,
                supernaturalShield: {
                    shieldUsed: undefined,
                    shieldValue: 0,
                    newShield: true,
                },
                unarmed: false,
                weaponsList: undefined,
                weaponUsed: undefined,
                weapon: undefined,
                defenseType: "block",
            },
            mystic: {
                modifier: 0,
                magicProjection: {
                    base: defenderActor.system.mproj.finalDefensive,
                    special: 0,
                    final: defenderActor.system.mproj.finalDefensive,
                },
                spell: undefined,
                spells: undefined,
                spellUsed: undefined,
                spellGrade: "base",
                attainableSpellGrades: [],
                spellCasting: {
                    zeon: { accumulated: defenderActor.system.maccu.actual, cost: 0 },
                    canCast: { prepared: false, innate: false },
                    casted: { prepared: false, innate: false },
                    override: false,
                },
                overrideMysticCast: false,
                supernaturalShield: {
                    shieldValue: 0,
                    newShield: true,
                },
                finalIntelligence: 0,
            },
            resistance: {
                surprised: false,
            } /*,
            psychic: {
                modifier: 0,
                psychicProjection: attackerActor.data.data.psychic.psychicProjection.imbalance.defensive.final.value,
                psychicPotential: { special: 0, final: attackerActor.data.data.psychic.psychicPotential.final.value },
                powerUsed: undefined,
                critic: NoneWeaponCritic.NONE,
                damage: 0
            }*/,
        },
        defenseSent: false,
        allowed: false,
    };
};

export class combatDefenseDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));

        this.data = getInitialData(attacker, defender, options);
        const { combat, mystic } = this.data.defender;
        const supernaturalShields = this.defenderActor.system.shield;

        const weapons = defender.actor.items.filter((item) => item.type === "weapon"); //filters through actor items for weapons
        this.data.defender.combat.weaponsList = weapons; //sends filtered weapons to form data
        if (weapons.length > 0) {
            const lastDefensiveWeaponUsed = this.defenderActor.getFlag("abfalter", "lastDefensiveWeaponUsed");
            if (weapons.find((w) => w._id === lastDefensiveWeaponUsed)) {
                combat.weaponUsed = lastDefensiveWeaponUsed;
            } else {
                combat.weaponUsed = weapons[0]._id; //sets first weapon on select list
            }
            combat.weapon = weapons.find((w) => w._id === combat.weaponUsed);
        } else {
            combat.unarmed = true;
        }

        const spells = defender.actor.items.filter((item) => item.type === "spell"); //filters through actor items for spells
        this.data.defender.mystic.spells = spells; //sends filtered spells to form data
        const aptitudeForMagicDevelopment = false;

        const intelligence = this.defenderActor.system.stats.Intelligence.final;
        const finalIntelligence = aptitudeForMagicDevelopment ? intelligence + 3 : intelligence;
        this.data.defender.mystic.finalIntelligence = finalIntelligence;

        if (spells.length > 0) {
            const lastOffensiveSpellUsed = this.defenderActor.getFlag("abfalter", "lastDefensiveSpellUsed");
            if (spells.find((w) => w._id === lastOffensiveSpellUsed)) {
                mystic.spellUsed = lastOffensiveSpellUsed;
            } else {
                mystic.spellUsed = spells.find((w) => w.system.type === "Defense")?._id;
            }
            const spellCastingOverride = this.defenderActor.getFlag("abfalter", "spellCastingOverride");
            mystic.spellCasting.override = spellCastingOverride || false;
            mystic.overrideMysticCast = spellCastingOverride || false;
            const spell = spells.find((w) => w._id === mystic.spellUsed);
            mystic.spell = spell;
            //mystic.critic = spell?.system.critic.value ?? NoneWeaponCritic.NONE;
            const spellGrades = ["basic", "intermediate", "advanced", "arcane"];
            if (this.data.defender.mystic.spellCasting.override) {
                mystic.attainableSpellGrades = spellGrades;
            } else {
                spellGrades.forEach((grade) => {
                    if (finalIntelligence >= spell?.system[grade].intReq) {
                        mystic.attainableSpellGrades.push(grade);
                    }
                });
            }
            if (mystic.attainableSpellGrades.length > 0) {
                mystic.spellGrade = mystic.attainableSpellGrades[0];
            }

            if (spell) {
                mystic.spellCasting = mysticCanCastEvaluate(this.defenderActor, spell, mystic.spellGrade, mystic.spellCasting.casted, mystic.spellCasting.override);
            }
        }

        if (this.defenderActor.system.shield.value > 0) {
            mystic.supernaturalShield = {
                shieldValue: this.defenderActor.system.shield.value,
                newShield: false,
            };

            /*             if (psychicShield) {
                psychic.supernaturalShield = {
                    shieldValue: psychicShield?.system.shieldPoints,
                    newShield: false,
                };
            } */
        }


        // TBD: WAITING FOR A WAY TO KNOW IF USER CAN PERCEIVE MYST/PSY
        const perceiveMystic = true;
        const perceivePsychic = true;
        let attackType = this.data.attacker.attackType;
        if (!this.data.attacker.visible) {
            if (!perceiveMystic && !perceivePsychic) {
                this.data.defender.blindness = true;
            } else if (attackType === "mystic" && !perceiveMystic) {
                this.data.defender.blindness = true;
            } else if (attackType === "psychic" && !perceivePsychic) {
                this.data.defender.blindness = true;
            }
        }

        this.data.allowed = game.user?.isGm || (options.allowed ?? false);
        this.hooks = hooks;
        this.render(true);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["combatDefenseDialog noClose"],
            submitOnChange: true,
            closeOnSubmit: false,
            width: null,
            height: null,
            resizable: true,
            template: templates.dialog.combat.combatDefenseDialog.main,
            title: "Defender",
            tabs: [
                {
                    navSelector: ".sheet-tabs",
                    contentSelector: ".sheet-body",
                    initial: "combat",
                },
            ],
        });
    }
    get defenderActor() {
        return this.data.defender.token.actor;
    }
    updatePermissions(allowed) {
        //checks if user is waiting or is allowed to input
        this.data.allowed = allowed;
        this.render();
    }

    getData() {
        const {
            defender: { combat, psychic, mystic },
            ui,
        } = this.data;
        ui.hasFatiguePoints = this.defenderActor.system.fatigue.value > 0;

        return this.data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('select[name="defender.combat.weaponUsed"]').on("change", this._onWeaponSelectionChange.bind(this));
        html.find('select[name="defender.combat.defenseType"]').on("change", this._onDefenseTypeSelectionChange.bind(this));
        html.find('input[name="defender.combat.fatigueUsed"]').on("change", this._onFatigueChange.bind(this));
        html.find('input[name="defender.combat.modifier"]').on("change", this._onModifierChange.bind(this));
        html.find('select[name="defender.combat.multipleDefensesPenalty"]').on("change", this._onMultipleDefensesPenaltyChange.bind(this));
        html.find('input[name="defender.combat.accumulateDefenses"]').on("change", this._onAccumulateDefensesChange.bind(this));

        html.find('input[name="defender.mystic.modifier"]').on("change", this._onMysticModifierChange.bind(this));
        html.find('select[name="defender.mystic.spellUsed"]').on("change", this._onMysticSpellSelectionChange.bind(this));
        html.find('select[name="defender.mystic.spellGrade"]').on("change", this._onMysticSpellGradeSelectionChange.bind(this));
        html.find('input[name="defender.mystic.spellCasting.casted.innate"]').on("change", this._onMysticCastInnateChange.bind(this));
        html.find('input[name="defender.mystic.spellCasting.casted.prepared"]').on("change", this._onMysticCastPreparedChange.bind(this));
        html.find('input[name="defender.mystic.supernaturalShield.shieldValue"]').on("change", this._onMysticShieldValueChange.bind(this));
        html.find('input[name="defender.mystic.supernaturalShield.newShield"]').on("change", this._onMysticNewShieldChange.bind(this));
        html.find('input[name="defender.mystic.spellCasting.override"]').on("change", this._onMysticOverrideMysticCastChange.bind(this));

        html.find(".sendNormDefense").click(async (e) => {
            const {
                combat: { fatigueUsed, modifier, defenseType, unarmed, weaponsList, weapon, multipleDefensesPenalty, armor, accumulateDefenses, weaponUsed },
                blindness,
                distance,
            } = this.data.defender;

            console.log(this.data.defender.combat);
            this.defenderActor.setFlag("abfalter", "lastDefensiveWeaponUsed", weaponUsed);
            console.log(weapon);
            this.data.defenseSent = true;
            console.log(this.data.defender.actor);

            const type = e.currentTarget.dataset.type === "dodge" ? "dodge" : "block";
            this.data.defender.combat.defenseType = type;

            let value;
            let baseDefense;
            const defenderCombatMod = {
                modifier: { value: modifier, apply: true },
                fatigueUsed: { value: fatigueUsed * 15, apply: true },
                multipleDefensesPenalty: {
                    value: +multipleDefensesPenalty,
                    apply: true,
                },
            };

            if (blindness) {
                defenderCombatMod.blindness = { value: -80, apply: true };
            }
            const projectileType = this.data.attacker.projectile?.type;

            if (this.data.defender.combat.defenseType === "dodge") {
                value = weapon.system.finalDod;
                baseDefense = this.defenderActor.system.combatValues.dodge.final;
                const mastery = baseDefense >= 200;
                if (((!distance.enable && !distance.check) || (distance.enable && distance.value > 1)) && projectileType == "shot" && !mastery) {
                    defenderCombatMod.dodgeProjectile = {
                        value: -30,
                        apply: true,
                    };
                }
            } else {
                value = weapon ? weapon.system.finalBlk : this.defenderActor.system.combat.block.final.value;
                baseDefense = this.defenderActor.system.combatValues.block.final;
                const isShield = weapon?.system.shield !== "none";
                const mastery = baseDefense >= 200;
                if (!distance.check || (distance.enable && distance.value > 1)) {
                    if (projectileType == "shot") {
                        if (!mastery) {
                            if (!isShield) {
                                defenderCombatMod.parryProjectile = {
                                    value: -80,
                                    apply: true,
                                };
                            } else {
                                defenderCombatMod.shieldParryProjectile = {
                                    value: -30,
                                    apply: true,
                                };
                            }
                        } else if (!isShield) {
                            defenderCombatMod.masteryParryProjectile = {
                                value: -20,
                                apply: true,
                            };
                        }
                    }
                    if (projectileType == "throw") {
                        if (!mastery) {
                            if (!isShield) {
                                defenderCombatMod.parryThrow = {
                                    value: -50,
                                    apply: true,
                                };
                            }
                        }
                    }
                }
            }
            let combatModifier = 0;
            for (const key in defenderCombatMod) {
                combatModifier += defenderCombatMod[key]?.value ?? 0;
            }

            let damageType = this.data.attacker.damageType;
            let armorType = Object.keys(this.data.defender.actor.system.armor.body).filter((key) => key.toUpperCase().includes(damageType));
            this.data.defender.combat.armor = this.data.defender.actor.system.armor.body[armorType[0]];

            const flavor = game.i18n.format(`abfalter.autoCombat.dialog.physicalDefense.${type}.title`, {
                target: this.data.attacker.token.name,
            });
            //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
            //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);
            const roll = rollCombatWeapon(html, this.data.defender.actor, combatModifier, flavor, weapon.system.complex);
            const result = {
                roll: roll,
                type: "combat",
                values: {
                    defenseType: type,
                    modifier: combatModifier,
                    fatigueUsed,
                    armor,
                    defense: value,
                    accumulateDefenses,
                    defenderCombatMod,
                    unarmed,
                    weapon,
                    weaponsList,
                    weaponUsed,
                    unarmed,
                    multipleDefensesPenalty,
                },
            };
            this.hooks.onDefense(result);
            this.render();
        });
        html.find(".send-defense-damage-resistance").click(() => {
            let damageType = this.data.attacker.damageType;
            let armorType = Object.keys(this.data.defender.actor.system.armor.body).filter((key) => key.toUpperCase().includes(damageType));
            this.data.defender.combat.armor = this.data.defender.actor.system.armor.body[armorType[0]];

            const { armor } = this.data.defender.combat;
            const { surprised } = this.data.defender.resistance;
            this.hooks.onDefense({
                type: "resistance",
                values: {
                    modifier: 0,
                    armor,
                    surprised,
                    total: 0,
                },
            });

            this.data.defenseSent = true;

            this.render();
        });

        html.find(".sendMysticDefense").click(() => {
            const {
                mystic: {
                    magicProjection,
                    modifier,
                    spell,
                    spells,
                    spellUsed,
                    spellGrade,
                    spellCasting,
                    supernaturalShield: { shieldUsed, newShield },
                },
                blindness,
            } = this.data.defender;

            let supShield;
            const defenderCombatMod = {
                modifier: { value: modifier, apply: true },
            };
            if (blindness) {
                defenderCombatMod.blindness = { value: -80, apply: true };
            }

            if (!newShield) {
                supShield = { create: false, id: shieldUsed };
            } else if (spellUsed) {
                this.defenderActor.setFlag("abfalter", "spellCastingOverride", spellCasting.override);
                this.defenderActor.setFlag("abfalter", "lastDefensiveSpellUsed", spellUsed);
                spellCasting.zeon.cost = spell?.system[spellGrade].zeonCost;
                if (evaluateCast(spellCasting)) {
                    this.data.defender.mystic.overrideMysticCast = true;
                    return;
                }
                supShield = { create: true };
            }

            let damageType = this.data.attacker.damageType;
            let armorType = Object.keys(this.data.defender.actor.system.armor.body).filter((key) => key.toUpperCase().includes(damageType));
            this.data.defender.combat.armor = this.data.defender.actor.system.armor.body[armorType[0]];

            let combatModifier = 0;
            for (const key in defenderCombatMod) {
                combatModifier += defenderCombatMod[key]?.value ?? 0;
            }
            let finalMod = magicProjection.final + combatModifier;
            const flavor = game.i18n.format("abfalter.autoCombat.dialog.magicDefense.title", {
                spell: spell.name,
                target: this.data.attacker.token.name,
            });

            const roll = abilityRoll(html, this.data.defender.actor, finalMod, flavor);

            this.hooks.onDefense({
                type: "mystic",
                roll: roll,
                values: {
                    modifier: combatModifier,
                    magicProjection: magicProjection.final,
                    spellGrade,
                    spellUsed,
                    spells,
                    spell,
                    spellName: spell.name,
                    armor: this.data.defender.combat.armor,
                    spellCasting,
                    supShield,
                    defenderCombatMod,
                },
            });

            this.data.defenseSent = true;
            this.render();
        });

        html.find(".sendPsychicAttack").click(() => {
            const { weapon, criticSelected, modifier, fatigueUsed, damage } = this.data.defender.combat; // from getInitial Data stuff
            if (typeof damage !== "undefined") {
                this.data.attackSent = true;
                this.render();
            }
        });
    }

    _onWeaponSelectionChange(event) {
        event.preventDefault();
        const selectedWeaponId = event.target.value;
        this.data.defender.combat.weaponUsed = selectedWeaponId; // Update the selected weapon
        this.data.defender.combat.weapon = this.data.defender.combat.weaponsList.find((w) => w._id === selectedWeaponId);
        this._updateObject(event); // Call the update method with the updated data
    }
    _onDefenseTypeSelectionChange(event) {
        event.preventDefault();
        const selectedDefenseType = event.target.value;
        this.data.defender.combat.defenseType = selectedDefenseType; // Update the selected weapon
        this._updateObject(event); // Call the update method with the updated data
    }
    _onFatigueChange(event) {
        event.preventDefault();
        console.log(event);
        const fatigueUsedValue = event.target.value;
        this.data.defender.combat.fatigueUsed = parseInt(fatigueUsedValue); // Update the fatigue used
        this._updateObject(event); // Call the update method with the updated data
    }
    _onModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.combat.modifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onMultipleDefensesPenaltyChange(event) {
        event.preventDefault();
        console.log(event.target.value);
        const multipleDefensesPenaltyValue = event.target.value;
        this.data.defender.combat.multipleDefensesPenalty = parseInt(multipleDefensesPenaltyValue); // Update the modifier
        console.log(this.data.defender.combat.multipleDefensesPenalty);
        this._updateObject(event); // Call the update method with the updated data
    }
    _onAccumulateDefensesChange(event) {
        event.preventDefault();
        this.data.defender.combat.accumulateDefenses = !this.data.defender.combat.accumulateDefenses; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.mystic.modifier = parseInt(modifierValue); // Update the modifier
        this.data.defender.mystic.magicProjection.special = parseInt(modifierValue); // Update the modifier
        this.data.defender.mystic.magicProjection.final = this.data.defender.mystic.magicProjection.base + this.data.defender.mystic.magicProjection.special; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticSpellSelectionChange(event) {
        event.preventDefault();
        const selectedSpellId = event.target.value;
        this.data.defender.mystic.spellUsed = selectedSpellId; // Update the selected spell
        const spell = this.data.defender.mystic.spells.find((w) => w._id === this.data.defender.mystic.spellUsed);
        const spellGrades = ["basic", "intermediate", "advanced", "arcane"];
        this.data.defender.mystic.attainableSpellGrades = [];
        spellGrades.forEach((grade) => {
            if (this.data.defender.mystic.finalIntelligence >= spell?.system[grade].intReq) {
                this.data.defender.mystic.attainableSpellGrades.push(grade);
            }
        });

        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticSpellGradeSelectionChange(event) {
        event.preventDefault();
        const selectedGrade = event.target.value;
        this.data.defender.mystic.spellGrade = selectedGrade;

        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticDistanceCheckChange(event) {
        event.preventDefault();
        this.data.defender.mystic.distanceCheck = !this.data.defender.mystic.distanceCheck; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticOverrideMysticCastChange(event) {
        event.preventDefault();
        this.data.defender.mystic.spellCasting.override = !this.data.defender.mystic.spellCasting.override; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticCastInnateChange(event) {
        event.preventDefault();
        this.data.defender.mystic.spellCasting.casted.innate = !this.data.defender.mystic.spellCasting.casted.innate; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticCastPreparedChange(event) {
        event.preventDefault();
        this.data.defender.mystic.spellCasting.casted.prepared = !this.data.defender.mystic.spellCasting.casted.prepared; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticShieldValueChange(event) {
        event.preventDefault();
        const newValue = event.target.value;
        this.data.defender.mystic.supernaturalShield.shieldValue = parseInt(newValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticNewShieldChange(event) {
        event.preventDefault();
        this.data.defender.mystic.supernaturalShield.newShield = !this.data.defender.mystic.supernaturalShield.newShield; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    async _updateObject(event, formData) {
        this.render();
    }
}
export const defensesCounterCheck = (defensesCounter) => {
    const multipleDefensesPenalty = [-0, -30, -50, -70, -90];
    let currentDefensePenalty = multipleDefensesPenalty[Math.min(defensesCounter.accumulated, 4)];
    return currentDefensePenalty;
};
