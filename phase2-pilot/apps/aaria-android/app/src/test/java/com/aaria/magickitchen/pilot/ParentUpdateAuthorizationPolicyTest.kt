package com.aaria.magickitchen.pilot

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ParentUpdateAuthorizationPolicyTest {
    @Test fun approvalRequiresConfirmationDialogAndSuccessfulDeviceCredential() {
        assertTrue(ParentUpdateAuthorizationPolicy.canApprove(RESULT_OK, RESULT_OK, true, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canApprove(RESULT_CANCELED, RESULT_OK, true, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canApprove(RESULT_OK, RESULT_OK, false, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canApprove(RESULT_OK, RESULT_OK, true, false))
    }

    @Test fun activationRequiresApprovalAndLiveForegroundActivity() {
        assertTrue(ParentUpdateAuthorizationPolicy.canActivate(true, true, true, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canActivate(false, true, true, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canActivate(true, false, true, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canActivate(true, true, false, true))
        assertFalse(ParentUpdateAuthorizationPolicy.canActivate(true, true, true, false))
    }
}
