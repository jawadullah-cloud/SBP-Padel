plugins {
    id("com.android.application")
}

android {
    namespace = "pk.gov.punjab.sbp.padel"
    compileSdk = 35
    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        create("devStable") {
            storeFile = rootProject.file("dev-signing.keystore")
            storePassword = "sbppadeldev"
            keyAlias = "sbppadeldev"
            keyPassword = "sbppadeldev"
        }
        create("officialRelease") {
            val storePath = System.getenv("SBP_PADEL_RELEASE_STORE_FILE")
            if (!storePath.isNullOrBlank()) {
                storeFile = file(storePath)
                storePassword = System.getenv("SBP_PADEL_RELEASE_STORE_PASSWORD")
                keyAlias = System.getenv("SBP_PADEL_RELEASE_KEY_ALIAS")
                keyPassword = System.getenv("SBP_PADEL_RELEASE_KEY_PASSWORD")
            }
        }
    }

    defaultConfig {
        applicationId = "pk.gov.punjab.sbp.padel"
        minSdk = 26
        targetSdk = 35
        versionCode = 13
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("devStable")
            versionNameSuffix = "-debug"
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            buildConfigField("String", "PLAYER_URL", "\"\"")
        }
        create("releaseCandidate") {
            initWith(getByName("release"))
            signingConfig = signingConfigs.getByName("devStable")
            versionNameSuffix = "-rc1"
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            buildConfigField("String", "PLAYER_URL", "\"https://sbp-padel-live-preview-sbp7.vercel.app/\"")
            matchingFallbacks += listOf("release")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("officialRelease")
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            buildConfigField("String", "PLAYER_URL", "\"https://sbp-padel-live-preview-sbp7.vercel.app/\"")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation("com.google.android.gms:play-services-auth:21.2.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
