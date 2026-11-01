package com.aaria.magickitchen.pilot

/** Fail-closed gate for a parent-reviewed content update on the foreground device. */
object ParentUpdateAuthorizationPolicy {
    fun canApprove(
        credentialResult: Int,
        successResult: Int,
        parentDialogApproved: Boolean,
        activityAlive: Boolean
    ): Boolean =
        credentialResult == successResult && parentDialogApproved && activityAlive

    fun canActivate(
        dialogApproved: Boolean,
        credentialApproved: Boolean,
        activityForeground: Boolean,
        activityAlive: Boolean
    ): Boolean =
        dialogApproved && credentialApproved && activityForeground && activityAlive
}
