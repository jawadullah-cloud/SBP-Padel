package pk.gov.punjab.sbp.padel

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

internal data class LockedSession(
    val token: String,
    val fullName: String,
    val email: String?,
    val phone: String?
)

internal data class LockedCourt(
    val id: String,
    val code: String,
    val name: String,
    val type: String,
    val status: String
)

internal data class LockedVenue(
    val id: String,
    val name: String,
    val city: String,
    val address: String,
    val description: String,
    val amenities: List<String>,
    val coverImage: String?,
    val courts: List<LockedCourt> = emptyList()
)

internal data class LockedBooking(
    val id: String,
    val code: String,
    val date: String,
    val status: String,
    val venueId: String,
    val courtId: String,
    val total: String,
    val currency: String
)

internal object LockedApi {
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')

    private suspend fun request(
        method: String,
        path: String,
        token: String? = null,
        body: JSONObject? = null
    ): String = withContext(Dispatchers.IO) {
        require(base.startsWith("https://")) { "Secure SBP Padel API endpoint is not configured." }
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
                ?.takeIf { it.isNotBlank() }
            throw IllegalStateException(detail ?: "Request failed ($status).")
        }
        text
    }

    suspend fun login(identifier: String, password: String): LockedSession {
        val payload = JSONObject().put("identifier", identifier.trim()).put("password", password)
        return parseAuth(JSONObject(request("POST", "/auth/login", body = payload)))
    }

    suspend fun register(fullName: String, email: String, password: String): LockedSession {
        val payload = JSONObject()
            .put("full_name", fullName.trim())
            .put("email", email.trim().lowercase())
            .put("password", password)
        return parseAuth(JSONObject(request("POST", "/auth/register", body = payload)))
    }

    suspend fun me(token: String): LockedSession {
        val obj = JSONObject(request("GET", "/auth/me", token))
        return LockedSession(
            token = token,
            fullName = obj.optString("full_name").ifBlank { "Player" },
            email = obj.optString("email").takeIf { it.isNotBlank() && it != "null" },
            phone = obj.optString("phone").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    suspend fun venues(): List<LockedVenue> {
        val array = JSONArray(request("GET", "/venues"))
        return (0 until array.length()).map { parseVenue(array.getJSONObject(it), includeCourts = false) }
    }

    suspend fun venue(id: String): LockedVenue =
        parseVenue(JSONObject(request("GET", "/venues/$id")), includeCourts = true)

    suspend fun bookings(token: String): List<LockedBooking> {
        val array = JSONArray(request("GET", "/bookings/me", token))
        return (0 until array.length()).map { index ->
            val obj = array.getJSONObject(index)
            LockedBooking(
                id = obj.optString("id"),
                code = obj.optString("booking_code").ifBlank { "Booking" },
                date = obj.optString("date"),
                status = obj.optString("status"),
                venueId = obj.optString("venue_id"),
                courtId = obj.optString("court_id"),
                total = obj.optString("total"),
                currency = obj.optString("currency", "PKR")
            )
        }
    }

    private fun parseAuth(obj: JSONObject): LockedSession {
        val user = obj.optJSONObject("user") ?: JSONObject()
        return LockedSession(
            token = obj.getString("access_token"),
            fullName = user.optString("full_name").ifBlank { "Player" },
            email = user.optString("email").takeIf { it.isNotBlank() && it != "null" },
            phone = user.optString("phone").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    private fun parseVenue(obj: JSONObject, includeCourts: Boolean): LockedVenue {
        val amenitiesJson = obj.optJSONArray("amenities") ?: JSONArray()
        val amenities = (0 until amenitiesJson.length()).mapNotNull { i ->
            amenitiesJson.optString(i).takeIf { it.isNotBlank() }
        }
        val courtsJson = if (includeCourts) obj.optJSONArray("courts") ?: JSONArray() else JSONArray()
        val courts = (0 until courtsJson.length()).map { i ->
            val court = courtsJson.getJSONObject(i)
            LockedCourt(
                id = court.optString("id"),
                code = court.optString("code"),
                name = court.optString("name").ifBlank { "Court" },
                type = court.optString("court_type"),
                status = court.optString("status")
            )
        }
        return LockedVenue(
            id = obj.optString("id"),
            name = obj.optString("name").ifBlank { "SBP Padel Venue" },
            city = obj.optString("city"),
            address = obj.optString("address"),
            description = obj.optString("description"),
            amenities = amenities,
            coverImage = obj.optString("cover_image_data_url").takeIf { it.isNotBlank() && it != "null" },
            courts = courts
        )
    }
}