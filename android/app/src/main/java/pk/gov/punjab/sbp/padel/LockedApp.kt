package pk.gov.punjab.sbp.padel

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

@Composable
internal fun LockedPadelApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { context.getSharedPreferences("sbp_padel_native", Context.MODE_PRIVATE) }
    var darkTheme by remember { mutableStateOf(prefs.getBoolean("dark_theme", true)) }
    var session by remember {
        mutableStateOf(
            prefs.getString("token", null)?.let { token ->
                LockedSession(
                    token,
                    prefs.getString("full_name", "Player") ?: "Player",
                    prefs.getString("email", null),
                    prefs.getString("phone", null)
                )
            }
        )
    }
    var validating by remember { mutableStateOf(session != null) }

    MaterialTheme(colorScheme = if (darkTheme) LockedDarkColors else LockedLightColors) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when {
                validating -> {
                    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center) {
                        CircularProgressIndicator(modifier = Modifier.padding(32.dp))
                    }
                    LaunchedEffect(Unit) {
                        val current = session
                        if (current != null) {
                            session = runCatching { LockedApi.me(current.token) }.getOrNull()
                            if (session == null) prefs.edit().clear().apply()
                        }
                        validating = false
                    }
                }
                session == null -> LockedAuthScreen { authenticated ->
                    session = authenticated
                    prefs.edit()
                        .putString("token", authenticated.token)
                        .putString("full_name", authenticated.fullName)
                        .putString("email", authenticated.email)
                        .putString("phone", authenticated.phone)
                        .apply()
                }
                else -> LockedMainShell(
                    session = session!!,
                    darkTheme = darkTheme,
                    onThemeToggle = {
                        darkTheme = !darkTheme
                        prefs.edit().putBoolean("dark_theme", darkTheme).apply()
                    },
                    onLogout = {
                        prefs.edit().clear().putBoolean("dark_theme", darkTheme).apply()
                        session = null
                    }
                )
            }
        }
    }
}

@Composable
private fun LockedAuthScreen(onAuthenticated: (LockedSession) -> Unit) {
    var createMode by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        item {
            Spacer(Modifier.height(40.dp))
            LockedOverline("Sports Board Punjab")
            Text("PLAY.", fontSize = 46.sp, lineHeight = 43.sp, fontWeight = FontWeight.Black, letterSpacing = (-2).sp)
            Text("PADEL.", color = MaterialTheme.colorScheme.primary, fontSize = 46.sp, lineHeight = 43.sp, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, letterSpacing = (-2).sp)
            Spacer(Modifier.height(8.dp))
            Text("Book your court. Fast, easy and seamless.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            Spacer(Modifier.height(24.dp))
            androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!createMode) Button(onClick = { createMode = false }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("SIGN IN", fontWeight = FontWeight.Black, fontSize = 11.sp) }
                else OutlinedButton(onClick = { createMode = false; error = null }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("SIGN IN", fontWeight = FontWeight.Black, fontSize = 11.sp) }
                if (createMode) Button(onClick = { createMode = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("CREATE ACCOUNT", fontWeight = FontWeight.Black, fontSize = 11.sp) }
                else OutlinedButton(onClick = { createMode = true; error = null }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp)) { Text("CREATE ACCOUNT", fontWeight = FontWeight.Black, fontSize = 11.sp) }
            }
            Spacer(Modifier.height(18.dp))
            if (createMode) {
                OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("Full name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
            }
            OutlinedTextField(
                value = identifier,
                onValueChange = { identifier = it },
                label = { Text(if (createMode) "Email" else "Email or mobile") },
                keyboardOptions = KeyboardOptions(keyboardType = if (createMode) KeyboardType.Email else KeyboardType.Text),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp)) }
            Spacer(Modifier.height(16.dp))
            LockedPrimaryButton(
                label = if (createMode) "Create player account" else "Enter SBP Padel",
                enabled = !loading && identifier.isNotBlank() && password.isNotBlank() && (!createMode || fullName.isNotBlank()),
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        try {
                            val result = if (createMode) LockedApi.register(fullName, identifier, password) else LockedApi.login(identifier, password)
                            onAuthenticated(result)
                        } catch (e: Exception) { error = e.message }
                        finally { loading = false }
                    }
                }
            )
            if (loading) CircularProgressIndicator(modifier = Modifier.padding(top = 14.dp))
            Spacer(Modifier.height(40.dp))
        }
    }
}