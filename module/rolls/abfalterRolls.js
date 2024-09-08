import abfalterExploderRoll from './abfalterExploderRolls.js';
import abfalterInitiativeRoll from './abfalterInitiativeRolls.js';
import abfalterControlRoll from './abfalterControlRolls.js';
import abfalterPsychicRoll from './abfalterPyschicRolls.js';
export default class abfalterRoll extends Roll {
    static abfalterRoll;
    constructor(rawFormula, data, options) {
        let formula = rawFormula.trim();

        // In FoundryVTT 0.8.8 I don't know why but the system inserts at the end a "+ "
        // so here, if we found that the end of the formula is "+ " we remove it
        if (formula.endsWith("+")) {
            formula = formula.substr(0, formula.length - 1);
        }

        super(formula, data, options);

        if (data) {
            this.data = data;
        }

        if (this.formula.includes("xa")) {
            this.abfalterRoll = new abfalterExploderRoll(this);
        }

        if (this.formula.includes("Initiative")) {
            this.abfalterRoll = new abfalterInitiativeRoll(this);
        }

        if (this.formula.includes("ControlRoll")) {
            this.abfalterRoll = new abfalterControlRoll(this);
        }

        if (this.formula.includes("PsychicRoll")) {
            this.abfalterRoll = new abfalterPsychicRoll(this);
        }
    }

    get firstResult() {
        return this.getResults()[0];
    }

    get lastResult() {
        return this.getResults()[this.getResults().length - 1];
    }

    get fumbled() {
        if (this.abfalterRoll instanceof abfalterExploderRoll)
            return this.abfalterRoll?.fumbled || false;
        return false;
    }

    recalculateTotal(mod = 0) {
        this._total = this._evaluateTotal() + mod;
    }

    overrideTotal(newTotal = 0) {
        if (newTotal) {
            this._total = newTotal;
        }
    }

    getResults() {
        return this.dice.map((d) => d.results.map((res) => res.result)).flat();
    }
}
