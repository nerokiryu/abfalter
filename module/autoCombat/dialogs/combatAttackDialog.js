import { templates } from "../../utilities/templates.js";
import { otherResistanceEffectCheck, resistanceEffectCheck, mysticCanCastEvaluate, evaluateCast, damageTypeCheck } from "../utilities.js";

import { rollCharacteristic, abilityRoll, rollCombatWeapon, openRollFunction, fumbleRollFunction, rollResistance, rollBreakage } from "../../diceroller.js";

const getInitialData = (attacker, defender, options = {}) => {
    const showRollByDefault = true; // !!game.settings.get('abfalter', ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT);
    const isGM = !!game.user?.isGM;
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    const combatDistance = true; // !!game.settings.get('abfalter',ABFSettingsKeys.AUTOMATE_COMBAT_DISTANCE);
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
            zen: false, //attackerActor.system.general.settings.zen.value,
            inhuman: false, //attackerActor.system.general.settings.inhuman.value,
            immaterial: false, //attackerActor.system.general.settings.immaterial.value,
            distance: {
                value: 0,
                enable: combatDistance,
                check: false,
            },
            combat: {
                counterAttackBonus: options.counterAttackBonus || 0,
                fatigueUsed: 0,
                modifier: 0,
                unarmed: false,
                weaponsList: undefined,
                weaponUsed: undefined,
                weapon: undefined,
                resistanceEffect: { effects: [], value: 0, types: [], type: undefined, check: false },
                visible: true,
                highGround: false,
                distanceCheck: false,
                projectile: {
                    value: false,
                    type: "",
                },
                damage: {
                    base: 0,
                    special: 0,
                    final: 0,
                    atPen: 0,
                    type: undefined,
                },
            },
            mystic: {
                modifier: 0,
                magicProjection: {
                    base: attackerActor.system.mproj.finalOffensive,
                    special: 0,
                    final: attackerActor.system.mproj.finalOffensive,
                },
                spell: undefined,
                spells: undefined,
                spellUsed: undefined,
                spellGrade: "basic",
                attainableSpellGrades: [],
                spellCasting: {
                    zeon: { accumulated: attackerActor.system.maccu.actual, cost: 0 },
                    canCast: { prepared: false, innate: false },
                    casted: { prepared: false, innate: false },
                    override: false,
                },
                overrideMysticCast: false,
                resistanceEffect: { effects: [], value: 0, type: undefined, types: [], check: false },
                visible: false,
                distanceCheck: false,
                projectile: {
                    value: true,
                    type: "shot",
                },
                damage: {
                    base: 0,
                    special: 0,
                    final: 0,
                    atPen: 0,
                    type: undefined,
                },
                finalIntelligence: 0,
            },
            psychic: {
                modifier: 0,
                freePsychicPoints: attackerActor.system.psychicPoint.value,
                psychicProjection: {
                    base: attackerActor.system.pproj.final,
                    special: 0,
                    final: attackerActor.system.pproj.final,
                },
                psychicPotential: {
                    base: attackerActor.system.ppotential.final,
                    special: 0,
                    final: attackerActor.system.ppotential.final,
                },
                power: undefined,
                powers: undefined,
                powerUsed: undefined,
                eliminateFatigue: false,
                mentalPatternImbalance: false,
                resistanceEffect: { effects: [], value: 0, type: undefined, check: false },
                visible: false,
                distanceCheck: false,
                projectile: {
                    value: true,
                    type: "shot",
                },
                damage: {
                    base: 0,
                    special: 0,
                    final: 0,
                    atPen: 0,
                    type: undefined,
                },
            },
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
        const { combat, mystic, psychic } = this.data.attacker;

        if (this.data.attacker.distance.enable) {
            console.log(canvas.grid);
            const calculateDistance = canvas.grid.measureDistance(this.data.attacker.token, this.data.defender.token, { gridSpaces: true }) / canvas.grid.distance;
            this.data.attacker.distance.value = calculateDistance;
        }

        ////// COMBAT //////

        const weapons = attacker.actor.items.filter((item) => item.type === "weapon"); //filters through actor items for weapons
        this.data.attacker.combat.weaponsList = weapons; //sends filtered weapons to form data
        if (weapons.length > 0) {
            const lastOffensiveWeaponUsed = this.attackerActor.getFlag("abfalter", "lastOffensiveWeaponUsed");
            if (weapons.find((w) => w._id === lastOffensiveWeaponUsed)) {
                combat.weaponUsed = lastOffensiveWeaponUsed;
            } else {
                combat.weaponUsed = weapons[0]._id; //sets first weapon on select list
            }
            combat.weapon = weapons.find((w) => w._id === combat.weaponUsed);
            combat.damage.base = combat.weapon.system.finalDmg;
            combat.damage.final = combat.weapon.system.finalDmg;
        } else {
            combat.unarmed = true;
        }

        ////// MYSTIC //////

        const spells = attacker.actor.items.filter((item) => item.type === "spell"); //filters through actor items for spells
        this.data.attacker.mystic.spells = spells; //sends filtered spells to form data
        console.log(spells);
        const aptitudeForMagicDevelopment = false;

        const intelligence = this.attackerActor.system.stats.Intelligence.final;
        const finalIntelligence = aptitudeForMagicDevelopment ? intelligence + 3 : intelligence;
        this.data.attacker.mystic.finalIntelligence = finalIntelligence;

        if (spells.length > 0) {
            const lastOffensiveSpellUsed = this.attackerActor.getFlag("abfalter", "lastOffensiveSpellUsed");
            if (spells.find((w) => w._id === lastOffensiveSpellUsed)) {
                mystic.spellUsed = lastOffensiveSpellUsed;
            } else {
                mystic.spellUsed = spells.find((w) => w.system.type === "Attack")?._id;
            }
            const spellCastingOverride = this.attackerActor.getFlag("abfalter", "spellCastingOverride");
            mystic.spellCasting.override = spellCastingOverride || false;
            mystic.overrideMysticCast = spellCastingOverride || false;
            const spell = spells.find((w) => w._id === mystic.spellUsed);
            mystic.spell = spell;
            //mystic.critic = spell?.system.critic.value ?? NoneWeaponCritic.NONE;
            const spellGrades = ["basic", "intermediate", "advanced", "arcane"];
            if (this.data.attacker.mystic.spellCasting.override) {
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
                mystic.resistanceEffect = resistanceEffectCheck(spell, mystic.spellGrade);
                mystic.damage.type = damageTypeCheck(spell?.system.description, spell?.system[mystic.spellGrade].rollDesc);
            }
        }

        ////// PSYCHIC //////

/*         const psychicPowers  = attacker.actor.items.filter((item) => item.type === "psychicMatrix");
        console.log("psychicPowers")
        console.log(psychicPowers)

        if (psychicPowers.length > 0) {
            const lastOffensivePowerUsed = this.attackerActor.getFlag("abfalter", "lastOffensivePowerUsed");
            if (psychicPowers.find((w) => w._id === lastOffensivePowerUsed)) {
                psychic.powerUsed = lastOffensivePowerUsed;
            } else {
                psychic.powerUsed = psychicPowers.find((w) => w.system.action === "1")?._id;
            }
            const power = psychicPowers.find((w) => w._id === psychic.powerUsed);
            psychic.power = power;
            psychic.powers = psychicPowers;
            psychic.damage.type = damageTypeCheck(power.system.description, "");
            const psychicBonus = power?.system.bonus ?? 0;
            psychic.psychicPotential.final = psychic.psychicPotential.special + this.attackerActor.system.ppotential.final + psychicBonus;
        } */

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
        return super.close(options);
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('select[name="attacker.combat.weaponUsed"]').on("change", this._onWeaponSelectionChange.bind(this));
        html.find('select[name="attacker.combat.weaponType"]').on("change", this._onWeaponTypeChange.bind(this));
        html.find('input[name="attacker.combat.fatigueUsed"]').on("change", this._onFatigueChange.bind(this));
        html.find('input[name="attacker.combat.modifier"]').on("change", this._onModifierChange.bind(this));
        html.find('input[name="attacker.combat.damage.special"]').on("change", this._onDamageModifierChange.bind(this));
        html.find('input[name="attacker.combat.distanceCheck"]').on("change", this._onDistanceCheckChange.bind(this));
        html.find('input[name="attacker.highGround"]').on("change", this._onHighGroundChange.bind(this));
        html.find('input[name="attacker.poorVisibility"]').on("change", this._onPoorVisibilityChange.bind(this));
        html.find('input[name="attacker.targetInCover"]').on("change", this._onTargetInCoverChange.bind(this));

        html.find('select[name="attacker.mystic.spellUsed"]').on("change", this._onMysticSpellSelectionChange.bind(this));
        html.find('select[name="attacker.mystic.spellGrade"]').on("change", this._onMysticSpellGradeSelectionChange.bind(this));
        html.find('select[name="attacker.mystic.resistanceEffect.types"]').on("change", this._onMysticResistanceEffectChange.bind(this));
        html.find('input[name="attacker.combat.fatigueUsed"]').on("change", this._onFatigueChange.bind(this));
        html.find('input[name="attacker.mystic.magicProjection.special"]').on("change", this._onMysticModifierChange.bind(this));
        html.find('input[name="attacker.mystic.damage.special"]').on("change", this._onMysticDamageModifierChange.bind(this));
        html.find('input[name="attacker.mystic.distanceCheck"]').on("change", this._onMysticDistanceCheckChange.bind(this));
        html.find('input[name="attacker.mystic.spellCasting.casted.prepared"]').on("change", this._onMysticCastPreparedChange.bind(this));
        html.find('input[name="attacker.mystic.spellCasting.casted.innate"]').on("change", this._onMysticCastInnateChange.bind(this));
        html.find('input[name="attacker.mystic.spellCasting.override"]').on("change", this._onMysticOverrideMysticCastChange.bind(this));

        html.find(".sendNormAttack").click(async () => {
            const {
                distance,
                highGround,
                poorVisibility,
                targetInCover,
                combat: { fatigueUsed, modifier, counterAttackBonus, unarmed, weaponsList, weaponUsed, damage, visible },
            } = this.data.attacker; // from getInitial Data stuff
            //console.log(this.data.attacker.combat);
            const attackerCombatMod = {
                modifier: { value: modifier, apply: true },
                fatigueUsed: { value: fatigueUsed * 15, apply: true },
            };
            const weapon = weaponsList.find((w) => w._id === weaponUsed);
            this.data.attacker.combat.weapon = weapon;
            let projectile = { value: false, type: "" };
            if (unarmed) {
                damage.type = "IMP";
                damage.base = this.data.attacker.actor.system.fistDamage.final;
            } else {
                if (damage.type === undefined) {
                    damage.type = weapon.system.primDmgT;
                }

                if (this.data.attacker.combat.projectile.value /*weapon?.system.isRanged*/) {
                    projectile = {
                        value: true,
                        type: weapon.system.shotType.value,
                    };
                    if (weapon.system.shotType.value === "shot") {
                        projectile.name = weapon.system.ammo?.name;
                    }
                    if ((!distance.enable && distance.check) || (distance.enable && distance.value <= 1)) {
                        attackerCombatMod.pointBlank = {
                            value: 30,
                            apply: true,
                        };
                    }
                    if (highGround) {
                        attackerCombatMod.highGround = { value: 20, apply: true };
                    }
                    if (poorVisibility) {
                        attackerCombatMod.poorVisibility = { value: -20, apply: true };
                    }
                    if (targetInCover) {
                        attackerCombatMod.targetInCover = { value: -40, apply: true };
                    }
                }
                damage.base = weapon.system.finalDmg;
            }
            damage.atPen = weapon.system.atPenFinal;
            damage.final = damage.base + damage.special;

            if (damage.type == weapon.system.secDmgT) {
                attackerCombatMod.secondaryDmgType = { value: -10, apply: true };
            }

            this.attackerActor.setFlag("abfalter", "lastOffensiveWeaponUsed", weaponUsed);

            console.log(weapon);
            this.data.attackSent = true;

            console.log(this.data.attacker.actor);

            const attack = weapon ? weapon.system.finalAtk : this.attackerActor.system.combatValues.attack.final;

            let combatModifier = 0;
            for (const key in attackerCombatMod) {
                combatModifier += attackerCombatMod[key]?.value ?? 0;
            }
            let finalMod = attack + combatModifier + counterAttackBonus;
            //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
            //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);

            const flavor = weapon
                ? game.i18n.format("abfalter.autoCombat.dialog.physicalAttack.title", {
                      weapon: weapon?.name,
                      target: this.data.defender.token.name,
                  })
                : game.i18n.format("abfalter.autoCombat.dialog.physicalAttack.unarmed.title", {
                      target: this.data.defender.token.name,
                  });

            const roll = rollCombatWeapon(html, this.data.attacker.actor, finalMod, flavor, weapon.system.complex);

            let resistanceEffect = { effects: [], value: 0, type: undefined, check: false };
            if (weapon !== undefined) {
                resistanceEffect = otherResistanceEffectCheck(weapon.system.description);
            }

            const result = {
                type: "combat",
                roll: roll,
                values: {
                    unarmed,
                    damage: damage,
                    attack,
                    weaponUsed,
                    weapon,
                    modifier: combatModifier,
                    fatigueUsed,
                    resistanceEffect,
                    visible,
                    distance,
                    projectile,
                    attackerCombatMod,
                },
            };
            this.hooks.onAttack(result);

            this.data.attackSent = true;

            this.render();
        });
        html.find(".sendMysticAttack").click(() => {
            const {
                mystic: { magicProjection, spellUsed, spellGrade, spellCasting, critic, damage, projectile, distanceCheck, resistanceEffect },
                distance,
            } = this.data.attacker;
            distance.check = distanceCheck;
            if (spellUsed) {
                const attackerCombatMod = {
                    modifier: { value: magicProjection.special, apply: true },
                };
                this.attackerActor.setFlag("abfalter", "spellCastingOverride", spellCasting.override);
                this.attackerActor.setFlag("abfalter", "lastOffensiveSpellUsed", spellUsed);
                const { spells } = this.data.attacker.mystic;
                const spell = spells.find((w) => w._id === spellUsed);
                if (evaluateCast(spellCasting)) {
                    this.data.attacker.mystic.overrideMysticCast = true;
                    return;
                }
                let visibleCheck = false; //spell?.system.visible;

                let combatModifier = 0;
                for (const key in attackerCombatMod) {
                    combatModifier += attackerCombatMod[key]?.value ?? 0;
                }

                let attack = magicProjection.final;

                let finalMod = attack + combatModifier;
                //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
                //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);
                const flavor = game.i18n.format("abfalter.autoCombat.dialog.magicAttack.title", {
                    spell: spell.name,
                    target: this.data.defender.token.name,
                });

                const roll = abilityRoll(html, this.data.attacker.actor, finalMod, flavor);

                const result = {
                    type: "mystic",
                    roll: roll,
                    values: {
                        modifier: combatModifier,
                        spellUsed,
                        spell,
                        spellGrade,
                        spellName: spell.name,
                        magicProjection: magicProjection.final,
                        critic,
                        damage: damage,
                        resistanceEffect,
                        visible: visibleCheck,
                        distance,
                        projectile,
                        spellCasting,
                        effects: spell.effects,
                        attackerCombatMod,
                    },
                };

                this.hooks.onAttack(result);

                this.data.attackSent = true;

                this.render();
            }
        });
        html.find(".sendPsychicAttack").click(() => {
            const {
                psychic: { powerUsed, powers, power, modifier, psychicPotential, psychicProjection, critic, eliminateFatigue, damageModifier, mentalPatternImbalance, projectile, distanceCheck },
                distance,
            } = this.data.attacker;
            distance.check = distanceCheck;

            /* if (powerUsed) {
                const attackerCombatMod = {
                    modifier: { value: modifier, apply: true },
                };
                this.attackerActor.setFlag("abfalter", "lastOffensivePowerUsed", powerUsed);
                let combatModifier = 0;
                for (const key in attackerCombatMod) {
                    combatModifier += attackerCombatMod[key]?.value ?? 0;
                }
                let formula = `1d100xa + ${psychicProjection} + ${combatModifier ?? 0}`;
                if (this.modalData.attacker.withoutRoll) {
                    // Remove the dice from the formula
                    formula = formula.replace("1d100xa", "0");
                }
                if (this.attackerActor.system.psychic.psychicProjection.base.value >= 200) {
                    // Mastery reduces the fumble range
                    formula = formula.replace("xa", "xamastery");
                }

                const psychicProjectionRoll = new ABFFoundryRoll(formula, this.attackerActor.system);
                psychicProjectionRoll.roll();

                const psychicPotentialRoll = new ABFFoundryRoll(`1d100PsychicRoll + ${psychicPotential.final}`, { ...this.attackerActor.system, power, mentalPatternImbalance });
                psychicPotentialRoll.roll();
                if (this.modalData.attacker.showRoll) {
                    psychicPotentialRoll.toMessage({
                        speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }),
                        flavor: game.i18n.format("abfalter.autoCombat.dialog.psychicPotential.title"),
                    });
                }

                const psychicFatigue = await this.attackerActor.evaluatePsychicFatigue(power, psychicPotentialRoll.total, eliminateFatigue, this.modalData.attacker.showRoll);

                if (this.modalData.attacker.showRoll) {
                    if (!psychicFatigue) {
                        const projectionFlavor = game.i18n.format("abfalter.autoCombat.dialog.psychicAttack.title", {
                            power: power.name,
                            target: this.modalData.defender.token.name,
                            potential: psychicPotentialRoll.total,
                        });
                        psychicProjectionRoll.toMessage({
                            speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }),
                            flavor: projectionFlavor,
                        });
                    }
                }

                const powerUsedEffect = power?.system.effects[psychicPotentialRoll.total].value;
                let damage = damageCheck(powerUsedEffect) + damageModifier;
                let resistanceEffect = resistanceEffectCheck(powerUsedEffect);
                let visibleCheck = power?.system.visible;

                const rolled = psychicProjectionRoll.total - psychicProjection - (combatModifier ?? 0);
                this.hooks.onAttack({
                    type: "psychic",
                    values: {
                        modifier: combatModifier,
                        powerUsed,
                        powerName: power.name,
                        psychicPotential: psychicPotentialRoll.total,
                        psychicProjection,
                        critic,
                        damage,
                        psychicFatigue,
                        roll: psychicFatigue ? 0 : rolled,
                        total: psychicFatigue ? 0 : psychicProjectionRoll.total,
                        fumble: psychicFatigue ? false : psychicProjectionRoll.fumbled,
                        resistanceEffect,
                        visible: visibleCheck,
                        distance,
                        projectile,
                        macro: power.macro,
                        attackerCombatMod,
                    },
                });

                this.modalData.attackSent = true;

                this.render();
            } */
        });
    }

    getData() {
        const {
            attacker: { combat, mystic, psychic },
            ui,
        } = this.data;

        ui.hasFatiguePoints = this.data.attacker.actor.system.fatigue.value > 0;

        //////////// PSYCHIC ////////////

/*         const psychicPowers = psychic.powers;
        if (!psychic.powerUsed) {
            psychic.powerUsed = psychicPowers.find((w) => w.system.action === "1")?._id;
        }
        const power = psychicPowers.find((w) => w._id === psychic.powerUsed);
        let psychicBonus = power?.system.bonus ?? 0;
        psychic.psychicPotential.final = psychic.psychicPotential.special + this.attackerActor.system.ppotential.final + psychicBonus; */

        //////////// MYSTIC ////////////

        const spells = this.data.attacker.actor.items.filter((item) => item.type === "spell");
        if (!mystic.spellUsed) {
            mystic.spellUsed = spells.find((w) => w.system.type === "Attack")?._id;
        }
        const spell = spells.find((w) => w._id === mystic.spellUsed);
        const spellUsedEffect = spell?.system.description ?? "";
        const spellUsedEffectGrade = spell?.system[mystic.spellGrade].rollDesc ?? "";

        let spellDamage = damageCheck(spellUsedEffectGrade);

        if (spellDamage === 0) {
            spellDamage = damageCheck(spellUsedEffect);
        }
        mystic.damage.base = spellDamage;
        mystic.damage.final = mystic.damage.special + spellDamage;
        mystic.spellCasting = mysticCanCastEvaluate(this.data.attacker.actor, spell, mystic.spellGrade, mystic.spellCasting.casted, mystic.spellCasting.override);

        //////////// COMBAT ////////////

        const weapons = this.data.attacker.actor.items.filter((item) => item.type === "weapon");
        const weapon = weapons.find((w) => w._id === combat.weaponUsed);

        combat.unarmed = weapons.length === 0;

        if (combat.unarmed) {
            combat.damage.final = combat.damage.special + this.data.attacker.actor.system.fistDamage.final;
        } else {
            combat.weapon = weapon;
            if (weapon?.system.isRanged) {
                combat.projectile = {
                    value: true,
                    type: weapon.system.shotType,
                };
            } else {
                combat.projectile = {
                    value: false,
                    type: "",
                };
            }
        }

        return this.data;
    }

    _onWeaponSelectionChange(event) {
        event.preventDefault();
        const selectedWeaponId = event.target.value;
        this.data.attacker.combat.weaponUsed = selectedWeaponId; // Update the selected weapon
        this.data.attacker.combat.weapon = this.data.attacker.combat.weaponsList.find((w) => w._id === selectedWeaponId);
        this.data.attacker.combat.damage.type = this.data.attacker.combat.weapon.primDmgT;
        this.data.attacker.combat.damage.base = this.data.attacker.combat.weapon.system.finalDmg;
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
        this.data.attacker.combat.damage.final = this.data.attacker.combat.damage.base + this.data.attacker.combat.damage.special;
        this._updateObject(event); // Call the update method with the updated data
    }
    _onDistanceCheckChange(event) {
        event.preventDefault();
        this.data.attacker.combat.distanceCheck = !this.data.attacker.combat.distanceCheck; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onHighGroundChange(event) {
        event.preventDefault();
        this.data.attacker.highGround = !this.data.attacker.highGround; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onPoorVisibilityChange(event) {
        event.preventDefault();
        this.data.attacker.poorVisibility = !this.data.attacker.poorVisibility; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onTargetInCoverChange(event) {
        event.preventDefault();
        this.data.attacker.targetInCover = !this.data.attacker.targetInCover; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.attacker.mystic.modifier = parseInt(modifierValue); // Update the modifier
        this.data.attacker.mystic.magicProjection.special = parseInt(modifierValue); // Update the modifier
        this.data.attacker.mystic.magicProjection.final = this.data.attacker.mystic.magicProjection.base + this.data.attacker.mystic.magicProjection.special; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onMysticDamageModifierChange(event) {
        event.preventDefault();
        const damageModifierValue = event.target.value;
        this.data.attacker.mystic.damage.special = parseInt(damageModifierValue); // Update the modifier
        this.data.attacker.mystic.damage.final = this.data.attacker.mystic.damage.base + this.data.attacker.combat.damage.special;
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticSpellSelectionChange(event) {
        event.preventDefault();
        const selectedSpellId = event.target.value;
        this.data.attacker.mystic.spellUsed = selectedSpellId; // Update the selected spell
        const spell = this.data.attacker.mystic.spells.find((w) => w._id === this.data.attacker.mystic.spellUsed);
        const spellGrades = ["basic", "intermediate", "advanced", "arcane"];
        this.data.attacker.mystic.attainableSpellGrades = [];
        spellGrades.forEach((grade) => {
            if (this.data.attacker.mystic.finalIntelligence >= spell?.system[grade].intReq) {
                this.data.attacker.mystic.attainableSpellGrades.push(grade);
            }
        });

        this.data.attacker.mystic.spellGrade = spellGrades[0];

        const spellUsedEffect = spell?.system.description ?? "";
        const spellUsedEffectGrade = spell?.system[this.data.attacker.mystic.spellGrade].rollDesc ?? "";
        let spellDamage = damageCheck(spellUsedEffect);
        if (spellDamage === 0) {
            spellDamage = damageCheck(spellUsedEffectGrade);
        }
        this.data.attacker.mystic.damage.base = spellDamage;
        this.data.attacker.mystic.damage.final = spellDamage + this.data.attacker.mystic.damage.special;
        this.data.attacker.mystic.damage.type = damageTypeCheck(spell?.system.description, spell?.system[this.data.attacker.mystic.spellGrade].rollDesc);
        this.data.attacker.mystic.resistanceEffect = resistanceEffectCheck(spell, this.data.attacker.mystic.spellGrade);

        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticSpellGradeSelectionChange(event) {
        event.preventDefault();
        const selectedGrade = event.target.value;
        this.data.attacker.mystic.spellGrade = selectedGrade;

        const spell = this.data.attacker.mystic.spells.find((w) => w._id === this.data.attacker.mystic.spellUsed);

        const spellUsedEffect = spell?.system.description ?? "";
        const spellUsedEffectGrade = spell?.system[selectedGrade].rollDesc ?? "";
        let spellDamage = damageCheck(spellUsedEffect);
        if (spellDamage === 0) {
            spellDamage = damageCheck(spellUsedEffectGrade);
        }
        this.data.attacker.mystic.damage.base = spellDamage;
        this.data.attacker.mystic.damage.final = spellDamage + this.data.attacker.mystic.damage.special;
        this.data.attacker.mystic.damage.type = damageTypeCheck(spell?.system.description, spell?.system[this.data.attacker.mystic.spellGrade].rollDesc);
        this.data.attacker.mystic.resistanceEffect = resistanceEffectCheck(spell, this.data.attacker.mystic.spellGrade);

        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticResistanceEffectChange(event) {
        event.preventDefault();
        console.log(event.target.value);
        this.data.attacker.mystic.resistanceEffect.type = event.target.value;
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticDistanceCheckChange(event) {
        event.preventDefault();
        this.data.attacker.mystic.distanceCheck = !this.data.attacker.mystic.distanceCheck; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticCastInnateChange(event) {
        event.preventDefault();
        this.data.attacker.mystic.spellCasting.casted.innate = !this.data.attacker.mystic.spellCasting.casted.innate; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    _onMysticCastPreparedChange(event) {
        event.preventDefault();
        this.data.attacker.mystic.spellCasting.casted.prepared = !this.data.attacker.mystic.spellCasting.casted.prepared; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onMysticOverrideMysticCastChange(event) {
        event.preventDefault();
        this.data.attacker.mystic.spellCasting.override = !this.data.attacker.mystic.spellCasting.override; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    async _updateObject(event, formData) {
        const prevWeapon = this.data.attacker.combat.weaponUsed;
        const prevSpell = this.data.attacker.mystic.spellUsed;
        const prevPower = this.data.attacker.psychic.powerUsed;

        //this.data = mergeObject(this.data, formData);

        if (prevWeapon !== this.data.attacker.combat.weaponUsed) {
            this.data.attacker.combat.criticSelected = undefined;
        }

        const spellGrades = ["basic", "intermediate", "advanced", "arcane"];
        if (prevSpell !== this.data.attacker.mystic.spellUsed) {
            const { spells } = this.data.attacker.mystic.spells;
            const spell = spells.find((w) => w._id === this.data.attacker.mystic.spellUsed);
            //this.data.attacker.mystic.damage.type = spell?.system.critic.value ?? NoneWeaponCritic.NONE;
            this.data.attacker.mystic.spellGrade = "base";
            this.data.attacker.mystic.attainableSpellGrades = [];

            spellGrades.forEach((grade) => {
                if (this.data.attacker.mystic.finalIntelligence >= spell?.system[grade].intReq) {
                    this.data.attacker.mystic.attainableSpellGrades.push(grade);
                }
            });
        }
        if (this.data.attacker.mystic.spellCasting.override) {
            this.data.attacker.mystic.attainableSpellGrades = spellGrades;
        }
/*         if (prevPower !== this.data.attacker.psychic.powerUsed) {
            const { psychicPowers } = this.data.attacker.psychic.powers;
            const power = psychicPowers.find((w) => w._id === this.data.attacker.psychic.powerUsed);
            this.data.attacker.psychic.damage.type = damageTypeCheck(power.system.description, "");
        }
 */
        this.render();
    }
}

export const damageCheck = (effect) => {
    effect = effect.replace(".", "");

    const regexDamage = / base Damage (?!\+)\d+/i;
    const regexDamage2 = / (?!\+)\d+ base Damage/i;
    const regexGetNumber = /\d+/;

    if (regexDamage.test(effect)) {
        return parseInt(effect.match(regexDamage)[0].match(regexGetNumber)[0]) ?? 0;
    } else if (regexDamage2.test(effect)) {
        return parseInt(effect.match(regexDamage2)[0].match(regexGetNumber)[0]) ?? 0;
    } else {
        return 0;
    }
};
