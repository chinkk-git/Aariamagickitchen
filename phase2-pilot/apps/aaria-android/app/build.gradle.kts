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
val v33MapSampleBuildSuffix = System.getenv("V33_MAP_SAMPLE_BUILD_SUFFIX")?.trim()?.takeIf { it.matches(Regex("[a-zA-Z0-9]+")) }
val v32ReviewBuildSuffix = System.getenv("V32_REVIEW_BUILD_SUFFIX")?.trim()?.takeIf { it.matches(Regex("[a-zA-Z0-9]+")) } ?: "local"
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
            applicationIdSuffix = if (v33MapSampleBuildSuffix != null) ".v33map${v33MapSampleBuildSuffix}" else ".v32review${v32ReviewBuildSuffix}"
            resValue("string", "app_name", if (v33MapSampleBuildSuffix != null) "Aaria Magical Kitchen V3.3 World Map Sample ${v33MapSampleBuildSuffix}" else "Aaria Magical Kitchen V3.2 Visual Review ${v32ReviewBuildSuffix}")
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
        versionCode = 8
        versionName = "1.0.4"
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
