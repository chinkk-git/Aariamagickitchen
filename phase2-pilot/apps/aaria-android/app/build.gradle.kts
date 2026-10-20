plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
val releaseStorePath = System.getenv("ANDROID_KEYSTORE_PATH")?.takeIf { it.isNotBlank() }
val releaseStorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")?.takeIf { it.isNotBlank() }
val releaseKeyAlias = System.getenv("ANDROID_KEY_ALIAS")?.takeIf { it.isNotBlank() }
val releaseKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")?.takeIf { it.isNotBlank() }
val releaseSigningValues = listOf(releaseStorePath, releaseStorePassword, releaseKeyAlias, releaseKeyPassword)
val releaseSigningConfigured = releaseSigningValues.all { it != null }
if (releaseSigningValues.any { it != null } && !releaseSigningConfigured) {
    throw GradleException("Release signing is partially configured; provide all protected signing inputs.")
}

android {
    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
    namespace = "com.aaria.magickitchen.pilot"
    compileSdk = 35
    buildFeatures {
        buildConfig = true
    }
    signingConfigs {
        if (releaseSigningConfigured) {
            create("release") {
                storeFile = file(releaseStorePath!!)
                storePassword = releaseStorePassword!!
                keyAlias = releaseKeyAlias!!
                keyPassword = releaseKeyPassword!!
            }
        }
    }
    buildTypes {
        getByName("debug") {
            applicationIdSuffix = ".v31preview"
            resValue("string", "app_name", "Aaria's Magical Kitchen V3.1 Preview")
        }
        getByName("release") {
            if (releaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    defaultConfig {
        applicationId = "com.aaria.magickitchen.pilot"
        minSdk = 26
        targetSdk = 34
        versionCode = 7
        versionName = "1.0.3"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    testImplementation("org.robolectric:robolectric:4.14")
}


gradle.taskGraph.whenReady {
    val requestsReleaseArtifact = allTasks.any { it.name == "assembleRelease" || it.name == "bundleRelease" }
    if (requestsReleaseArtifact && !releaseSigningConfigured) {
        throw GradleException("Refusing to build an unsigned release APK; configure the existing trusted signing key.")
    }
}
