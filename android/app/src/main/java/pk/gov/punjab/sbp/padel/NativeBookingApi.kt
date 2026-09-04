package pk.gov.punjab.sbp.padel

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object NativeBookingApi {
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
            val detail = runCatching { JSONObject(text).optString("detail") }.getOrNull()
            throw IllegalStateException(detail?.takeIf { it.isNotBlank() } ?: "Request failed ($status).")
        }
        text
    }

    suspend fun availability(venueId: String, date: String): NativeAvailability {
        val encodedDate = URLEncoder.encode(date, StandardCharsets.UTF_8.toString())
        return parseNativeAvailability(JSONObject(request("GET", "/venues/$venueId/availability?date=$encodedDate")))
    }

    suspend fun activePolicy(): NativePolicy {
        val obj = JSONObject(request("GET", "/policies/active"))
        return NativePolicy(
            id = obj.getString("id"),
            version = obj.optString("version"),
            title = obj.optString("title", "Booking policy"),
            body = obj.optString("body")
        )
    }

    suspend fun quote(venueId: String, courtId: String, date: String, startTimes: List<String>): NativeQuote {
        val payload = bookingPayload(venueId, courtId, date, startTimes)
        val obj = JSONObject(request("POST", "/bookings/quote", body = payload))
        return NativeQuote(
            courtFee = obj.optString("court_fee"),
            serviceFee = obj.optString("service_fee"),
            total = obj.optString("total"),
            currency = obj.optString("currency", "PKR")
        )
    }

    suspend fun createBooking(
        token: String,
        venueId: String,
        courtId: String,
        date: String,
        startTimes: List<String>,
        policyId: String
    ): NativeBookingCreated {
        val payload = bookingPayload(venueId, courtId, date, startTimes)
            .put("policy_version_id", policyId)
            .put("policy_accepted", true)
        val obj = JSONObject(request("POST", "/bookings", token, payload))
        return NativeBookingCreated(
            id = obj.getString("id"),
            bookingCode = obj.optString("booking_code"),
            status = obj.optString("status"),
            amountDue = obj.optString("amount_due"),
            currency = obj.optString("currency", "PKR"),
            holdMinutes = obj.optInt("hold_minutes")
        )
    }

    suspend fun bookingDetail(token: String, bookingId: String): NativeBookingDetail =
        parseNativeBookingDetail(JSONObject(request("GET", "/bookings/$bookingId", token)))

    suspend fun cancel(token: String, bookingId: String, reason: String = "Cancelled in Android app") {
        request("POST", "/bookings/$bookingId/cancel", token, JSONObject().put("reason", reason))
    }

    suspend fun reschedule(
        token: String,
        bookingId: String,
        date: String,
        courtId: String,
        startTimes: List<String>
    ): NativeBookingDetail {
        val slots = org.json.JSONArray()
        startTimes.forEach { slots.put(JSONObject().put("start_time", it)) }
        val payload = JSONObject()
            .put("booking_date", date)
            .put("court_id", courtId)
            .put("slots", slots)
        return parseNativeBookingDetail(JSONObject(request("POST", "/bookings/$bookingId/reschedule", token, payload)))
    }

    private fun bookingPayload(venueId: String, courtId: String, date: String, startTimes: List<String>): JSONObject {
        val slots = org.json.JSONArray()
        startTimes.forEach { slots.put(JSONObject().put("start_time", it)) }
        return JSONObject()
            .put("venue_id", venueId)
            .put("court_id", courtId)
            .put("booking_date", date)
            .put("slots", slots)
    }
}