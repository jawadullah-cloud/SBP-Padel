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
        versionCode = 12
        versionName = "0.12-debug"
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

dependencies {
    implementation("com.google.android.gms:play-services-auth:21.2.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
}
