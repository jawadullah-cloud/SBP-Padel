plugins {
    id("com.android.application")
}

android {
    namespace = "pk.gov.punjab.sbp.padel"
    compileSdk = 35

    defaultConfig {
        applicationId = "pk.gov.punjab.sbp.padel"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1-debug"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
