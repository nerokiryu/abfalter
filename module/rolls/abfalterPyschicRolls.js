import abfalterRoll from "./abfalterRolls.js";
import abfalterExploderRoll from "./abfalterExploderRolls.js";
//import { psychicPotentialEffect } from "../../combat/utils/psychicPotentialEffect.js";
//import { psychicFatigueCheck } from "../../combat/utils/psychicFatigueCheck.js";

export default class abfalterPsychicRoll extends abfalterExploderRoll {
    evaluate() {
        super.evaluate();
/*         const {
            general: {
                settings: { inhuman, zen },
            },
            psychic: { mentalPatterns, psychicDisciplines },
            power,
            mentalPatternImbalance,
        } = this.abfalterRoll.data;
        const powerDiscipline = power?.system.discipline.value;
        // @ts-ignore
        let imbalance = psychicDisciplines.find(
            (i) => i.name === powerDiscipline
        )?.system.imbalance
            ? 1
            : 0;
        let newPotentialTotal = psychicPotentialEffect(
            this.abfalterRoll.total ?? 0,
            imbalance,
            inhuman.value,
            zen.value
        );
        if (
            !psychicFatigueCheck(power?.system.effects[newPotentialTotal].value)
        ) {
            if (mentalPatternImbalance) {
                newPotentialTotal = psychicPotentialEffect(
                    newPotentialTotal,
                    1,
                    inhuman.value,
                    zen.value
                );
            } else if (
                power?.system.combatType.value === "attack" &&
                mentalPatterns.find((i) => i.name == "courage")
            ) {
                newPotentialTotal = psychicPotentialEffect(
                    newPotentialTotal,
                    1,
                    inhuman.value,
                    zen.value
                );
            }
        }

        this.abfalterRoll.overrideTotal(newPotentialTotal); */

        return this.abfalterRoll;
    }
}
