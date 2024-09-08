import abfalterRoll from "./abfalterRolls.js";

export class abfalterAbstractRoll {
    static DEFAULT_FUMBLE_RANGE = 3;
    static DEFAULT_OPEN_RANGE = 90;
    static DEFAULT_OPEN_WITH_DOUBLES = false;

    openRollRange = this.DEFAULT_OPEN_RANGE;
    fumbleRange = this.DEFAULT_FUMBLE_RANGE;
    openOnDoubles = this.DEFAULT_OPEN_WITH_DOUBLES;

    constructor(Roll) {
        if (this.abfalterRoll.data !== undefined) {
            this.openOnDoubles = this.abfalterRoll.data.system.rollRange.doubles;
            if (this.openOnDoubles === undefined) {
                // If openOnDoubles is set to 0 it's probably an actor from 1.14 that hasn't been configured
                this.openOnDoubles = this.DEFAULT_OPEN_WITH_DOUBLES;
            } 
            this.openRollRange = this.abfalterRoll.data.system.rollRange.final;
            if (this.openRollRange === 0) {
                // If openRollRange is set to 0 it's probably an actor from 1.14 that hasn't been configured
                this.openRollRange = this.DEFAULT_OPEN_RANGE;
            }
            this.fumbleRange = this.abfalterRoll.data.system.fumleRange.final;
            if (this.fumbleRange === 0) {
                // If fumbleRange is set to 0 it's probably an actor from 1.14 that hasn't been configured
                this.fumbleRange = this.DEFAULT_FUMBLE_RANGE;
            }
            if (Roll.formula.includes("mastery") && this.fumbleRange > 1){
                this.fumbleRange -= 1;
            }
        }
    }

    get firstDice() {
        return this.abfalterRoll.dice[0];
    }

    addRoll(newRoll) {
        this.firstDice.results.push({
            result: newRoll.getResults()[0],
            active: true,
        });

        return newRoll.getResults()[0];
    }

    getRoll() {
        return this.abfalterRoll;
    }

    evaluate(options) {}
}
