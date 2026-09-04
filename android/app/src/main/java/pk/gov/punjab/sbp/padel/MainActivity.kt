package pk.gov.punjab.sbp.padel

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.SportsTennis
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val PadelLime = Color(0xFFD2FF3F)
private val DeepInk = Color(0xFF07110F)
private val DarkSurface = Color(0xFF10201C)
private val WarmWhite = Color(0xFFF5F7F2)
private val LightSurface = Color(0xFFFFFFFF)

private val DarkColors = darkColorScheme(
    primary = PadelLime,
    onPrimary = DeepInk,
    background = DeepInk,
    onBackground = Color(0xFFF1F6F2),
    surface = DarkSurface,
    onSurface = Color(0xFFF1F6F2),
    surfaceVariant = Color(0xFF18302A),
    onSurfaceVariant = Color(0xFFB9C9C3)
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF477700),
    onPrimary = Color.White,
    background = WarmWhite,
    onBackground = Color(0xFF152018),
    surface = LightSurface,
    onSurface = Color(0xFF152018),
    surfaceVariant = Color(0xFFE7EEE3),
    onSurfaceVariant = Color(0xFF536256)
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NativePadelRoot() }
    }
}

private data class UserSession(
    val token: String,
    val fullName: String,
    val email: String?,
    val phone: String?
)

private data class CourtInfo(val id: String, val name: String, val code: String, val type: String)

private data class VenueInfo(
    val id: String,
    val name: String,
    val city: String,
    val address: String,
    val description: String,
    val amenities: List<String>,
    val courts: List<CourtInfo> = emptyList()
)

private data class BookingInfo(
    val id: String,
    val code: String,
    val status: String,
    val venueName: String,
    val bookingDate: String,
    val amount: String
)

private class ApiException(message: String) : Exception(message)

private object NativeApi {
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')

    private suspend fun request(
        method: String,
        path: String,
        token: String? = null,
        body: JSONObject? = null
    ): String = withContext(Dispatchers.IO) {
        require(base.startsWith("https://")) { "Secure API endpoint is not configured." }
        val connection = URL("$base$path").openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 15_000
        connection.readTimeout = 20_000
        connection.setRequestProperty("Accept", "application/json")
        if (!token.isNullOrBlank()) connection.setRequestProperty("Authorization", "Bearer $token")
        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body.toString()) }
        }
        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        connection.disconnect()
        if (status !in 200..299) {
            val message = runCatching { JSONObject(text).optString("detail") }.getOrNull()
                ?.takeIf { it.isNotBlank() }
                ?: "Request failed ($status)."
            throw ApiException(message)
        }
        text
    }

    suspend fun login(identifier: String, password: String): UserSession {
        val payload = JSONObject().put("identifier", identifier.trim()).put("password", password)
        return parseAuth(JSONObject(request("POST", "/auth/login", body = payload)))
    }

    suspend fun register(fullName: String, email: String, password: String): UserSession {
        val payload = JSONObject()
            .put("full_name", fullName.trim())
            .put("email", email.trim().lowercase())
            .put("password", password)
        return parseAuth(JSONObject(request("POST", "/auth/register", body = payload)))
    }

    suspend fun me(token: String): UserSession {
        val obj = JSONObject(request("GET", "/auth/me", token = token))
        return UserSession(
            token = token,
            fullName = obj.optString("full_name").ifBlank { "Player" },
            email = obj.optString("email").takeIf { it.isNotBlank() && it != "null" },
            phone = obj.optString("phone").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    suspend fun venues(): List<VenueInfo> {
        val array = JSONArray(request("GET", "/venues"))
        return (0 until array.length()).map { index -> parseVenue(array.getJSONObject(index), false) }
    }

    suspend fun venue(id: String): VenueInfo {
        return parseVenue(JSONObject(request("GET", "/venues/$id")), true)
    }

    suspend fun bookings(token: String): List<BookingInfo> {
        val array = JSONArray(request("GET", "/bookings/me", token = token))
        return (0 until array.length()).map { i ->
            val obj = array.getJSONObject(i)
            BookingInfo(
                id = obj.optString("id"),
                code = obj.optString("booking_code").ifBlank { obj.optString("code").ifBlank { "Booking" } },
                status = obj.optString("status").ifBlank { "unknown" },
                venueName = obj.optString("venue_name").ifBlank { obj.optJSONObject("venue")?.optString("name").orEmpty() },
                bookingDate = obj.optString("booking_date").ifBlank { obj.optString("date") },
                amount = obj.opt("total_amount")?.toString() ?: obj.opt("total")?.toString().orEmpty()
            )
        }
    }

    private fun parseAuth(obj: JSONObject): UserSession {
        val user = obj.optJSONObject("user") ?: JSONObject()
        return UserSession(
            token = obj.getString("access_token"),
            fullName = user.optString("full_name").ifBlank { "Player" },
            email = user.optString("email").takeIf { it.isNotBlank() && it != "null" },
            phone = user.optString("phone").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    private fun parseVenue(obj: JSONObject, includeCourts: Boolean): VenueInfo {
        val amenitiesArray = obj.optJSONArray("amenities") ?: JSONArray()
        val amenities = (0 until amenitiesArray.length()).mapNotNull { amenitiesArray.optString(it).takeIf(String::isNotBlank) }
        val courtArray = if (includeCourts) obj.optJSONArray("courts") ?: JSONArray() else JSONArray()
        val courts = (0 until courtArray.length()).map { i ->
            val court = courtArray.getJSONObject(i)
            CourtInfo(
                id = court.optString("id"),
                name = court.optString("name").ifBlank { "Court" },
                code = court.optString("code"),
                type = court.optString("court_type").ifBlank { court.optString("type") }
            )
        }
        return VenueInfo(
            id = obj.optString("id"),
            name = obj.optString("name").ifBlank { "SBP Padel Venue" },
            city = obj.optString("city"),
            address = obj.optString("address"),
            description = obj.optString("description"),
            amenities = amenities,
            courts = courts
        )
    }
}

@Composable
private fun NativePadelRoot() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val prefs = remember { context.getSharedPreferences("sbp_padel_native", Context.MODE_PRIVATE) }
    var darkTheme by remember { mutableStateOf(prefs.getBoolean("dark_theme", true)) }
    var session by remember {
        mutableStateOf(
            prefs.getString("token", null)?.let {
                UserSession(it, prefs.getString("full_name", "Player") ?: "Player", prefs.getString("email", null), prefs.getString("phone", null))
            }
        )
    }
    var checkingSession by remember { mutableStateOf(session != null) }

    MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors) {
        Surface(modifier = Modifier.fillMaxSize()) {
            if (checkingSession) {
                LoadingBrand()
                LaunchedEffect(Unit) {
                    val current = session
                    if (current != null) {
                        session = runCatching { NativeApi.me(current.token) }.getOrNull()
                        if (session == null) prefs.edit().clear().apply()
                    }
                    checkingSession = false
                }
            } else if (session == null) {
                AuthScreen(
                    onAuthenticated = { newSession ->
                        session = newSession
                        prefs.edit()
                            .putString("token", newSession.token)
                            .putString("full_name", newSession.fullName)
                            .putString("email", newSession.email)
                            .putString("phone", newSession.phone)
                            .apply()
                    }
                )
            } else {
                NativeHomeShell(
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
private fun LoadingBrand() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            PadelMark()
            Spacer(Modifier.height(18.dp))
            Text("SBP PADEL", fontSize = 24.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            Spacer(Modifier.height(22.dp))
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
private fun PadelMark() {
    Box(
        modifier = Modifier
            .size(72.dp)
            .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(22.dp)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.SportsTennis,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.size(42.dp)
        )
    }
}

@Composable
private fun AuthScreen(onAuthenticated: (UserSession) -> Unit) {
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
            Spacer(Modifier.height(42.dp))
            PadelMark()
            Spacer(Modifier.height(22.dp))
            Text("SPORTS BOARD PUNJAB", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
            Text("Play Padel.\nBook Smarter.", fontSize = 38.sp, lineHeight = 42.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(10.dp))
            Text("Official SBP court discovery, booking and digital access.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 15.sp)
            Spacer(Modifier.height(28.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AuthModeButton("SIGN IN", !createMode, Modifier.weight(1f)) { createMode = false; error = null }
                AuthModeButton("CREATE ACCOUNT", createMode, Modifier.weight(1f)) { createMode = true; error = null }
            }
            Spacer(Modifier.height(22.dp))

            if (createMode) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Full name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
            }
            OutlinedTextField(
                value = identifier,
                onValueChange = { identifier = it },
                label = { Text(if (createMode) "Email" else "Email or mobile") },
                keyboardOptions = KeyboardOptions(keyboardType = if (createMode) KeyboardType.Email else KeyboardType.Text),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            error?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }
            Spacer(Modifier.height(18.dp))
            Button(
                enabled = !loading && identifier.isNotBlank() && password.isNotBlank() && (!createMode || fullName.isNotBlank()),
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        try {
                            val result = if (createMode) NativeApi.register(fullName, identifier, password) else NativeApi.login(identifier, password)
                            onAuthenticated(result)
                        } catch (e: Exception) {
                            error = e.message ?: "Unable to connect to SBP Padel."
                        } finally {
                            loading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (loading) CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text(if (createMode) "CREATE PLAYER ACCOUNT" else "ENTER SBP PADEL", fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(20.dp))
            Text("Native Android preview • Connected to SBP staging", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            Spacer(Modifier.height(42.dp))
        }
    }
}

@Composable
private fun AuthModeButton(label: String, active: Boolean, modifier: Modifier, onClick: () -> Unit) {
    if (active) Button(onClick = onClick, modifier = modifier, shape = RoundedCornerShape(14.dp)) { Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
    else OutlinedButton(onClick = onClick, modifier = modifier, shape = RoundedCornerShape(14.dp)) { Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
}

private enum class AppTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Outlined.Home),
    COURTS("Courts", Icons.Outlined.SportsTennis),
    BOOKINGS("Bookings", Icons.Outlined.CalendarMonth),
    PROFILE("Profile", Icons.Outlined.AccountCircle)
}

@Composable
private fun NativeHomeShell(
    session: UserSession,
    darkTheme: Boolean,
    onThemeToggle: () -> Unit,
    onLogout: () -> Unit
) {
    var tab by remember { mutableStateOf(AppTab.HOME) }
    var venues by remember { mutableStateOf<List<VenueInfo>>(emptyList()) }
    var loadingVenues by remember { mutableStateOf(true) }
    var venueError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            venues = NativeApi.venues()
        } catch (e: Exception) {
            venueError = e.message
        } finally {
            loadingVenues = false
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                AppTab.entries.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item,
                        onClick = { tab = item },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label, fontSize = 11.sp) }
                    )
                }
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when (tab) {
                AppTab.HOME -> HomeScreen(session, venues, loadingVenues, venueError) { tab = AppTab.COURTS }
                AppTab.COURTS -> CourtsScreen(venues, loadingVenues, venueError)
                AppTab.BOOKINGS -> BookingsScreen(session)
                AppTab.PROFILE -> ProfileScreen(session, darkTheme, onThemeToggle, onLogout)
            }
        }
    }
}

@Composable
private fun ScreenHeader(kicker: String, title: String, subtitle: String? = null) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 18.dp)) {
        Text(kicker.uppercase(), color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
        Text(title, fontSize = 29.sp, fontWeight = FontWeight.Black)
        if (!subtitle.isNullOrBlank()) Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
    }
}

@Composable
private fun HomeScreen(session: UserSession, venues: List<VenueInfo>, loading: Boolean, error: String?, onBrowse: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            ScreenHeader("SBP PADEL", "Good to see you, ${session.fullName.substringBefore(' ')}", "Official courts. Live availability. One player account.")
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Column(Modifier.padding(22.dp)) {
                    Text("FIND YOUR COURT", color = MaterialTheme.colorScheme.onPrimary, fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    Spacer(Modifier.height(6.dp))
                    Text("Book your next padel session", color = MaterialTheme.colorScheme.onPrimary, fontSize = 25.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(14.dp))
                    Button(
                        onClick = onBrowse,
                        colors = ButtonDefaults.buttonColors(containerColor = DeepInk, contentColor = Color.White),
                        shape = RoundedCornerShape(14.dp)
                    ) { Text("BROWSE COURTS", fontWeight = FontWeight.Bold) }
                }
            }
            Spacer(Modifier.height(24.dp))
            Text("VENUES", modifier = Modifier.padding(horizontal = 20.dp), fontSize = 14.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(10.dp))
        }
        when {
            loading -> item { LoadingRow() }
            error != null -> item { ErrorCard(error) }
            venues.isEmpty() -> item { EmptyCard("No active SBP padel venues are available yet.") }
            else -> items(venues.take(4)) { VenueCard(it, compact = true, onClick = onBrowse) }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun CourtsScreen(venues: List<VenueInfo>, loading: Boolean, error: String?) {
    var selected by remember { mutableStateOf<VenueInfo?>(null) }
    var loadingDetail by remember { mutableStateOf(false) }
    var detailError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LazyColumn(Modifier.fillMaxSize()) {
        item { ScreenHeader("DISCOVER", "Find your court", "Live venue data from the hosted SBP staging API.") }
        when {
            loading -> item { LoadingRow() }
            error != null -> item { ErrorCard(error) }
            venues.isEmpty() -> item { EmptyCard("No venues are active.") }
            else -> items(venues) { venue ->
                VenueCard(venue, compact = false) {
                    loadingDetail = true
                    detailError = null
                    scope.launch {
                        try { selected = NativeApi.venue(venue.id) }
                        catch (e: Exception) { detailError = e.message }
                        finally { loadingDetail = false }
                    }
                }
            }
        }
        if (loadingDetail) item { LoadingRow() }
        detailError?.let { item { ErrorCard(it) } }
        selected?.let { detail ->
            item {
                Text("${detail.name.uppercase()} COURTS", modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp), fontSize = 13.sp, fontWeight = FontWeight.Black)
            }
            if (detail.courts.isEmpty()) item { EmptyCard("No active courts are configured for this venue.") }
            else items(detail.courts) { court -> CourtCard(court) }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun VenueCard(venue: VenueInfo, compact: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).background(MaterialTheme.colorScheme.surfaceVariant, CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.LocationOn, null, tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(venue.name, fontSize = 17.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(listOf(venue.city, venue.address).firstOrNull { it.isNotBlank() }.orEmpty(), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, maxLines = if (compact) 1 else 2, overflow = TextOverflow.Ellipsis)
                }
            }
            if (!compact && venue.amenities.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text(venue.amenities.take(5).joinToString("  •  "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun CourtCard(court: CourtInfo) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.SportsTennis, null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(court.name, fontWeight = FontWeight.Black)
                Text(listOf(court.code, court.type).filter(String::isNotBlank).joinToString(" • "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            Text("VIEW", color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun BookingsScreen(session: UserSession) {
    var bookings by remember { mutableStateOf<List<BookingInfo>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(session.token) {
        try { bookings = NativeApi.bookings(session.token) }
        catch (e: Exception) { error = e.message }
        finally { loading = false }
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { ScreenHeader("YOUR GAME", "My Bookings", "Bookings attached to your live SBP player account.") }
        when {
            loading -> item { LoadingRow() }
            error != null -> item { ErrorCard(error!!) }
            bookings.isEmpty() -> item { EmptyCard("No bookings yet. Your next session will appear here.") }
            else -> items(bookings) { booking ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Column(Modifier.padding(17.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(booking.code, fontWeight = FontWeight.Black)
                            Text(booking.status.replace('_', ' ').uppercase(), color = MaterialTheme.colorScheme.primary, fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }
                        if (booking.venueName.isNotBlank()) Text(booking.venueName, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(booking.bookingDate, fontSize = 12.sp)
                            if (booking.amount.isNotBlank()) Text("PKR ${booking.amount}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun ProfileScreen(session: UserSession, darkTheme: Boolean, onThemeToggle: () -> Unit, onLogout: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            ScreenHeader("PLAYER", "Your profile")
            Card(Modifier.fillMaxWidth().padding(horizontal = 20.dp), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(54.dp).background(MaterialTheme.colorScheme.primary, CircleShape), contentAlignment = Alignment.Center) {
                            Text(session.fullName.take(1).uppercase(), color = MaterialTheme.colorScheme.onPrimary, fontSize = 22.sp, fontWeight = FontWeight.Black)
                        }
                        Spacer(Modifier.width(14.dp))
                        Column {
                            Text(session.fullName, fontSize = 20.sp, fontWeight = FontWeight.Black)
                            Text(session.email ?: session.phone ?: "SBP Player", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                    Divider()
                    Spacer(Modifier.height(12.dp))
                    Row(
                        Modifier.fillMaxWidth().clickable(onClick = onThemeToggle).padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(if (darkTheme) Icons.Outlined.LightMode else Icons.Outlined.DarkMode, null)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (darkTheme) "Switch to light theme" else "Switch to dark theme", fontWeight = FontWeight.Bold)
                            Text("Choose the app appearance you prefer.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                        Text("SIGN OUT", fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Text("Native Android client • ${BuildConfig.VERSION_NAME}", modifier = Modifier.padding(horizontal = 20.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        }
    }
}

@Composable
private fun LoadingRow() {
    Row(Modifier.fillMaxWidth().padding(28.dp), horizontalArrangement = Arrangement.Center) {
        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
    }
}

@Composable
private fun ErrorCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        shape = RoundedCornerShape(18.dp)
    ) { Text(message, modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer, fontSize = 13.sp) }
}

@Composable
private fun EmptyCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) { Text(message, modifier = Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) }
}
