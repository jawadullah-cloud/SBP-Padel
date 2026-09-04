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
import androidx.compose.material.icons.outlined.SportsTennis
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private enum class LockedBookingStep { DATE_COURT, TIME, REVIEW, PAYMENT }

@Composable
internal fun LockedBookingJourney(
    token: String,
    venue: LockedVenue,
    onClose: () -> Unit,
    onBookingCreated: (NativeBookingCreated) -> Unit
) {
    var step by remember { mutableStateOf(LockedBookingStep.DATE_COURT) }
    var date by remember { mutableStateOf(LocalDate.now().plusDays(1)) }
    var availability by remember { mutableStateOf<NativeAvailability?>(null) }
    var selectedCourt by remember { mutableStateOf<NativeCourtAvailability?>(null) }
    var selectedTimes by remember { mutableStateOf<List<String>>(emptyList()) }
    var quote by remember { mutableStateOf<NativeQuote?>(null) }
    var policy by remember { mutableStateOf<NativePolicy?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(date, venue.id) {
        loading = true
        error = null
        try {
            availability = NativeBookingApi.availability(venue.id, date.toString())
            if (policy == null) policy = NativeBookingApi.activePolicy()
            selectedCourt?.let { chosen ->
                selectedCourt = availability?.courts?.firstOrNull { it.courtId == chosen.courtId }
                val stillAvailable = selectedCourt?.slots?.filter { it.available }?.map { it.startTime }?.toSet().orEmpty()
                selectedTimes = selectedTimes.filter { it in stillAvailable }
            }
        } catch (e: Exception) { error = e.message }
        finally { loading = false }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(onClick = {
                when (step) {
                    LockedBookingStep.DATE_COURT -> onClose()
                    LockedBookingStep.TIME -> step = LockedBookingStep.DATE_COURT
                    LockedBookingStep.REVIEW -> step = LockedBookingStep.TIME
                    LockedBookingStep.PAYMENT -> step = LockedBookingStep.REVIEW
                }
            }, shape = CircleShape, modifier = Modifier.size(42.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)) { Text("←") }
            Column(Modifier.padding(start = 12.dp)) {
                LockedOverline("Book a court")
                Text(venue.name, fontWeight = FontWeight.Black, fontSize = 18.sp)
            }
        }
        LockedProgress(step)
        when (step) {
            LockedBookingStep.DATE_COURT -> LockedDateCourtStep(
                date = date,
                onDate = {
                    if (it != date) {
                        date = it
                        selectedCourt = null
                        selectedTimes = emptyList()
                        quote = null
                    }
                },
                availability = availability,
                selectedCourt = selectedCourt,
                onCourt = {
                    if (selectedCourt?.courtId != it.courtId) {
                        selectedCourt = it
                        selectedTimes = emptyList()
                        quote = null
                    }
                },
                loading = loading,
                error = error,
                onContinue = { if (selectedCourt != null) step = LockedBookingStep.TIME }
            )
            LockedBookingStep.TIME -> LockedTimeStep(
                court = selectedCourt,
                selectedTimes = selectedTimes,
                onTimes = { selectedTimes = it; quote = null },
                onContinue = { if (selectedTimes.isNotEmpty()) step = LockedBookingStep.REVIEW }
            )
            LockedBookingStep.REVIEW -> LockedReviewStep(
                venue = venue,
                date = date,
                court = selectedCourt,
                times = selectedTimes,
                quote = quote,
                policy = policy,
                loading = loading,
                error = error,
                onRefreshQuote = {
                    loading = true
                    error = null
                    scope.launch {
                        try { quote = NativeBookingApi.quote(venue.id, selectedCourt!!.courtId, date.toString(), selectedTimes) }
                        catch (e: Exception) { error = e.message }
                        finally { loading = false }
                    }
                },
                onPayment = {
                    if (quote != null && policy != null) step = LockedBookingStep.PAYMENT
                }
            )
            LockedBookingStep.PAYMENT -> LockedPaymentStep(
                venue = venue,
                date = date,
                court = selectedCourt!!,
                times = selectedTimes,
                quote = quote!!,
                loading = loading,
                error = error,
                onPay = {
                    loading = true
                    error = null
                    scope.launch {
                        try {
                            val finalQuote = NativeBookingApi.quote(venue.id, selectedCourt!!.courtId, date.toString(), selectedTimes)
                            quote = finalQuote
                            val created = NativeBookingApi.createBooking(token, venue.id, selectedCourt!!.courtId, date.toString(), selectedTimes, policy!!.id)
                            onBookingCreated(created)
                        } catch (e: Exception) { error = e.message }
                        finally { loading = false }
                    }
                }
            )
        }
    }
}

@Composable
private fun LockedProgress(step: LockedBookingStep) {
    val current = when (step) {
        LockedBookingStep.DATE_COURT -> 3
        LockedBookingStep.TIME -> 4
        LockedBookingStep.REVIEW, LockedBookingStep.PAYMENT -> 5
    }
    val labels = listOf("Venue", "Date", "Court", "Time", "Confirm")
    Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 8.dp), verticalAlignment = Alignment.Top) {
        labels.forEachIndexed { index, label ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(29.dp).background(if (index + 1 <= current) MaterialTheme.colorScheme.primary else Color.Transparent, CircleShape)
                        .border(1.dp, if (index + 1 <= current) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, CircleShape),
                    contentAlignment = Alignment.Center
                ) { Text((index + 1).toString(), color = if (index + 1 <= current) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp, fontWeight = FontWeight.Bold) }
                Text(label, color = if (index + 1 <= current) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 8.sp, modifier = Modifier.padding(top = 4.dp))
            }
            if (index < labels.lastIndex) Box(Modifier.weight(1f).padding(top = 14.dp).height(1.dp).background(MaterialTheme.colorScheme.outline))
        }
    }
}

@Composable
private fun LockedDateCourtStep(
    date: LocalDate,
    onDate: (LocalDate) -> Unit,
    availability: NativeAvailability?,
    selectedCourt: NativeCourtAvailability?,
    onCourt: (NativeCourtAvailability) -> Unit,
    loading: Boolean,
    error: String?,
    onContinue: () -> Unit
) {
    val dates = (0..6).map { LocalDate.now().plusDays(it.toLong()) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(12.dp))
            LockedOverline("Select date")
            Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                dates.take(4).forEach { day -> LockedDateChip(day, day == date, Modifier.weight(1f)) { onDate(day) } }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                dates.drop(4).forEach { day -> LockedDateChip(day, day == date, Modifier.weight(1f)) { onDate(day) } }
                Box(Modifier.weight(1f))
            }
            Spacer(Modifier.height(18.dp))
            LockedOverline("Select court")
            if (loading) CircularProgressIndicator(modifier = Modifier.padding(vertical = 20.dp))
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
        }
        availability?.courts?.let { courts ->
            if (courts.isEmpty()) item { LockedEmptyState("No bookable courts are configured for this date.") }
            else items(courts) { court -> LockedCourtChoice(court, selectedCourt?.courtId == court.courtId) { onCourt(court) } }
        }
        item {
            Spacer(Modifier.height(14.dp))
            LockedPrimaryButton("Continue", onContinue, enabled = selectedCourt != null)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LockedDateChip(day: LocalDate, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val formatter = DateTimeFormatter.ofPattern("EEE")
    Column(
        modifier = modifier.height(62.dp).clickable(onClick = onClick)
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
            .border(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(day.format(formatter).uppercase(), color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 9.sp)
        Text(day.dayOfMonth.toString(), color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Black, fontSize = 18.sp)
    }
}

@Composable
private fun LockedCourtChoice(court: NativeCourtAvailability, selected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp).clickable(onClick = onClick)
            .border(1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, RoundedCornerShape(15.dp)),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(66.dp).background(Brush.linearGradient(listOf(Color(0xFF184B74), Color(0xFF266FBA))), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.SportsTennis, null, tint = Color.White.copy(alpha = .75f))
            }
            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                Text(court.courtName, fontWeight = FontWeight.Black, fontSize = 13.sp)
                Text(listOf(court.courtCode, court.courtType).filter { it.isNotBlank() }.joinToString(" • "), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                Text("${court.slots.count { it.available }} slots available", color = MaterialTheme.colorScheme.primary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }
            if (selected) Box(Modifier.size(23.dp).background(MaterialTheme.colorScheme.primary, CircleShape), contentAlignment = Alignment.Center) { Text("✓", color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Black) }
        }
    }
}

@Composable
private fun LockedTimeStep(court: NativeCourtAvailability?, selectedTimes: List<String>, onTimes: (List<String>) -> Unit, onContinue: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(12.dp))
            LockedOverline("Select time")
            Text("Choose an available slot.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, modifier = Modifier.padding(bottom = 10.dp))
        }
        court?.slots?.let { slots ->
            items(slots) { slot ->
                val chosen = slot.startTime in selectedTimes
                val enabled = slot.available
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(enabled = enabled) {
                        onTimes(if (chosen) emptyList() else listOf(slot.startTime))
                    }.border(1.dp, if (chosen) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, RoundedCornerShape(13.dp)),
                    shape = RoundedCornerShape(13.dp),
                    colors = CardDefaults.cardColors(containerColor = if (enabled) MaterialTheme.colorScheme.surface else Color(0xFF2A1515))
                ) {
                    Row(Modifier.fillMaxWidth().height(58.dp).padding(horizontal = 13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text("${slot.startTime} – ${slot.endTime}", fontWeight = FontWeight.Black, fontSize = 12.sp)
                            Text(if (enabled) "PKR ${slot.hourlyRate}" else "BOOKED", color = if (enabled) MaterialTheme.colorScheme.primary else Color(0xFFFF5D5D), fontSize = 10.sp)
                        }
                        Text(if (chosen) "SELECTED" else if (enabled) "BOOK" else "UNAVAILABLE", color = if (enabled) MaterialTheme.colorScheme.onPrimary else Color(0xFFFF5D5D), modifier = if (enabled) Modifier.background(MaterialTheme.colorScheme.primary, RoundedCornerShape(8.dp)).padding(horizontal = 10.dp, vertical = 7.dp) else Modifier, fontSize = 9.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
        }
        item {
            Spacer(Modifier.height(14.dp))
            LockedPrimaryButton("Continue", onContinue, enabled = selectedTimes.isNotEmpty())
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LockedReviewStep(
    venue: LockedVenue,
    date: LocalDate,
    court: NativeCourtAvailability?,
    times: List<String>,
    quote: NativeQuote?,
    policy: NativePolicy?,
    loading: Boolean,
    error: String?,
    onRefreshQuote: () -> Unit,
    onPayment: () -> Unit
) {
    LaunchedEffect(Unit) { if (quote == null) onRefreshQuote() }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(12.dp))
            LockedOverline("Review")
            Text("Confirm your session", fontSize = 31.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(12.dp))
            Card(shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(16.dp)) {
                    LockedSummary("Venue", venue.name)
                    LockedSummary("Court", court?.courtName.orEmpty())
                    LockedSummary("Date", date.toString())
                    LockedSummary("Time", times.joinToString(", "))
                    if (quote != null) {
                        Spacer(Modifier.height(8.dp))
                        LockedSummary("Court fee", "${quote.currency} ${quote.courtFee}")
                        LockedSummary("Service fee", "${quote.currency} ${quote.serviceFee}")
                        LockedSummary("Total", "${quote.currency} ${quote.total}", strong = true)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Card(shape = RoundedCornerShape(15.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.padding(14.dp)) {
                    Text(policy?.title ?: "Booking policy", fontWeight = FontWeight.Black, fontSize = 12.sp)
                    Text(policy?.body?.take(420) ?: "Loading current booking policy…", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, lineHeight = 15.sp)
                }
            }
            if (loading) CircularProgressIndicator(modifier = Modifier.padding(vertical = 14.dp))
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(vertical = 8.dp)) }
            Spacer(Modifier.height(14.dp))
            LockedPrimaryButton("Continue to payment", onPayment, enabled = quote != null && policy != null && !loading)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LockedPaymentStep(
    venue: LockedVenue,
    date: LocalDate,
    court: NativeCourtAvailability,
    times: List<String>,
    quote: NativeQuote,
    loading: Boolean,
    error: String?,
    onPay: () -> Unit
) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 17.dp)) {
        item {
            Spacer(Modifier.height(12.dp))
            LockedOverline("Payment")
            Text("Almost there.", fontSize = 34.sp, fontWeight = FontWeight.Black)
            Text("Your final price will be refreshed before the court hold is created.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Spacer(Modifier.height(14.dp))
            Card(shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(Modifier.padding(16.dp)) {
                    LockedSummary("Venue", venue.name)
                    LockedSummary("Court", court.courtName)
                    LockedSummary("Date", date.toString())
                    LockedSummary("Time", times.joinToString(", "))
                    LockedSummary("Total", "${quote.currency} ${quote.total}", strong = true)
                }
            }
            Spacer(Modifier.height(12.dp))
            Card(shape = RoundedCornerShape(15.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.padding(14.dp)) {
                    Text("PAYZEN / 1BILL", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black, fontSize = 11.sp)
                    Text("Production payment credentials are not enabled in staging. This screen preserves the final booking boundary without simulating a successful payment.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, lineHeight = 15.sp)
                }
            }
            if (loading) CircularProgressIndicator(modifier = Modifier.padding(vertical = 14.dp))
            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, modifier = Modifier.padding(vertical = 8.dp)) }
            Spacer(Modifier.height(14.dp))
            LockedPrimaryButton("Create secure court hold", onPay, enabled = !loading)
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun LockedSummary(label: String, value: String, strong: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        Text(value, fontWeight = if (strong) FontWeight.Black else FontWeight.SemiBold, fontSize = if (strong) 14.sp else 11.sp)
    }
}