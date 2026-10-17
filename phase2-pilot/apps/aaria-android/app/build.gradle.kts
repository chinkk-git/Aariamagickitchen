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
        versionCode = 6
        versionName = "1.0.2"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

val reviewedWebIndex = rootProject.file("../../../index.html")
val packagedWebAssets = layout.buildDirectory.dir("generated/reviewedWebAssets")

val copyReviewedWebIndex by tasks.registering(org.gradle.api.tasks.Copy::class) {
    from(reviewedWebIndex)
    into(packagedWebAssets)
    doFirst {
        if (!reviewedWebIndex.isFile || reviewedWebIndex.length() < 1_000_000L) {
            throw GradleException("The reviewed standalone index.html is missing or unexpectedly small.")
        }
    }
}

android.sourceSets.getByName("main").assets.srcDir(packagedWebAssets)

val verifyReviewedWebIndex by tasks.registering {
    dependsOn(copyReviewedWebIndex)
    doLast {
        val packagedIndex = packagedWebAssets.get().file("index.html").asFile
        if (!packagedIndex.isFile || packagedIndex.length() < 1_000_000L) {
            throw GradleException("The reviewed standalone index.html was not packaged for Android WebView.")
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(verifyReviewedWebIndex)
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
