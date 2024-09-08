import { templates } from "../../utilities/templates.js";

const getInitialData = (attacker, defender, options = {}) => {
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;
    return {
        ui: {
            isCounter: options.isCounter ?? false,
            resistanceRoll: false,
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            customModifier: 0,
            rollResult: undefined,
            counterAttackBonus: options.counterAttackBonus,
            isReady: false,
        },
        defender: {
            token: defender,
            actor: defenderActor,
            customModifier: 0,
            rollResult: undefined,
            supernaturalShield: {
                doubleDamage: false,
                immuneToDamage: false,
            },
            isReady: false,
        },
        test: true
    };
};
export class gmCombatDialog extends FormApplication {
    constructor(attacker, defender, hooks, options = {}) {
        super(getInitialData(attacker, defender, options));
        this.hooks = hooks;
        this.data = getInitialData(attacker, defender, options);
        
        
        this.data.test = true;
        this.render(true);
    }
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ["gmCombatDialog"],
            submitOnChange: true,
            closeOnSubmit: false,
            resizable: true,
            height: 500,
            width: 600,
            template: templates.dialog.combat.gmCombatDialog.main,
            title: "GM Combat",
        });
    }
    get attackerActor() {
        return this.data.attacker.token.actor;
    }
    get defenderActor() {
        return this.data.defender.token.actor;
    }
    get attackerToken() {
        return this.data.attacker;
    }
    get defenderToken() {
        return this.data.defender;
    }
    async close(options = { executeHook: true }) {
        if (options?.executeHook) {
            await this.hooks.onClose();
        }
        return super.close();
    }
    activateListeners(html) {
        super.activateListeners(html);

        html.find('input[name="attacker.customModifier"]').on("change", this._onAttackerCustomModifierChange.bind(this));
        html.find('input[name="defender.customModifier"]').on("change", this._onDefenderCustomModifierChange.bind(this));
        html.find('input[name="attacker.updateRoll"]').on("click", this._onUpdateAttackRoll.bind(this));
        html.find(".defender.updateRoll").on("click", this._onUpdateDefenseRoll.bind(this));
        html.find(".cancelButton").click(() => {
            this.close();
        });
    }

    getData() {
        return this.data;
    }

    async _updateObject(event, formData) {
        console.log(formData);
        this.modalData = mergeObject(this.data, formData);
    
        this.render();
      }

    async resolveRoll(roll) {
        let rollResolved =  await roll;
        console.log(rollResolved);
        console.log(rollResolved.length);
        let LastRoll = rollResolved[rollResolved.length-1];
        console.log(LastRoll);
        return LastRoll;
    }
    async updateAttackerData(result) {
        const { attacker } = this.data;
        this.data.attacker.result = result;
        console.log("result*-------------------------------------------------------")

        this.data.attacker.rollResult = this.resolveRoll(attacker.result.roll).total
        console.log(attacker.result.roll);
        console.log(this.data.attacker.result.roll)
        console.log(attacker.result.roll.length)
        console.log(this.data.attacker.rollResult)
        this.data.attacker.isReady = true;
        //if combat/mystic/psychic
        if (result.type === "combat") {
            const { weapons } = this.attackerActor.items.filter((item) => item.type === "weapon");

            attacker.result.weapon = attacker.result.combat.weapon;
        }

        if (result.type === "mystic") {
            const { spells } = this.attackerActor.items.filter((item) => item.type === "spells");

            attacker.result.spell = spells.find((w) => w[0]._id === result.values.spellUsed);
        }

        if (result.type === "psychic") {
            const { psychicPowers } = this.attackerActor.items.filter((item) => item.type === "power");

            attacker.result.power = psychicPowers.find((w) => w[0]._id === result.values.powerUsed);
        }
        this.render();
    }
    async updateDefenderData(result) {
        const { defender } = this.data;
        this.data.defender.result = result;
        this.data.defender.rollResult = this.resolveRoll(defender.result.roll).total
        this.data.defender.isReady = true;
        // if shield or marial
        if (result.type === 'mystic') {
            const { spells } = this.defenderActor.system.mystic;
      
            defender.result.spell = spells.find(w => w._id === result.values.spellUsed);
          }
      
          if (result.type === 'psychic') {
            const { psychicPowers } = this.defenderActor.system.psychic;
      
            defender.result.power = psychicPowers.find(w => w._id === result.values.powerUsed);
          }
        this.render();
    }
    async _updateObject(event, formData) {
        this.render();
    }

    _onAttackerCustomModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.attacker.customModifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onDefenderCustomModifierChange(event) {
        event.preventDefault();
        const modifierValue = event.target.value;
        this.data.defender.customModifier = parseInt(modifierValue); // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    async _onUpdateAttackRoll(event) {
        event.preventDefault();
        const temp = await this.resolveRoll(this.data.attacker.result.roll);
        this.data.attacker.rollResult = temp.total // Update the modifier
        console.log(this.data.attacker.rollResult)
        this._updateObject(event); // Call the update method with the updated data
    }
    async _onUpdateDefenseRoll(event) {
        event.preventDefault();
        const temp = await this.resolveRoll(this.data.defender.result.roll);
        this.data.defender.rollResult = temp.total; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }





}
