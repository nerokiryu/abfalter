export var playerCombatType;
(function (playerCombatType) {
    playerCombatType["RequestToAttack"] = "playerRequestToAttackRequest";
    playerCombatType["Attack"] = "playerAttack";
    playerCombatType["Defend"] = "playerDefend";
    playerCombatType["CancelCombat"] = "playerCancelCombat";
    playerCombatType["CounterAttack"] = "playerCounterAttack";
})(playerCombatType || (playerCombatType = {}));
