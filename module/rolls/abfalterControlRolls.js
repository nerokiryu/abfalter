import abfalterRoll from "./abfalterRolls.js";
import { abfalterAbstractRoll } from "./abfalterAbstractRolls.js";

export default class abfalterControlRoll extends abfalterAbstractRoll {
    success = false;

    evaluate() {
        let penalty = Math.max( 0, Math.floor(-this.abfalterRoll.data.system.aamField.final / 20));

        if (this.abfalterRoll.lastResult === 10) {
            this.success = true;
            penalty -= 2;
        }

        this.abfalterRoll.recalculateTotal(-penalty);

        return this.abfalterRoll;
    }
}
