package pk.gov.punjab.sbp.padel

import org.json.JSONArray
import org.json.JSONObject

data class NativeAvailabilitySlot(
    val startTime: String,
    val endTime: String,
    val available: Boolean,
    val hourlyRate: String,
    val currency: String
)

data class NativeCourtAvailability(
    val courtId: String,
    val courtCode: String,
    val courtName: String,
    val courtType: String,
    val slots: List<NativeAvailabilitySlot>
)

data class NativeAvailability(
    val venueId: String,
    val venueName: String,
    val date: String,
    val timezone: String,
    val courts: List<NativeCourtAvailability>
)

data class NativePolicy(
    val id: String,
    val version: String,
    val title: String,
    val body: String
)

data class NativeQuote(
    val courtFee: String,
    val serviceFee: String,
    val total: String,
    val currency: String
)

data class NativeBookingCreated(
    val id: String,
    val bookingCode: String,
    val status: String,
    val amountDue: String,
    val currency: String,
    val holdMinutes: Int
)

data class NativeBookingDetail(
    val id: String,
    val bookingCode: String,
    val date: String,
    val status: String,
    val venueId: String,
    val courtId: String,
    val total: String,
    val currency: String,
    val slots: List<NativeAvailabilitySlot>
)

internal fun parseNativeAvailability(obj: JSONObject): NativeAvailability {
    val courtsJson = obj.optJSONArray("courts") ?: JSONArray()
    val courts = (0 until courtsJson.length()).map { index ->
        val court = courtsJson.getJSONObject(index)
        val slotsJson = court.optJSONArray("slots") ?: JSONArray()
        val slots = (0 until slotsJson.length()).map { slotIndex ->
            val slot = slotsJson.getJSONObject(slotIndex)
            NativeAvailabilitySlot(
                startTime = slot.optString("start_time"),
                endTime = slot.optString("end_time"),
                available = slot.optBoolean("available"),
                hourlyRate = slot.optString("hourly_rate"),
                currency = slot.optString("currency", "PKR")
            )
        }
        NativeCourtAvailability(
            courtId = court.optString("court_id"),
            courtCode = court.optString("court_code"),
            courtName = court.optString("court_name"),
            courtType = court.optString("court_type"),
            slots = slots
        )
    }
    return NativeAvailability(
        venueId = obj.optString("venue_id"),
        venueName = obj.optString("venue_name"),
        date = obj.optString("date"),
        timezone = obj.optString("timezone"),
        courts = courts
    )
}

internal fun parseNativeBookingDetail(obj: JSONObject): NativeBookingDetail {
    val slotsJson = obj.optJSONArray("slots") ?: JSONArray()
    val slots = (0 until slotsJson.length()).map { index ->
        val slot = slotsJson.getJSONObject(index)
        NativeAvailabilitySlot(
            startTime = slot.optString("start_time"),
            endTime = slot.optString("end_time"),
            available = false,
            hourlyRate = slot.optString("rate"),
            currency = obj.optString("currency", "PKR")
        )
    }
    return NativeBookingDetail(
        id = obj.optString("id"),
        bookingCode = obj.optString("booking_code"),
        date = obj.optString("date"),
        status = obj.optString("status"),
        venueId = obj.optString("venue_id"),
        courtId = obj.optString("court_id"),
        total = obj.optString("total"),
        currency = obj.optString("currency", "PKR"),
        slots = slots
    )
}