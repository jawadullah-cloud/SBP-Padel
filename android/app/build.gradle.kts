plugins {
    id("com.android.application")
}

android {
    namespace = "pk.gov.punjab.sbp.padel"
    compileSdk = 35

    signingConfigs {
        create("devStable") {
            storeFile = rootProject.file("dev-signing.keystore")
            storePassword = "sbppadeldev"
            keyAlias = "sbppadeldev"
            keyPassword = "sbppadeldev"
        }
    }

    defaultConfig {
        applicationId = "pk.gov.punjab.sbp.padel"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2-debug"
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("devStable")
        }
        release {
            isMinifyEnabled = false
        }
    }
}
