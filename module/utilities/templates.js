export const templates = {
    CustomHotBar: 'systems/abfalter/templates/autoCombat/customMacroBar.html',
    dialog: {
        generic: 'systems/abfalter/templates/dialogues/generic.html',
        initiative: 'systems/abfalter/templates/dialogues/initiative.html',
        edits: {
            header: 'systems/abfalter/templates/editDetails/headerEdit.html'
        },
        combat: {
            gmCombatDialog: {
                main: 'systems/abfalter/templates/autoCombat/gmCombatDialog.hbs',
                parts: {
                    combat: 'systems/abfalter/templates/autoCombat/gmParts/combat.hbs',
                    mystic: 'systems/abfalter/templates/autoCombat/gmParts/mystic.hbs',
                    psychic: 'systems/abfalter/templates/autoCombat/gmParts/psychic.hbs'
                }
            },
            combatAttackDialog: {
                main: 'systems/abfalter/templates/autoCombat/attackCombatDialog.hbs',
                parts: {
                    combat: 'systems/abfalter/templates/autoCombat/attackParts/combat.hbs',
                    mystic: 'systems/abfalter/templates/autoCombat/attackParts/mystic.hbs',
                    psychic: 'systems/abfalter/templates/autoCombat/attackParts/psychic.hbs'
                }
            },
            combatDefenseDialog: {
                main: 'systems/abfalter/templates/autoCombat/defenseCombatDialog.hbs',
                parts: {
                    combat: 'systems/abfalter/templates/autoCombat/defenseParts/combat.hbs',
                    mystic: 'systems/abfalter/templates/autoCombat/defenseParts/mystic.hbs',
                    psychic: 'systems/abfalter/templates/autoCombat/defenseParts/psychic.hbs'
                }
            },
        },
        common: {
            ui: {
                verticalInput: 'systems/abfalter/templates/autoCombat/common/ui/vertical-titled-input.hbs',
                horizontalInput: 'systems/abfalter/templates/autoCombat/common/ui/horizontal-titled-input.hbs',
                customSelect: 'systems/abfalter/templates/autoCombat/common/ui/custom-select.hbs',
                customSelectChoices: 'systems/abfalter/templates/autoCombat/common/ui/custom-select-choices.hbs',
                loadingIndicator: 'systems/abfalter/templates/autoCombat/common/ui/loading-indicator.hbs',

                addItemButton: 'systems/abfalter/templates/autoCombat/common/ui/add-item-button.hbs',
                groupBody: 'systems/abfalter/templates/autoCombat/common/ui/group-body.hbs',
                groupFooter: 'systems/abfalter/templates/autoCombat/common/ui/group-footer.hbs',
                groupHeaderTitle: 'systems/abfalter/templates/autoCombat/common/ui/group-header-title.hbs',
                groupHeader: 'systems/abfalter/templates/autoCombat/common/ui/group-header.hbs',
            }
        }
    },
    chat: {
        combatResult: 'systems/abfalter/templates/autoCombat/chat/combat-result.hbs',
    }
}