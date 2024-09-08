import { templates } from "../../utilities/templates.js";
import abfalterRoll from "../../rolls/abfalterRolls.js";
import { rollCharacteristic, abilityRoll, rollCombatWeapon, openRollFunction, fumbleRollFunction, rollResistance, rollBreakage } from "../../diceroller.js";

const getInitialData = (attacker, defender, options = {}) => {
    //const showRollByDefault = !!game.settings.get('animabf', ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT);
    const isGM = !!game.user?.isGM;
    const attackerActor = attacker.actor;
    const defenderActor = defender.actor;

    const defensesCounter = 0;/*defenderActor.getFlag('abfalter', 'defensesCounter') || {
        accumulated: 0,
        keepAccumulating: true
      };*/

    return {
        ui: {
            isGM,
            hasFatiguePoints: defenderActor.system.fatigue.value > 0,
        },
        attacker: {
            token: attacker,
            actor: attackerActor,
            visible: attacker.visible,
            projectile: attacker.projectile,
            damageType: options.damageType,
            damagePen: options.atPen || 0,
        },
        defender: {
            token: defender,
            actor: defenderActor,
            showRoll: !isGM, // || showRollByDefault,
            withoutRoll: false,
            blindness: false,
            distance: attacker.distance,
            zen: false,//attackerActor.system.general.settings.zen.value,
            inhuman: false,//attackerActor.system.general.settings.inhuman.value,
            immaterial: false,//attackerActor.system.general.settings.immaterial.value,
            combat: {
                fatigueUsed: 0,
                multipleDefensesPenalty: defensesCounterCheck(defensesCounter),
                accumulateDefenses: true,
                modifier: 0,
                armor: 0,
                unarmed: false,
                weaponsList: undefined,
                weaponUsed: undefined,
                weapon: undefined,
                defenseType: "block",
            } /*,
            mystic: {
                modifier: 0,
                magicProjectionType: 'normal',
                spellUsed: undefined,
                spellGrade: 'base',
                critic: NoneWeaponCritic.NONE,
                damage: 0
            },
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
        const { combat } = this.data.defender
        const weapons = defender.actor.items.filter((item) => item.type === "weapon"); //filters through actor items for weapons
        this.data.defender.combat.weaponsList = weapons; //sends filtered weapons to form data
        if (weapons.length > 0) {
            combat.weaponUsed = weapons[0]._id; //sets first weapon on select list
            combat.weapon = weapons[0]
        } else {
            combat.unarmed = true;
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
    activateListeners(html) {
        super.activateListeners(html);
        html.find('select[name="defender.combat.weaponUsed"]').on("change", this._onWeaponSelectionChange.bind(this));
        html.find('select[name="defender.combat.defenseType"]').on("change", this._onDefenseTypeSelectionChange.bind(this));
        html.find('input[name="defender.combat.fatigueUsed"]').on("change", this._onFatigueChange.bind(this));
        html.find('input[name="defender.combat.modifier"]').on("change", this._onModifierChange.bind(this));
        html.find('input[name="defender.combat.multipleDefensesPenalty"]').on("change", this._onMultipleDefensesPenaltyChange.bind(this));
        html.find('input[name="defender.combat.accumulateDefenses"]').on("change", this._onAccumulateDefensesChange.bind(this));

        html.find(".sendNormDefense").click(async (event) => {
            const type = event.currentTarget.dataset.type === 'dodge' ? 'dodge' : 'block';
            this.data.defender.combat.defenseType = type;


            const { fatigueUsed, modifier, unarmed, weaponsList, weaponUsed, defenseType } = this.data.defender.combat; // from getInitial Data stuff
            console.log(this.data.defender.combat);
            
            const weapon = weaponsList.find((w) => w._id === weaponUsed);
            console.log(weapon);
            this.data.defenseSent = true;

            console.log(this.data.defender.actor);

            let finalMod = Math.floor(fatigueUsed * 15) + modifier;

            if (defenseType == "block") {
                finalMod += weapon.system.finalBlk;
            } else if (defenseType == "dodge") {
                finalMod += weapon.system.finalDod;
            }

            //TO FIX---------------------------------
            let damageType = this.data.attacker.damageType;
            let armorType = Object.keys(this.data.defender.actor.system.armor.body).filter((key) => key.toUpperCase().includes(damageType));
            console.log(this.data.defender.actor.system.armor.body[armorType[0]]);
            this.data.defender.combat.armor = this.data.defender.actor.system.armor.body[armorType[0]] - this.data.attacker.atPen;

            //\TO FIX---------------------------

            //let formula = `1d100xa + ${weapon.system.finalAtk} + ${Math.floor(this.data.attacker.combat.fatigueUsed * 15)} + ${this.data.attacker.combat.modifier}`; //+ ${counterAttackBonus}
            //const roll = new abfalterRoll(formula, this.data.attacker.attackerActor);
            const roll = rollCombatWeapon(html, this.data.defender.actor, finalMod, game.i18n.localize("abfalter.dialogs.rollingDfs"), weapon.system.complex);
            const result = {
                roll: roll,
                combat: this.data.defender.combat,
                resultTotal: -1,
                type: "combat",
            };
            this.hooks.onDefense(result);
            this.render();
        });
        4;
        html.find(".sendMysticAttack").click(() => {
            const { weapon, criticSelected, modifier, fatigueUsed, damage } = this.data.defender.combat; // from getInitial Data stuff
            if (typeof damage !== "undefined") {
                this.data.attackSent = true;
                this.render();
            }
        });
        html.find(".sendPsychicAttack").click(() => {
            const { weapon, criticSelected, modifier, fatigueUsed, damage } = this.data.defender.combat; // from getInitial Data stuff
            if (typeof damage !== "undefined") {
                this.data.attackSent = true;
                this.render();
            }
        });
    }

    getData() {
        const weapons = this.defenderActor.items.filter((item) => item.type === "weapon");
        return this.data;
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
        this.data.defender.combat.multipleDefensesPenalty = multipleDefensesPenaltyValue; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }
    _onAccumulateDefensesChange(event) {
        event.preventDefault();
        this.data.defender.combat.accumulateDefenses = !this.data.defender.combat.accumulateDefenses; // Update the modifier
        this._updateObject(event); // Call the update method with the updated data
    }

    async _updateObject(event, formData) {
        this.render();
    }
}
export const defensesCounterCheck = (defensesCounter) => {
    const multipleDefensesPenalty = [-0, -30, -50, -70, -90];
    let currentDefensePenalty = multipleDefensesPenalty[Math.min(defensesCounter, 4)]
    return currentDefensePenalty
    };

