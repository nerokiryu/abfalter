import { genericDialogs } from "../dialogs.js";

export const assertCurrentScene = () => {
    const gameCopy = game;
    if (gameCopy.scenes?.current?.id !== gameCopy.scenes?.active?.id) {
        const msg = gameCopy.i18n.localize("abfalter.dialogs.wrongScene");
        genericDialogs.prompt(msg);
        throw new Error(msg);
    }
};

export const assertGMActive = () => {
    const gameCopy = game;
    console.log(gameCopy.users);
    if (!gameCopy.users?.find(u => u.isGM && u.active)) {
        const msg = gameCopy.i18n.localize("abfalter.dialogs.noGMActive");
        genericDialogs.prompt(msg);
        throw new Error(msg);
    }
};

export function getSelectedToken(game) {
    const selectedTokens = game.canvas.tokens?.controlled ?? [];
    if (selectedTokens.length !== 1) {
        const msg = game.i18n.localize(selectedTokens.length > 0 ? "abfalter.dialogs.noMultiSelect" : "abfalter.dialogs.noSelectToken");
        genericDialogs.prompt(msg);
        throw new Error(msg);
    }
    return selectedTokens[0].document;
}

export const getTargetToken = (attackerToken, targetTokens) => {
    const gameCopy = game;
    let msg;

    if (targetTokens.ids.length > 1) {
        let targets = Array.from(game.user.targets);
        for (let i = 0; i < targetTokens.ids.length; i++) {
            if (!targets[i].actor?.id) {
                msg = gameCopy.i18n.localize("abfalter.dialogs.noActor");
                genericDialogs.prompt(msg);
                throw new Error(msg);
            }
            if (targets[i].id === attackerToken.id) {
                msg = gameCopy.i18n.localize("abfalter.dialogs.noAtkSelf");
                genericDialogs.prompt(msg);
                throw new Error(msg);
            }
        }
        msg = gameCopy.i18n.localize("abfalter.dialogs.aoeAttack");
        genericDialogs.prompt(msg);
        return targets;
    }
    if (targetTokens.ids.length === 0) {
        msg = gameCopy.i18n.localize("abfalter.dialogs.mustTarget");
    }
    if (msg) {
        genericDialogs.prompt(msg);
        throw new Error(msg);
    }
    const target = targetTokens.values().next().value;
    if (!target.actor?.id) {
        msg = gameCopy.i18n.localize("abfalter.dialogs.noActor");
    }
    if (target.id === attackerToken.id) {
        msg = gameCopy.i18n.localize("abfalter.dialogs.noAtkSelf");
    }
    if (msg) {
        genericDialogs.prompt(msg);
        console.log(msg);
        throw new Error(msg);
    }
    return target;
};

export const canOwnerReceiveMessage = (actor) => {
    const gameCopy = game;
    if (!actor.hasPlayerOwner || !actor.id) {
        return false;
    }
    const activePlayers = gameCopy.users.players.filter((u) => u.active);
    return activePlayers.filter((u) => actor.testUserPermission(u, "OWNER")).length === 1;
};

export const damageTypeCheck = (spell, spellGrade) => {
    const spellUsedEffect = spell ?? "";
    const spellGradeUsedEffect = spellGrade ?? "";
    let damageType = undefined;
    const damageTypes = { CUT: "CUT", IMP: "IMP", THR: "THR", HEAT: "HEAT", ELE: "ELE", COLD: "COLD", ENE: "ENE", SPIRIT: "SPIRIT" };

    function updateDamageType(type) {
        damageType = type;
    }

    for (const key in damageTypes) {
        let regExp = new RegExp(`${damageTypes[key]}`, "g");
        if (regExp.test(spellUsedEffect)) {
            updateDamageType(key);
        }
        if (regExp.test(spellGradeUsedEffect)) {
            updateDamageType(key);
        }
    }

    if (damageType === undefined) {
        damageType = "NONE";
    }

    return damageType;
};

export const shieldCheck = (spell, spellGrade) => {
    const spellUsedEffect = spell ?? "";
    const spellGradeUsedEffect = spellGrade ?? "";
    let shieldLifePoint = undefined;
    const shieldLifePoints = { lp: "Life Points", shortLp: "LP" };

    function updateShieldLifePoint(regExp, effect) {
        shieldLifePoint = parseInt(effect.match(regExp)[0].match(/\d+/)[0]) ?? 0;
    }

    for (const key in shieldLifePoints) {
        let regExp = new RegExp(`\\d+ ${shieldLifePoints[key]}`, "i");
        if (regExp.test(spellUsedEffect)) {
            updateShieldLifePoint(regExp, spellUsedEffect);
        }
        if (regExp.test(spellGradeUsedEffect)) {
            updateShieldLifePoint(regExp, spellGradeUsedEffect);
        }
    }
    console.log(shieldLifePoint)
    return shieldLifePoint;
};

export const resistanceEffectCheck = (spell, spellGrade) => {
    const spellUsedEffect = spell ?? "";
    const spellGradeUsedEffect = spellGrade ?? "";
    const resistanceEffect = { effects: [], value: 0, type: undefined, types: [], check: false };
    const resistances = { Physical: "PhR", Disease: "DR", Poison: "PsnR", Magic: "MR", Psychic: "PsyR" };

    function updateResistanceEffect(type, regExp, effect) {
        resistanceEffect.check = true;
        resistanceEffect.type = type;
        resistanceEffect.types.push(type);
        resistanceEffect.value = parseInt(effect.match(regExp)[0].match(/\d+/)[0]) ?? 0;
        resistanceEffect.effects = [spellUsedEffect, spellGradeUsedEffect];
    }

    for (const key in resistances) {
        let beforeResistance = new RegExp(`\\d+ *[RDMPhsyn]{0,4} ( *or* ){0,1} *${resistances[key]}`, "i");
        let afterResistance = new RegExp(`${resistances[key]} ( *or* ){0,1} *[RDMPhsyn]{0,4} *\\d+`, "i");
        if (beforeResistance.test(spellUsedEffect)) {
            updateResistanceEffect(key, beforeResistance, spellUsedEffect);
        } else if (afterResistance.test(spellUsedEffect)) {
            updateResistanceEffect(key, afterResistance, spellUsedEffect);
        }
        if (beforeResistance.test(spellGradeUsedEffect)) {
            updateResistanceEffect(key, beforeResistance, spellGradeUsedEffect);
        } else if (afterResistance.test(spellGradeUsedEffect)) {
            updateResistanceEffect(key, afterResistance, spellGradeUsedEffect);
        }
    }

    return resistanceEffect;
};

export const otherResistanceEffectCheck = (effect) => {
    const resistanceEffect = { effects: [], value: 0, type: undefined, types: [], check: false };
    const resistances = { Physical: "PhR", Disease: "DR", Poison: "PsnR", Magic: "MR", Psychic: "PsyR" };

    function updateResistanceEffect(type, regExp, effect) {
        resistanceEffect.check = true;
        resistanceEffect.type = type;
        resistanceEffect.types.push(type);
        resistanceEffect.value = parseInt(effect.match(regExp)[0].match(/\d+/)[0]) ?? 0;
        resistanceEffect.effects.push(effect);
    }

    for (const key in resistances) {
        let beforeResistance = new RegExp(`\\d+ *[RDMPhsyn]{0,4} ( *or* ){0,1} *${resistances[key]}`, "i");
        let afterResistance = new RegExp(`${resistances[key]} ( *or* ){0,1} *[RDMPhsyn]{0,4} *\\d+`, "i");

        if (beforeResistance.test(effect)) {
            updateResistanceEffect(key, beforeResistance, effect);
        } else if (afterResistance.test(effect)) {
            updateResistanceEffect(key, afterResistance, effect);
        }
    }

    return resistanceEffect;
};

export const mysticCanCastEvaluate = (actor, spell, spellGrade, casted = { prepared: false, innate: false }, override = false) => {
    const spellCasting = {
        zeon: {
            accumulated: 0,
            cost: 0,
        },
        canCast: {
            prepared: false,
            innate: false,
        },
        casted: {
            prepared: false,
            innate: false,
        },
        override: false,
    };
    spellCasting.casted = casted;
    spellCasting.override = override;
    spellCasting.zeon.accumulated = actor.system.maccu.actual ?? 0;

    if (override) {
        return spellCasting;
    }

    spellCasting.zeon.cost = spell?.system[spellGrade].zeonCost;
    spellCasting.canCast.innate = actor.system.zeon.minnateFinal >= spellCasting.zeon.cost;

    spellCasting.canCast.prepared =
        /* actor.system.mpreparedSpells.find( ps => ps.name == spell.name && ps.system.grade.value == spellGrade)?.system.prepared.value ?? */
        false;

    if (!spellCasting.canCast.innate) {
        spellCasting.casted.innate = false;
    }
    if (!spellCasting.canCast.prepared) {
        spellCasting.casted.prepared = false;
    }
    return spellCasting;
};

export const evaluateCast = (spellCasting) => {
    const { i18n } = game;
    const { canCast, casted, zeon, override } = spellCasting;
    if (override) {
        return false;
    }
    if (canCast.innate && casted.innate && canCast.prepared && casted.prepared) {
        ui.notifications.warn(i18n.localize("abfalter.autoCombat.dialog.spellCasting.warning.mustChoose"));
        return true;
    }
    if (canCast.innate && casted.innate) {
        return;
    } else if (!canCast.innate && casted.innate) {
        ui.notifications.warn(i18n.localize("abfalter.autoCombat.dialog.spellCasting.warning.innateMagic"));
        return true;
    } else if (canCast.prepared && casted.prepared) {
        return false;
    } else if (!canCast.prepared && casted.prepared) {
        return ui.notifications.warn(i18n.localize("abfalter.autoCombat.dialog.spellCasting.warning.preparedSpell"));
    } else if (zeon.accumulated < zeon.cost) {
        ui.notifications.warn(i18n.localize("abfalter.autoCombat.dialog.spellCasting.warning.zeonAccumulated"));
        return true;
    } else return false;
};

export const findVar = (originalVar, path) => {
    let finalVar = originalVar;

    path.split(".").forEach((key) => {
        console.log(key);
        finalVar = finalVar[key];
    });

    return finalVar;
};

export const calculateDamage = (attack, defense, armor, damage, halvedAbs = false) => {
    let difference = attack - defense;
    let percent = 0;

    let finalArmor = armor;
    if (halvedAbs) finalArmor = Math.floor(armor / 2);

    if (difference < 30) percent = 0;
    else if (difference < 50 && finalArmor <= 1) {
        if (difference < 40 && finalArmor == 0) percent = 10;
        else percent = Math.floor((difference - (finalArmor * 10 + 10)) / 10) * 10;
    } else percent = Math.floor((difference - finalArmor * 10) / 10) * 10;

    const tempDamage = (damage * percent) / 100;
    const RoundDownDamage = Math.ceil(tempDamage);

    return Math.max(RoundDownDamage, 0);
};

export const addAttainablePowerLevels = (powerLevels, power, result) => {
    for (let key in power.system) {
        var match = key.match(/^effect(\d+)$/);
        if (match) {
            if (match[1] <= result) {
                powerLevels.push(key);
            }
        }
    }
};

export const psychicFatigueCheck = (effect) => {
    let regex = /Fatigue/i
    if (regex.test(effect)) {
        return parseInt(effect.match(/\d+/)[0]) ?? 0;
    } else {
        return 0;
    }
};
