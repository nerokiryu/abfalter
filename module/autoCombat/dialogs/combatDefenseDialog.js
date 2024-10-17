import { templates } from "../../utilities/templates.js";
import { addAttainablePowerLevels, otherResistanceEffectCheck, resistanceEffectCheck, mysticCanCastEvaluate, evaluateCast, damageTypeCheck } from "../utilities.js";
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

            psychic: {
                modifier: 0,
                freePsychicPoints: defenderActor.system.psychicPoint.value,
                psychicProjection: {
                    base: defenderActor.system.pproj.final,
                    special: 0,
                    ppp: 0,
                    final: defenderActor.system.pproj.final,
                },
                psychicPotential: {
                    base: defenderActor.system.ppotential.final,
                    special: 0,
                    ppp: 0,
                    final: defenderActor.system.ppotential.final,
                    result: 0,
                },
                power: undefined,
                powers: undefined,
                powerUsed: undefined,
                powerLevel: 0,
                attainablePowerLevels: [],
                eliminateFatigue: false,
                mentalPatternImbalance: false,
                supernaturalShield: {
                    shieldValue: 0,
                    newShield: true,
                },
            },
            resistance: {
                surprised: false,
            },
        },
        psychicPotentialSent: false,
        defenseSent: false,
        allowed: false,
    };
};

export class combatDefenseDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));

        this.data = getInitialData(attacker, defender, options);
        const { combat, mystic, psychic } = this.data.defender;

        // COMBAT

        const weapons = defender.actor.items.filter((item) => item.type === "weapon"); //filters through actor items for weapons
        combat.weaponsList = weapons; //sends filtered weapons to form data
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

        // MYSTIC

        const spells = defender.actor.items.filter((item) => item.type === "spell"); //filters through actor items for spells
        mystic.spells = spells; //sends filtered spells to form data
        const aptitudeForMagicDevelopment = false;

        const intelligence = this.defenderActor.system.stats.Intelligence.final;
        const finalIntelligence = aptitudeForMagicDevelopment ? intelligence + 3 : intelligence;
        mystic.finalIntelligence = finalIntelligence;

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

        // PSYCHIC

        const psychicPowers = defender.actor.items.filter((item) => item.type === "psychicMatrix");
        psychic.powers = psychicPowers;

        if (psychicPowers.length > 0) {
            const lastDefensivePowerUsed = this.defenderActor.getFlag("abfalter", "lastDefensivePowerUsed");
            if (psychicPowers.find((w) => w._id === lastDefensivePowerUsed)) {
                psychic.powerUsed = lastDefensivePowerUsed;
            } else {
                psychic.powerUsed = psychicPowers.find((w) => w.system.action === "0")?._id;
            }
            const power = psychicPowers.find((w) => w._id === psychic.powerUsed);
            psychic.power = power;
            psychic.powers = psychicPowers;
            const psychicBonus = power?.system.bonus ?? 0;
            psychic.psychicPotential.final = psychic.psychicPotential.special + this.defenderActor.system.ppotential.final + parseInt(psychicBonus);
            psychic.psychicPotential.base = this.defenderActor.system.ppotential.final;
        }

        //SHIELD

        if (this.defenderActor.system.shield.value > 0) {
            mystic.supernaturalShield = {
                shieldValue: this.defenderActor.system.shield.value,
                newShield: false,
            };
            psychic.supernaturalShield = {
                shieldValue: this.defenderActor.system.shield.value,
                newShield: false,
            };
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

        console.log(this.defenderActor);

        this.data.allowed = game.user?.isGM || (options.allowed ?? false);
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

        html.find('select[name="defender.psychic.powerUsed"]').on("change", this._onPsychicPowerSelectionChange.bind(this));
        html.find('select[name="defender.psychic.powerLevel"]').on("change", this._onPsychicPowerLevelSelectionChange.bind(this));
        html.find('input[name="defender.psychic.psychicPotential.special"]').on("change", this._onPsychicPotentialModifierChange.bind(this));
        html.find('input[name="defender.psychic.psychicPotential.ppp"]').on("change", this._onPsychicPotentialPPPChange.bind(this));
        html.find('input[name="defender.psychic.psychicProjection.special"]').on("change", this._onPsychicProjectionModifierChange.bind(this));
        html.find('input[name="defender.psychic.psychicProjection.ppp"]').on("change", this._onPsychicProjectionPPPChange.bind(this));
        html.find('input[name="defender.psychic.eliminateFatigue"]').on("change", this._onPsychicEliminateFatigueChange.bind(this));
        html.find('input[name="defender.psychic.mentalPatternImbalance"]').on("change", this._onPsychicMentalPatternImbalanceChange.bind(this));
        html.find('input[name="defender.psychic.supernaturalShield.shieldValue"]').on("change", this._onPsychicShieldValueChange.bind(this));
        html.find('input[name="defender.psychic.supernaturalShield.newShield"]').on("change", this._onPsychicNewShieldChange.bind(this));

        html.find('button[name="defender.psychic.rollPsychicPotential"]').click(async () => {
            var finalMod = this.data.defender.psychic.psychicPotential.final + this.data.defender.psychic.psychicPotential.ppp * 20;

            const flavor = game.i18n.format("abfalter.autoCombat.dialog.psychicPotential.roll.title", {
                power: this.data.defender.psychic.power.name,
            });

            const roll = await abilityRoll(html, this.data.defender.actor, finalMod, flavor);

            this.data.defender.psychic.psychicPotential.result = roll[roll.length - 1].total;
            console.log("result");
            console.log(this.data.defender.psychic.psychicPotential.result);

            addAttainablePowerLevels(this.data.defender.psychic.attainablePowerLevels, this.data.defender.psychic.power, this.data.defender.psychic.psychicPotential.result);
            this.data.defender.psychic.powerLevel = this.data.defender.psychic.attainablePowerLevels[this.data.defender.psychic.attainablePowerLevels.length - 1];

            this.data.psychicPotentialSent = true;
            this.render();
        });

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
                value = weapon.system.derived.baseDod;
                baseDefense = this.defenderActor.system.combatValues.dodge.final;
                const mastery = baseDefense >= 200;
                if (((!distance.enable && !distance.check) || (distance.enable && distance.value > 1)) && projectileType == "shot" && !mastery) {
                    defenderCombatMod.dodgeProjectile = {
                        value: -30,
                        apply: true,
                    };
                }
            } else {
                value = weapon ? weapon.system.derived.baseBlk : this.defenderActor.system.combat.block.final.value;
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
            let finalMod = baseDefense + combatModifier;
            let damageType = this.data.attacker.damageType;
            let armorType = Object.keys(this.data.defender.actor.system.armor.body).filter((key) => key.toUpperCase().includes(damageType));
            this.data.defender.combat.armor = this.data.defender.actor.system.armor.body[armorType[0]];

            const flavor = game.i18n.format(`abfalter.autoCombat.dialog.physicalDefense.${type}.title`, {
                target: this.data.attacker.token.name,
            });
            //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
            //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);
            const roll = rollCombatWeapon(html, this.data.defender.actor, finalMod, flavor, weapon.system.info.complex);
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
                    supernaturalShield: { shieldValue, newShield },
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
                supShield = { create: false, value: shieldValue };
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

        html.find(".sendPsychicDefense").click(async () => {
            const {
                psychic: {
                    psychicPotential,
                    powerUsed,
                    psychicProjection,
                    eliminateFatigue,
                    mentalPatternImbalance,
                    powers,
                    power,
                    powerLevel,
                    supernaturalShield: { shieldValue, newShield },
                },
                combat: { armor },
                blindness,
            } = this.data.defender;

            let psychicFatigue, supShield;
            const defenderCombatMod = {
                modifier: { value: psychicProjection.special, apply: true },
            };
            if (psychicProjection.ppp > 0) {
                defenderCombatMod.ppp = { value: psychicProjection.ppp * 20, apply: true };
            }
            if (blindness) {
                defenderCombatMod.blindness = { value: -80, apply: true };
            }

            let combatModifier = 0;
            for (const key in defenderCombatMod) {
                combatModifier += defenderCombatMod[key]?.value ?? 0;
            }
            let finalMod = psychicProjection.final + combatModifier;


            if (!newShield) {
                if (shieldValue === 0) {
                    return ui.notifications.warn(game.i18n.localize("abfalter.autoCombat.dialog.warning.supernaturalShieldNotFound.psychic"));
                }
                supShield = { create: false, value: shieldValue };
            } else if (power != undefined) {
                this.defenderActor.setFlag("abfalter", "lastDefensivePowerUsed", powerUsed);
                this.defenderActor.applyPsychicPoints(psychicPotential.ppp);
                psychicFatigue = await this.defenderActor.evaluatePsychicFatigue(power, powerLevel, eliminateFatigue);

                if (!psychicFatigue) {
                    supShield = { create: true };
                }
            }

            if (!psychicFatigue) {
                this.defenderActor.applyPsychicPoints(psychicProjection.ppp);
                const flavor = game.i18n.format("abfalter.autoCombat.dialog.psychicDefense.title", {
                    power: power.name,
                    target: this.data.attacker.token.name,
                    potential: psychicPotential.result,
                });
                const roll = abilityRoll(html, this.data.defender.actor, finalMod, flavor);

                const result ={
                    type: "psychic",
                    roll: roll,
                    values: {
                        modifier: combatModifier,
                        powerUsed,
                        powerName: power.name,
                        power,
                        powerLevel,
                        powers,
                        psychicProjection,
                        psychicPotential,
                        armor,
                        psychicFatigue,
                        supShield,
                        defenderCombatMod,
                    },
                }

                this.hooks.onDefense(result);
                this.data.defenseSent = true;
            } else {
                this.data.defenseSent = true;
                this.close();
            }

            this.render();
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

    _onPsychicPotentialModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.psychic.psychicPotential.special = parseInt(modifierValue); // Update the modifier
        const psychicBonus = this.data.defender.psychic.power?.system.bonus ?? 0;
        this.data.defender.psychic.psychicPotential.final = this.data.defender.psychic.psychicPotential.base + this.data.defender.psychic.psychicPotential.special + parseInt(psychicBonus); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicPotentialPPPChange(event) {
        event.preventDefault();
        const pppValue = event.target.value;
        this.data.defender.psychic.psychicPotential.ppp = parseInt(pppValue); // Update the modifier
        if (this.data.defender.psychic.psychicPotential.ppp > 5) {
            this.data.defender.psychic.psychicPotential.ppp = 5;
        }
        if (this.data.defender.psychic.psychicPotential.ppp + this.data.defender.psychic.psychicProjection.ppp > this.data.defender.psychic.freePsychicPoints) {
            ui.notifications.warn(game.i18n.localize("abfalter.autoCombat.dialog.warning.tooFewPsychicPoints"));
            this.data.defender.psychic.psychicPotential.ppp = this.data.defender.psychic.freePsychicPoints - this.data.defender.psychic.psychicProjection.ppp;
        }
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicProjectionModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.psychic.psychicProjection.special = parseInt(modifierValue); // Update the modifier
        this.data.defender.psychic.psychicProjection.final = this.data.defender.psychic.psychicProjection.base + this.data.defender.psychic.psychicProjection.special; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicProjectionPPPChange(event) {
        event.preventDefault();
        const pppValue = event.target.value;
        this.data.defender.psychic.psychicProjection.ppp = parseInt(pppValue); // Update the modifier
        if (this.data.defender.psychic.psychicProjection.ppp > 5) {
            this.data.defender.psychic.psychicProjection.ppp = 5;
        }
        if (this.data.defender.psychic.psychicPotential.ppp + this.data.defender.psychic.psychicProjection.ppp > this.data.defender.psychic.freePsychicPoints) {
            ui.notifications.warn(game.i18n.localize("abfalter.autoCombat.dialog.warning.tooFewPsychicPoints"));
            this.data.defender.psychic.psychicProjection.ppp = this.data.defender.psychic.freePsychicPoints - this.data.defender.psychic.psychicPotential.ppp;
        }
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicPowerSelectionChange(event) {
        event.preventDefault();
        const selectedPowerId = event.target.value;
        this.data.defender.psychic.powerUsed = selectedPowerId; // Update the selected power
        const power = this.data.defender.psychic.powers.find((w) => w._id === this.data.defender.psychic.powerUsed);
        this.data.defender.psychic.power = power;
        this.data.defender.psychic.attainablePowerLevels = [];
        if (this.data.defender.psychic.psychicPotential.result != 0) {
            addAttainablePowerLevels(this.data.defender.psychic.attainablePowerLevels, power, this.data.defender.psychic.psychicPotential.result);
            console.log(this.data.defender.psychic.attainablePowerLevels);
        }
        this.data.defender.psychic.powerLevel = this.data.defender.psychic.attainablePowerLevels[this.data.defender.psychic.attainablePowerLevels.length - 1];

        const powerUsedEffect = power?.system.description ?? "";
        const powerUsedEffectLevel = power?.system[this.data.defender.psychic.powerLevel] ?? "";
        let powerDamage = damageCheck(powerUsedEffect);
        if (powerDamage === 0) {
            powerDamage = damageCheck(powerUsedEffectLevel);
        }
        this.data.defender.psychic.damage.base = powerDamage;
        this.data.defender.psychic.damage.final = powerDamage + this.data.defender.psychic.damage.special;
        this.data.defender.psychic.damage.type = damageTypeCheck(powerUsedEffect, powerUsedEffectLevel);
        this.data.defender.psychic.resistanceEffect = resistanceEffectCheck(powerUsedEffect, powerUsedEffectLevel);

        const psychicBonus = power?.system.bonus ?? 0;
        this.data.defender.psychic.psychicPotential.final = this.data.defender.psychic.psychicPotential.base + this.data.defender.psychic.psychicPotential.special + parseInt(psychicBonus); // Update the modifier

        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicPowerLevelSelectionChange(event) {
        event.preventDefault();
        const selectedLevel = event.target.value;
        this.data.defender.psychic.powerLevel = selectedLevel;

        const power = this.data.defender.psychic.powers.find((w) => w._id === this.data.defender.psychic.powerUsed);

        const powerUsedEffect = power?.system.description ?? "";
        const powerUsedEffectLevel = power?.system[selectedLevel] ?? "";
        let powerDamage = damageCheck(powerUsedEffect);
        if (powerDamage === 0) {
            powerDamage = damageCheck(powerUsedEffectLevel);
        }
        console.log(this.data.defender.psychic.powerLevel);
        console.log(powerUsedEffectLevel);
        console.log(powerDamage);
        this.data.defender.psychic.damage.base = powerDamage;
        this.data.defender.psychic.damage.final = powerDamage + this.data.defender.psychic.damage.special;
        this.data.defender.psychic.damage.type = damageTypeCheck(powerUsedEffect, powerUsedEffectLevel);
        this.data.defender.psychic.resistanceEffect = resistanceEffectCheck(powerUsedEffect, powerUsedEffectLevel);

        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicEliminateFatigueChange(event) {
        event.preventDefault();
        this.data.defender.psychic.eliminateFatigue = !this.data.defender.psychic.eliminateFatigue; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicMentalPatternImbalanceChange(event) {
        event.preventDefault();
        this.data.defender.psychic.mentalPatternImbalance = !this.data.defender.psychic.mentalPatternImbalance; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicShieldValueChange(event) {
        event.preventDefault();
        const shieldValue = event.target.value;
        this.data.defender.psychic.supernaturalShield.shieldValue = shieldValue; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onPsychicNewShieldChange(event) {
        event.preventDefault();
        this.data.defender.psychic.supernaturalShield.newShield = !this.data.defender.psychic.supernaturalShield.newShield; // Update the modifier
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
