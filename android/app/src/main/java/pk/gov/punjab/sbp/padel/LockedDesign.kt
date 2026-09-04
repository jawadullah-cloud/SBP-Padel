package pk.gov.punjab.sbp.padel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal val LockedLime = Color(0xFF91EE1B)
internal val LockedDarkBg = Color(0xFF061012)
internal val LockedDarkSurface = Color(0xFF0C1919)
internal val LockedDarkSurface2 = Color(0xFF112321)
internal val LockedDarkLine = Color(0xFF1F3733)
internal val LockedDarkMuted = Color(0xFF8D9D97)
internal val LockedLightBg = Color(0xFFF3F7F3)
internal val LockedLightSurface = Color.White
internal val LockedLightSurface2 = Color(0xFFEAF1EB)
internal val LockedLightLine = Color(0xFFD6E1D8)
internal val LockedLightMuted = Color(0xFF647168)

internal val LockedDarkColors = darkColorScheme(
    primary = LockedLime,
    onPrimary = Color(0xFF071006),
    background = LockedDarkBg,
    onBackground = Color(0xFFF5F8F4),
    surface = LockedDarkSurface,
    onSurface = Color(0xFFF5F8F4),
    surfaceVariant = LockedDarkSurface2,
    onSurfaceVariant = LockedDarkMuted,
    outline = LockedDarkLine
)

internal val LockedLightColors = lightColorScheme(
    primary = Color(0xFF397D16),
    onPrimary = Color.White,
    background = LockedLightBg,
    onBackground = Color(0xFF101712),
    surface = LockedLightSurface,
    onSurface = Color(0xFF101712),
    surfaceVariant = LockedLightSurface2,
    onSurfaceVariant = LockedLightMuted,
    outline = LockedLightLine
)

@Composable
internal fun LockedOverline(text: String) {
    Text(
        text = text.uppercase(),
        color = MaterialTheme.colorScheme.primary,
        fontSize = 10.sp,
        fontWeight = FontWeight.ExtraBold,
        letterSpacing = 1.6.sp
    )
}

@Composable
internal fun LockedBrandHeader(onThemeToggle: () -> Unit, darkTheme: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(28.dp).border(1.dp, MaterialTheme.colorScheme.primary, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("S", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
            Text("SBP PADEL", modifier = Modifier.padding(start = 8.dp), fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.sp)
        }
        Button(
            onClick = onThemeToggle,
            modifier = Modifier.size(38.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = CircleShape
        ) {
            Text(if (darkTheme) "☀" else "☾", fontSize = 15.sp)
        }
    }
}

@Composable
internal fun LockedPrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier.fillMaxWidth(), enabled: Boolean = true) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary
        )
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(label.uppercase(), fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = .6.sp)
            Text("→", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
internal fun LockedHero(onBook: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().height(318.dp).padding(horizontal = 12.dp)
            .background(
                brush = Brush.linearGradient(listOf(Color(0xFF07120F), Color(0xFF0A2520), Color(0xFF184D35))),
                shape = RoundedCornerShape(28.dp)
            )
    ) {
        Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
            Text("SPORTS BOARD PUNJAB", color = Color(0xFFC7FFAC), fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.6.sp)
            Spacer(Modifier.height(8.dp))
            Text("PLAY.", color = Color.White, fontSize = 48.sp, lineHeight = 44.sp, fontWeight = FontWeight.Black, letterSpacing = (-2).sp)
            Text("PADEL.", color = LockedLime, fontSize = 48.sp, lineHeight = 44.sp, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic, letterSpacing = (-2).sp)
            Spacer(Modifier.height(10.dp))
            Text("Book your court. Fast, easy and seamless.", color = Color(0xFFD8E4DD), fontSize = 13.sp)
            Spacer(Modifier.height(20.dp))
            LockedPrimaryButton("Book a court", onBook, Modifier.fillMaxWidth(.68f))
        }
        Row(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(22.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("LIVE COURTS", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Text("PUNJAB", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
internal fun LockedSectionTitle(kicker: String, title: String, action: String? = null) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
        Column {
            LockedOverline(kicker)
            Text(title, fontSize = 23.sp, fontWeight = FontWeight.Black)
        }
        if (!action.isNullOrBlank()) Text(action, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
internal fun LockedEmptyState(message: String) {
    Box(
        modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp)).padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, fontSize = 13.sp)
    }
}