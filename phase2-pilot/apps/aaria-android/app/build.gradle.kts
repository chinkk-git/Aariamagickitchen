plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.aaria.magickitchen.pilot"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.aaria.magickitchen.pilot"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0-pilot"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
