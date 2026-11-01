package com.aaria.magickitchen.pilot

/** Fail-closed policy for external photo sharing from the child-facing app. */
internal object ParentShareAuthorizationPolicy {
    fun canRequest(
        hasSecureDeviceCredential: Boolean,
        activityForeground: Boolean,
        activityAlive: Boolean,
        requestAlreadyPending: Boolean
    ): Boolean = hasSecureDeviceCredential && activityForeground && activityAlive && !requestAlreadyPending

    fun canDispatch(
        credentialResult: Int,
        successResult: Int,
        hasPendingPhoto: Boolean,
        activityAlive: Boolean
    ): Boolean = credentialResult == successResult && hasPendingPhoto && activityAlive
}
