export default class abfalterItem extends Item {

    prepareData() {
        let functionName = `prepare${this.type[0].toUpperCase() + this.type.slice(1, this.type.length)}`
        if (this[`${functionName}`])
            this[`${functionName}`]()
        super.prepareData();
    }

    prepareArmor() {
        this.system.qualityValue = Math.floor(this.system.quality / 5);
        this.system.newPresence = Math.floor(+(this.system.qualityValue * 50) + +this.system.presence);
        this.system.newFortitude = Math.floor(+(this.system.qualityValue * 10) + +this.system.fortitude);
        this.system.newReq = Math.floor(+this.system.requirement - +(this.system.qualityValue * 5));
        if (this.system.newReq > 0) {
            this.system.newRequirement = this.system.newReq;
        } else {
            this.system.newRequirement = 0;
        };
        this.system.newNatPen = Math.floor(+this.system.natPenalty - +(this.system.qualityValue * 5));
        if (this.system.newNatPen > 0) {
            this.system.newNatPenalty = this.system.newNatPen;
        } else {
            this.system.newNatPenalty = 0;
        };
        this.system.newMovePen = Math.floor(+this.system.movePenalty - +this.system.qualityValue);
        if (this.system.newMovePen > 0) {
            this.system.newMovePenalty = this.system.newMovePen;
        } else {
            this.system.newMovePenalty = 0;
        };
        this.system.AT.newCut = Math.floor(+this.system.AT.cut + +this.system.qualityValue);
        this.system.AT.newImp = Math.floor(+this.system.AT.imp + +this.system.qualityValue);
        this.system.AT.newThr = Math.floor(+this.system.AT.thr + +this.system.qualityValue);
        this.system.AT.newHeat = Math.floor(+this.system.AT.heat + +this.system.qualityValue);
        this.system.AT.newCold = Math.floor(+this.system.AT.cold + +this.system.qualityValue);
        this.system.AT.newEle = Math.floor(+this.system.AT.ele + +this.system.qualityValue);
        this.system.AT.newEne = Math.floor(+this.system.AT.ene + +this.system.qualityValue);
        this.system.AT.newSpt = Math.floor(+this.system.AT.spt + +this.system.qualityValue);

        if (this.parent != null) {
            if (this.parent) {
                this.system.spiritHomebrew = this.parent.system.toggles.spiritDamageType;
            }
        }
    }

    prepareArmorHelmet() {
        this.system.qualityValue = Math.floor(this.system.quality / 5);
        this.system.newPresence = Math.floor(+(this.system.qualityValue * 50) + +this.system.presence);
        this.system.newFortitude = Math.floor(+(this.system.qualityValue * 10) + +this.system.fortitude);
        this.system.newReq = Math.floor(+this.system.requirement - +(this.system.qualityValue * 5));
        if (this.system.newReq > 0) {
            this.system.newRequirement = this.system.newReq;
        } else {
            this.system.newRequirement = 0;
        };
        this.system.newNatPen = Math.floor(+this.system.natPenalty - +(this.system.qualityValue * 5));
        if (this.system.newNatPen > 0) {
            this.system.newNatPenalty = this.system.newNatPen;
        } else {
            this.system.newNatPenalty = 0;
        };
        this.system.AT.newCut = Math.floor(+this.system.AT.cut + +this.system.qualityValue);
        this.system.AT.newImp = Math.floor(+this.system.AT.imp + +this.system.qualityValue);
        this.system.AT.newThr = Math.floor(+this.system.AT.thr + +this.system.qualityValue);
        this.system.AT.newHeat = Math.floor(+this.system.AT.heat + +this.system.qualityValue);
        this.system.AT.newCold = Math.floor(+this.system.AT.cold + +this.system.qualityValue);
        this.system.AT.newEle = Math.floor(+this.system.AT.ele + +this.system.qualityValue);
        this.system.AT.newEne = Math.floor(+this.system.AT.ene + +this.system.qualityValue);
        this.system.AT.newSpt = Math.floor(+this.system.AT.spt + +this.system.qualityValue);

        if (this.parent != null) {
            if (this.parent) {
                this.system.spiritHomebrew = this.parent.system.toggles.spiritDamageType;
            }
        }
    }

    prepareWeapon() {
        if (this.parent != null) {
            this.system.atkClass = ~~this.parent.system.combatstats.atkClass;
            this.system.blkClass = ~~this.parent.system.combatstats.blkClass;
            this.system.dodClass = ~~this.parent.system.combatstats.dodClass;
            this.system.atkParentFinal = ~~this.parent.system.atkfinal;
            this.system.blkParentFinal = ~~this.parent.system.blkfinal;
            this.system.dodParentFinal = ~~this.parent.system.dodfinal;
            if (this.parent.system.kiAbility.kiAuraEx.status == true) {
                this.system.kiBonus = 5;
                this.system.kiBonus1 = 10;
                this.system.kiBonusDmg = 10;
            }
            if (this.parent.system.kiAbility.kiEleFire.status == true && this.system.primDmgT =="HEAT") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiEleWater.status == true && this.system.primDmgT == "COLD") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiEleAir.status == true && this.system.primDmgT == "ELE") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiEleEarth.status == true && this.system.primDmgT == "IMP") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiEleLight.status == true && this.system.primDmgT == "ENE") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiEleDark.status == true && this.system.primDmgT == "ENE") {
                this.system.kiBonusDmg += 10;
            }
            if (this.parent.system.kiAbility.kiIncreaseDmg.status == true) {
                this.system.kiBonusDmg += 10;
            }
            switch (this.system.dmgMod) {
                case "agi":
                    this.system.bonusDmgMod = this.parent.system.stats.Agility.mod;
                    break;
                case "con":
                    this.system.bonusDmgMod = this.parent.system.stats.Constitution.mod;
                    break;
                case "str":
                    this.system.bonusDmgMod = this.parent.system.stats.Strength.mod;
                    break;
                case "dex":
                    this.system.bonusDmgMod = this.parent.system.stats.Dexterity.mod;
                    break;
                case "per":
                    this.system.bonusDmgMod = this.parent.system.stats.Perception.mod;
                    break;
                case "int":
                    this.system.bonusDmgMod = this.parent.system.stats.Intelligence.mod;
                    break;
                case "pow":
                    this.system.bonusDmgMod = this.parent.system.stats.Power.mod;
                    break;
                case "wp":
                    this.system.bonusDmgMod = this.parent.system.stats.Willpower.mod;
                    break;
                case "str2":
                    this.system.bonusDmgMod = Math.floor(~~this.parent.system.stats.Strength.mod * 2);
                    break;
                case "presence":
                    this.system.bonusDmgMod = Math.floor((this.parent.system.combatstats.currentPres * 2) + this.parent.system.stats.Power.mod);
                    break;
                default:
                    break;
            }
            switch (this.parent.system.stats.Strength.final) {
                case 8:
                case 9:
                    this.system.breakageStr = 1;
                    break;
                case 10:
                    this.system.breakageStr = 2;
                    break;
                case 11:
                case 12:
                    this.system.breakageStr = 4;
                    break;
                case 13:
                case 14:
                    this.system.breakageStr = 6;
                    break;
                default:
                    this.system.breakageStr = 0;
                    break;
            }
            if (this.parent.system.stats.Strength.final >= 15) {
                this.system.breakageStr = 8;
            }
        } else {
            this.system.atkClass = 0;
            this.system.blkClass = 0;
            this.system.dodClass = 0;
            this.system.bonusDmgMod = 0;
            this.system.atkParentFinal = 0;
            this.system.blkParentFinal = 0;
            this.system.dodParentFinal = 0;
            this.system.breakageStr = 0;
            this.system.kiBonus = 0;
            this.system.kiBonus1 = 0;
        }

        this.system.finalAtk = Math.floor(~~this.system.attack + ~~this.system.atkParentFinal + ~~this.system.atkClass + ~~this.system.quality);
        switch (this.system.shield) {
            case "none":
                this.system.shieldBonus = 0;
                this.system.shieldBonus2 = 0;
                this.system.shieldTypeSpeed = 0;
                break;
            case "buckler":
                this.system.shieldBonus = 10;
                this.system.shieldBonus2 = 5;
                this.system.shieldTypeSpeed = -15;
                break;
            case "shield":
                this.system.shieldBonus = 20;
                this.system.shieldBonus2 = 10;
                this.system.shieldTypeSpeed = -25;
                break;
            case "fShield":
                this.system.shieldBonus = 30;
                this.system.shieldBonus2 = 15;
                this.system.shieldTypeSpeed = -40;
                break;
            default:
                break;
        }
        this.system.finalBlk = Math.floor(~~this.system.block + ~~this.system.blkParentFinal + ~~this.system.blkClass + ~~this.system.shieldBonus + ~~this.system.quality);
        this.system.finalDod = Math.floor(~~this.system.dodge + ~~this.system.dodParentFinal + ~~this.system.dodClass + ~~this.system.shieldBonus2);


        if (this.system.toggle == true) {
            this.system.bonusDmgMod = Math.floor(this.system.bonusDmgMod * 2);
        }
        this.system.finalDmg = Math.floor(~~this.system.baseDmg + ~~this.system.bonusDmgMod + (~~this.system.quality * 2) + ~~this.system.kiBonusDmg);
        this.system.fortFinal = Math.floor(~~this.system.fortitude + (~~this.system.quality * 2) + ~~this.system.kiBonus1);
        this.system.atPenFinal = Math.floor(~~this.system.atPen + Math.floor(~~this.system.quality / 5));
        this.system.finalBreakage = Math.floor(~~this.system.breakage + ~~this.system.breakageStr + ~~this.system.quality + ~~this.system.kiBonus)
        this.system.preFinal = Math.floor(~~this.system.presence + (~~this.system.quality * 10));
        this.system.shieldFinalSpeed = Math.floor(~~this.system.shieldSpeed + ~~this.system.shieldTypeSpeed);
        this.system.FinalWeaponSpeed = Math.floor(~~this.system.speed + ~~this.system.shieldFinalSpeed + ~~this.system.quality);
    }

    prepareMentalPattern() {
        if (this.system.toggle == true) {
            this.system.finalCost = Math.floor(+this.system.cost + +this.system.cancelCost);
        } else {
            this.system.finalCost = this.system.cost;
        }
    }

    preparePsychicMatrix() {

        if (this.parent != null) {
            if (this.parent) {
                this.system.newPotential = Math.floor(~~this.parent.system.finalPotential + ~~this.system.bonus);
            }
        }
    }

    prepareKiTechnique() {
        if (this.parent != null) {
            if (this.parent) {
                this.system.unified = this.parent.system.toggles.unifiedPools;
                this.system.innatePower = this.parent.system.toggles.innatePower;
            }
        }
    }

    prepareElan() {
        this.system.totalCost = 0;
        if (this.system.level >= 50) {
            this.system.upper = true;
        } else {
            this.system.upper = false;
        }
        for (let [key, gift] of Object.entries(this.system.gifts)) {
            if (this.system.level >= ~~gift.req && ~~gift.req != 0) {
                gift.bought = true;
            } else {
                gift.bought = false;
            }
            if (gift.req != 0) {
                this.system.totalCost += gift.cost;
            }
        }
    }










    chatTemplate = {
        "spell": "systems/abfalter/templates/item/spell.html",
    }

    async roll() {
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker(),
        };

        let cardData = {
            ...this.data,
            owner: this.actor.id
        };

        chatData.content = await renderTemplate(this.chatTemplate[this.type], cardData);

        chatData.roll = true;

        return ChatMessage.create(chatData);
    }


}