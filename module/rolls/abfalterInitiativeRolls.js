import abfalterRoll from "./abfalterRolls.js";
import abfalterExploderRoll from "./abfalterExploderRolls.js";

export default class abfalterInitiativeRolls extends abfalterExploderRoll {
    evaluate() {
        super.evaluate();

        if (this.fumbled) {
            this.abfalterRoll.recalculateTotal(
                this.calculateFumbledInitiativeMod()
            );
        }

        return this.abfalterRoll;
    }

    calculateFumbledInitiativeMod() {
        if (this.abfalterRoll.firstResult === 1) return -126;
        if (this.abfalterRoll.firstResult === 2) return -102;
        if (this.abfalterRoll.firstResult <= this.fumbleRange) return -75 - this.abfalterRoll.firstResult;

        return 0;
    }
}
