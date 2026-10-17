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
        versionCode = 5
        versionName = "1.0.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

val phase2PilotRoot = rootProject.file("../../")
val packagedPilotAssets = layout.buildDirectory.dir("generated/phase2PilotAssets")

val syncPhase2PilotAssets by tasks.registering(org.gradle.api.tasks.Sync::class) {
    from(phase2PilotRoot) {
        include("apps/aaria-kitchen/**")
        include("domains/**")
        include("packages/**")
        into("phase2-pilot")
    }
    into(packagedPilotAssets)
}

android.sourceSets.getByName("main").assets.srcDir(packagedPilotAssets)

val verifyPhase2PilotAssets by tasks.registering {
    dependsOn(syncPhase2PilotAssets)
    doLast {
        val output = packagedPilotAssets.get().asFile
        val requiredAssets = listOf(
            "phase2-pilot/apps/aaria-kitchen/index.html",
            "phase2-pilot/apps/aaria-kitchen/app.js",
            "phase2-pilot/domains/cooking/recipes/load-catalog.js",
            "phase2-pilot/packages/ui/base.css"
        )
        val missingAssets = requiredAssets.filterNot { output.resolve(it).isFile }
        if (missingAssets.isNotEmpty()) {
            throw GradleException("Required V3 WebView assets were not packaged: ${missingAssets.joinToString()}")
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(verifyPhase2PilotAssets)
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
