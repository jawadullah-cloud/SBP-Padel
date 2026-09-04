package pk.gov.punjab.sbp.padel

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.time.LocalDate

@Composable
fun NativeBookingFlow(
    token: String,
    venueId: String,
    venueName: String,
    onClose: () -> Unit,
    onBooked: (NativeBookingCreated) -> Unit
) {
    var date by remember { mutableStateOf(LocalDate.now().plusDays(1)) }
    var availability by remember { mutableStateOf<NativeAvailability?>(null) }
    var selectedCourt by remember { mutableStateOf<NativeCourtAvailability?>(null) }
    var selectedTimes by remember { mutableStateOf<List<String>>(emptyList()) }
    var policy by remember { mutableStateOf<NativePolicy?>(null) }
    var quote by remember { mutableStateOf<NativeQuote?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun refresh() {
        loading = true
        error = null
        selectedCourt = null
        selectedTimes = emptyList()
        quote = null
        scope.launch {
            try {
                availability = NativeBookingApi.availability(venueId, date.toString())
                if (policy == null) policy = NativeBookingApi.activePolicy()
            } catch (e: Exception) {
                error = e.message
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(date, venueId) { refresh() }

    LazyColumn(modifier = Modifier.padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(18.dp))
            Text("BOOK A COURT", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            Text(venueName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                OutlinedButton(onClick = { date = date.minusDays(1).coerceAtLeast(LocalDate.now()) }) { Text("PREVIOUS") }
                Column { Text(date.toString(), fontWeight = FontWeight.Black); Text(date.dayOfWeek.name, style = MaterialTheme.typography.labelSmall) }
                OutlinedButton(onClick = { date = date.plusDays(1) }) { Text("NEXT") }
            }
            Spacer(Modifier.height(12.dp))
            if (loading) CircularProgressIndicator()
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }

        availability?.courts?.let { courts ->
            item { Text("COURT", modifier = Modifier.padding(vertical = 10.dp), fontWeight = FontWeight.Black) }
            items(courts) { court ->
                val active = selectedCourt?.courtId == court.courtId
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                        selectedCourt = court
                        selectedTimes = emptyList()
                        quote = null
                    },
                    colors = CardDefaults.cardColors(containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Text(court.courtName, fontWeight = FontWeight.Black)
                        Text(listOf(court.courtCode, court.courtType).filter { it.isNotBlank() }.joinToString(" • "), style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }

        selectedCourt?.let { court ->
            item { Text("AVAILABLE TIME", modifier = Modifier.padding(vertical = 10.dp), fontWeight = FontWeight.Black) }
            items(court.slots.filter { it.available }) { slot ->
                val active = slot.startTime in selectedTimes
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                        selectedTimes = if (active) selectedTimes - slot.startTime else listOf(slot.startTime)
                        quote = null
                    },
                    colors = CardDefaults.cardColors(containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${slot.startTime} – ${slot.endTime}", fontWeight = FontWeight.Bold)
                        Text("PKR ${slot.hourlyRate}")
                    }
                }
            }
        }

        if (selectedCourt != null && selectedTimes.isNotEmpty()) {
            item {
                Spacer(Modifier.height(14.dp))
                if (quote == null) {
                    Button(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            loading = true
                            scope.launch {
                                try { quote = NativeBookingApi.quote(venueId, selectedCourt!!.courtId, date.toString(), selectedTimes) }
                                catch (e: Exception) { error = e.message }
                                finally { loading = false }
                            }
                        }
                    ) { Text("REVIEW BOOKING", fontWeight = FontWeight.Black) }
                }
            }
        }

        quote?.let { currentQuote ->
            item {
                Card(Modifier.fillMaxWidth().padding(vertical = 12.dp), shape = RoundedCornerShape(18.dp)) {
                    Column(Modifier.padding(18.dp)) {
                        Text("BOOKING SUMMARY", fontWeight = FontWeight.Black)
                        SummaryRow("Court", selectedCourt?.courtName.orEmpty())
                        SummaryRow("Date", date.toString())
                        SummaryRow("Time", selectedTimes.joinToString(", "))
                        SummaryRow("Court fee", "PKR ${currentQuote.courtFee}")
                        SummaryRow("Service fee", "PKR ${currentQuote.serviceFee}")
                        SummaryRow("TOTAL", "PKR ${currentQuote.total}")
                        Spacer(Modifier.height(10.dp))
                        Text("By confirming, you accept ${policy?.title ?: "the current SBP booking policy"}.", style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(12.dp))
                        Button(
                            modifier = Modifier.fillMaxWidth(),
                            enabled = policy != null && !loading,
                            onClick = {
                                loading = true
                                scope.launch {
                                    try {
                                        val booking = NativeBookingApi.createBooking(token, venueId, selectedCourt!!.courtId, date.toString(), selectedTimes, policy!!.id)
                                        onBooked(booking)
                                    } catch (e: Exception) { error = e.message }
                                    finally { loading = false }
                                }
                            }
                        ) { Text("CONFIRM & HOLD COURT", fontWeight = FontWeight.Black) }
                    }
                }
                OutlinedButton(onClick = onClose, modifier = Modifier.fillMaxWidth()) { Text("CLOSE") }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.Bold)
    }
}