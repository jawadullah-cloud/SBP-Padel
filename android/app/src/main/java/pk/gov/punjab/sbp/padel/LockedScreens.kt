package pk.gov.punjab.sbp.padel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.SportsTennis
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

internal enum class LockedTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Outlined.Home),
    BOOKINGS("Bookings", Icons.Outlined.CalendarMonth),
    COURTS("Courts", Icons.Outlined.SportsTennis),
    PROFILE("Profile", Icons.Outlined.AccountCircle)
}

@Composable
internal fun LockedMainShell(
    session: LockedSession,
    darkTheme: Boolean,
    onThemeToggle: () -> Unit,
    onLogout: () -> Unit
) {
    var tab by remember { mutableStateOf(LockedTab.HOME) }
    var venues by remember { mutableStateOf<List<LockedVenue>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var selectedVenue by remember { mutableStateOf<LockedVenue?>(null) }
    var showBookingFlow by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try { venues = LockedApi.venues() }
        catch (e: Exception) { error = e.message }
        finally { loading = false }
    }

    if (showBookingFlow && selectedVenue != null) {
        LockedBookingJourney(
            token = session.token,
            venue = selectedVenue!!,
            onClose = { showBookingFlow = false },
            onBookingCreated = {
                showBookingFlow = false
                tab = LockedTab.BOOKINGS
            }
        )
        return
    }

    Scaffold(
        topBar = { LockedBrandHeader(onThemeToggle, darkTheme) },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                LockedTab.entries.forEach { item ->
                    NavigationBarItem(
                        selected = tab == item,
                        onClick = {
                            selectedVenue = null
                            tab = item
                        },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) }
                    )
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            when {
                selectedVenue != null -> LockedVenueDetail(
                    venue = selectedVenue!!,
                    onBack = { selectedVenue = null },
                    onBook = {
                        scope.launch {
                            try { selectedVenue = LockedApi.venue(selectedVenue!!.id) }
                            catch (_: Exception) { }
                            showBookingFlow = true
                        }
                    }
                )
                tab == LockedTab.HOME -> LockedHome(
                    venues, loading, error,
                    onBrowse = { tab = LockedTab.COURTS },
                    onVenue = { venue ->
                        scope.launch {
                            selectedVenue = runCatching { LockedApi.venue(venue.id) }.getOrElse { venue }
                        }
                    }
                )
                tab == LockedTab.COURTS -> LockedVenues(
                    venues, loading, error,
                    onVenue = { venue ->
                        scope.launch {
                            selectedVenue = runCatching { LockedApi.venue(venue.id) }.getOrElse { venue }
                        }
                    }
                )
                tab == LockedTab.BOOKINGS -> LockedBookings(session)
                else -> LockedProfile(session, onBookings = { tab = LockedTab.BOOKINGS }, onLogout = onLogout)
            }
        }
    }
}

@Composable
private fun LockedHome(
    venues: List<LockedVenue>,
    loading: Boolean,
    error: String?,
    onBrowse: () -> Unit,
    onVenue: (LockedVenue) -> Unit
) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            LockedHero(onBrowse)
            Column(Modifier.padding(horizontal = 17.dp, vertical = 14.dp)) {
                Card(
                    shape = RoundedCornerShape(17.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth().border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(17.dp))
                ) {
                    Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            LockedOverline("Next available")
                            Text("Live court availability", fontSize = 19.sp, fontWeight = FontWeight.Black)
                            Text("Choose a venue to see real slots", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                        Box(Modifier.size(52.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.SportsTennis, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
                LockedSectionTitle("Explore", "Discover", "View all")
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    LockedQuickCard("⌖", "Our Facilities", "Explore SBP venues", Modifier.weight(1f), onBrowse)
                    LockedQuickCard("▣", "My Bookings", "Upcoming & past", Modifier.weight(1f), {})
                }
                Spacer(Modifier.height(20.dp))
                LockedOverline("Punjab")
                Text("Featured venue", fontSize = 21.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(8.dp))
            }
        }
        when {
            loading -> item { Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            error != null -> item { LockedEmptyState(error) }
            venues.isEmpty() -> item { LockedEmptyState("No active SBP Padel venues are available.") }
            else -> item { LockedVenueFeature(venues.first(), onVenue) }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun LockedQuickCard(icon: String, title: String, subtitle: String, modifier: Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(icon, color = MaterialTheme.colorScheme.primary, fontSize = 22.sp)
            Spacer(Modifier.height(7.dp))
            Text(title, fontWeight = FontWeight.Black, fontSize = 12.sp)
            Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
        }
    }
}

@Composable
private fun LockedVenueFeature(venue: LockedVenue, onVenue: (LockedVenue) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 17.dp).clickable { onVenue(venue) },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Box(
            Modifier.fillMaxWidth().height(175.dp).background(
                Brush.linearGradient(listOf(Color(0xFF07120E), Color(0xFF123A2A), Color(0xFF1B5572)))
            )
        ) {
            Text("FEATURED", modifier = Modifier.padding(12.dp).background(Color(0xCC071019), RoundedCornerShape(999.dp)).padding(horizontal = 9.dp, vertical = 6.dp), color = Color(0xFFBAFF98), fontSize = 9.sp, fontWeight = FontWeight.Black)
            Icon(Icons.Outlined.SportsTennis, null, tint = Color.White.copy(alpha = .6f), modifier = Modifier.size(92.dp).align(Alignment.Center))
        }
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                LockedOverline(venue.city.ifBlank { "Punjab" })
                Text(venue.name, fontSize = 18.sp, fontWeight = FontWeight.Black)
                Text(venue.address, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Text("↗", color = MaterialTheme.colorScheme.primary, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun LockedVenues(venues: List<LockedVenue>, loading: Boolean, error: String?, onVenue: (LockedVenue) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(8.dp))
            LockedOverline("Our facilities")
            Text("Find your\ncourt.", fontSize = 43.sp, lineHeight = 39.sp, fontWeight = FontWeight.Black, letterSpacing = (-1.5).sp)
            Text("SBP Padel venues across Punjab.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, modifier = Modifier.padding(vertical = 8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                LockedFilter("All", true, Modifier.weight(1f))
                LockedFilter("Near Me", false, Modifier.weight(1f))
            }
        }
        when {
            loading -> item { Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            error != null -> item { LockedEmptyState(error) }
            venues.isEmpty() -> item { LockedEmptyState("No active venues are available.") }
            else -> items(venues) { venue -> LockedVenueListCard(venue, onVenue) }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun LockedFilter(text: String, selected: Boolean, modifier: Modifier) {
    Box(
        modifier = modifier.height(38.dp).background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface, RoundedCornerShape(11.dp))
            .border(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, RoundedCornerShape(11.dp)),
        contentAlignment = Alignment.Center
    ) { Text(text, color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
}

@Composable
private fun LockedVenueListCard(venue: LockedVenue, onVenue: (LockedVenue) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 7.dp).clickable { onVenue(venue) },
        shape = RoundedCornerShape(19.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Box(Modifier.fillMaxWidth().height(118.dp).background(Brush.linearGradient(listOf(Color(0xFF123A2A), Color(0xFF1B5572))))) {
            Icon(Icons.Outlined.LocationOn, null, modifier = Modifier.align(Alignment.Center).size(54.dp), tint = Color.White.copy(alpha = .55f))
        }
        Column(Modifier.padding(14.dp)) {
            Text(venue.name, fontWeight = FontWeight.Black, fontSize = 17.sp)
            Text(listOf(venue.city, venue.address).filter { it.isNotBlank() }.joinToString(" • "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            if (venue.amenities.isNotEmpty()) Text(venue.amenities.take(4).joinToString("  •  "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, modifier = Modifier.padding(top = 7.dp))
        }
    }
}

@Composable
private fun LockedVenueDetail(venue: LockedVenue, onBack: () -> Unit, onBook: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Box(Modifier.fillMaxWidth().height(252.dp).padding(horizontal = 12.dp).background(Brush.linearGradient(listOf(Color(0xFF07120E), Color(0xFF123A2A), Color(0xFF1B5572))), RoundedCornerShape(28.dp))) {
                OutlinedButton(onClick = onBack, modifier = Modifier.padding(12.dp), shape = CircleShape) { Text("←") }
                Icon(Icons.Outlined.SportsTennis, null, tint = Color.White.copy(alpha = .5f), modifier = Modifier.size(110.dp).align(Alignment.Center))
                Text("VENUE", modifier = Modifier.align(Alignment.BottomStart).padding(16.dp).background(Color(0xCC071019), RoundedCornerShape(999.dp)).padding(horizontal = 9.dp, vertical = 5.dp), color = Color.White, fontWeight = FontWeight.Black, fontSize = 9.sp)
            }
            Column(Modifier.padding(17.dp)) {
                LockedOverline("Sports Board Punjab")
                Text(venue.name, fontSize = 34.sp, lineHeight = 32.sp, fontWeight = FontWeight.Black, letterSpacing = (-1).sp)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    LockedStat(venue.courts.size.toString(), "Courts", Modifier.weight(1f))
                    LockedStat(if (venue.courts.any { it.type.contains("indoor", true) }) "Indoor" else "Outdoor", "Facility", Modifier.weight(1f))
                    LockedStat("☼", "Floodlights", Modifier.weight(1f))
                }
                Spacer(Modifier.height(13.dp))
                Text(venue.description.ifBlank { venue.address }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, lineHeight = 19.sp)
                if (venue.amenities.isNotEmpty()) Text(venue.amenities.take(6).joinToString("  •  "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, modifier = Modifier.padding(vertical = 12.dp))
                LockedPrimaryButton("Book a court", onBook)
            }
        }
    }
}

@Composable
private fun LockedStat(value: String, label: String, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(11.dp)) {
            Text(value, fontWeight = FontWeight.Black, fontSize = 15.sp)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp)
        }
    }
}

@Composable
private fun LockedBookings(session: LockedSession) {
    var bookings by remember { mutableStateOf<List<LockedBooking>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(session.token) {
        try { bookings = LockedApi.bookings(session.token) }
        catch (e: Exception) { error = e.message }
        finally { loading = false }
    }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(8.dp))
            Text("My Bookings", fontSize = 32.sp, fontWeight = FontWeight.Black)
            Text("Manage upcoming and previous court sessions.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Spacer(Modifier.height(14.dp))
        }
        when {
            loading -> item { Box(Modifier.fillMaxWidth().padding(30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
            error != null -> item { LockedEmptyState(error) }
            bookings.isEmpty() -> item { LockedEmptyState("No bookings yet. Your next court session will appear here.") }
            else -> items(bookings) { booking ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(15.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(booking.code, fontWeight = FontWeight.Black)
                            Text(booking.status.replace('_', ' ').uppercase(), color = MaterialTheme.colorScheme.primary, fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(booking.date, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                            Text("${booking.currency} ${booking.total}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LockedProfile(session: LockedSession, onBookings: () -> Unit, onLogout: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(58.dp).background(MaterialTheme.colorScheme.surfaceVariant, CircleShape), contentAlignment = Alignment.Center) {
                    Text(session.fullName.take(1).uppercase(), fontWeight = FontWeight.Black, fontSize = 23.sp)
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text(session.fullName, fontSize = 19.sp, fontWeight = FontWeight.Black)
                    Text(session.email ?: session.phone ?: "Player profile", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
            }
            Spacer(Modifier.height(18.dp))
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                LockedMenuRow("▣", "My Bookings", onBookings)
                LockedMenuRow("◫", "Payment History", {})
                LockedMenuRow("♧", "Saved Players", {})
                LockedMenuRow("♡", "Favourite Venues", {})
                LockedMenuRow("♧", "Notifications", {})
                LockedMenuRow("ⓘ", "Help & Support", {})
            }
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp)) { Text("SIGN OUT", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun LockedMenuRow(icon: String, label: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().height(52.dp).clickable(onClick = onClick).padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
        Text(label, modifier = Modifier.weight(1f).padding(start = 10.dp), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
        Text("›", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 20.sp)
    }
}