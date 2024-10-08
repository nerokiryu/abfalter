import { templates } from "./templates.js"

export const preloadHandlebarsTemplates = () => {
    const templatePaths = [
        templates.CustomHotBar,
        templates.dialog.generic,
        templates.dialog.initiative,
        // generic ui tiles
        templates.dialog.common.ui.horizontalInput,
        templates.dialog.common.ui.verticalInput,
        templates.dialog.common.ui.customSelect,
        templates.dialog.common.ui.customSelectChoices,
        templates.dialog.common.ui.loadingIndicator,
        templates.dialog.common.ui.addItemButton,
        templates.dialog.common.ui.groupBody,
        templates.dialog.common.ui.groupFooter,
        templates.dialog.common.ui.groupHeaderTitle,
        templates.dialog.common.ui.groupHeader,
        // autoCombat
        templates.dialog.combat.gmCombatDialog.main,
        templates.dialog.combat.combatAttackDialog.main,
        templates.dialog.combat.combatAttackDialog.parts.combat,
        templates.dialog.combat.combatAttackDialog.parts.mystic,
        templates.dialog.combat.combatAttackDialog.parts.psychic,
        templates.dialog.combat.combatDefenseDialog.main,
        templates.dialog.combat.combatDefenseDialog.parts.combat,
        templates.dialog.combat.combatDefenseDialog.parts.mystic,
        templates.dialog.combat.combatDefenseDialog.parts.psychic,
        // chat message
        templates.chat.combatResult,
        //actor tabs
        "systems/abfalter/templates/actor/parts/bio.hbs",
        "systems/abfalter/templates/actor/parts/general.hbs",
        "systems/abfalter/templates/actor/parts/background.hbs",
        "systems/abfalter/templates/actor/parts/magic.hbs",
        "systems/abfalter/templates/actor/parts/psychic.hbs",
        "systems/abfalter/templates/actor/parts/ki.hbs",
        "systems/abfalter/templates/actor/parts/armory.hbs",
        "systems/abfalter/templates/actor/parts/settings.hbs",
        "systems/abfalter/templates/actor/parts/monster.hbs",
        "systems/abfalter/templates/actor/parts/effect.hbs",
        //partials
        "systems/abfalter/templates/actor/parts/metaMagic.hbs",
        "systems/abfalter/templates/actor/parts/active-effects.hbs",
        "systems/abfalter/templates/dialogues/changelog.hbs"
    ];
    return loadTemplates(templatePaths);
};