plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val rcApiUrl = providers.gradleProperty("SBP_PADEL_RC_API_URL")
    .orElse(providers.environmentVariable("SBP_PADEL_RC_API_URL"))
    .getOrElse("https://sbp-padel-api-staging.vercel.app/api/v1")
val releaseApiUrl = providers.gradleProperty("SBP_PADEL_API_URL")
    .orElse(providers.environmentVariable("SBP_PADEL_API_URL"))
    .getOrElse("")
fun buildConfigString(value: String) = "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

android {
    namespace = "pk.gov.punjab.sbp.padel"
    compileSdk = 35

    buildFeatures {
        buildConfig = true
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
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
        versionCode = 14
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("devStable")
            versionNameSuffix = "-native-debug"
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            buildConfigField("String", "API_BASE_URL", buildConfigString(rcApiUrl))
        }
        create("releaseCandidate") {
            initWith(getByName("release"))
            signingConfig = signingConfigs.getByName("devStable")
            versionNameSuffix = "-rc2"
            isMinifyEnabled = true
            isShrinkResources = true
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            buildConfigField("String", "API_BASE_URL", buildConfigString(rcApiUrl))
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            matchingFallbacks += listOf("release")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("officialRelease")
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            buildConfigField("String", "API_BASE_URL", buildConfigString(releaseApiUrl))
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.09.03"))
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.google.android.gms:play-services-location:21.3.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
