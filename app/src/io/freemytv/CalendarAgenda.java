package io.freemytv;

import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/** Read-only public feed for the shared Guiga e Rê calendar. The endpoint never exposes event notes. */
final class CalendarAgenda {
    private static final String FEED = "https://painel-casa.pages.dev/api/tv/agenda";
    private CalendarAgenda() {}

    static List<String> fetch() {
        List<String> lines = new ArrayList<>();
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(FEED).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setUseCaches(true);
            connection.setRequestProperty("Accept", "application/json");
            int status = connection.getResponseCode();
            if (status != HttpURLConnection.HTTP_OK) return lines;
            try (InputStream in = connection.getInputStream();
                 BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                StringBuilder body = new StringBuilder();
                String part;
                while ((part = reader.readLine()) != null) body.append(part);
                JSONObject root = new JSONObject(body.toString());
                JSONArray events = root.optJSONArray("events");
                if (events == null || events.length() == 0) {
                    lines.add("No upcoming events");
                    return lines;
                }
                SimpleDateFormat dayFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                String today = dayFormat.format(new Date());
                for (int i = 0; i < events.length() && lines.size() < 6; i++) {
                    JSONObject event = events.optJSONObject(i);
                    if (event == null) continue;
                    String title = event.optString("summary", "Compromisso");
                    String start = event.optString("start", "");
                    boolean allDay = event.optBoolean("allDay", false);
                    String when = "";
                    if (start.length() >= 10) {
                        String day = start.substring(0, 10);
                        if (day.equals(today)) when = "Today";
                        else {
                            try {
                                Date date = dayFormat.parse(day);
                                when = new SimpleDateFormat("EEE, dd/MM", new Locale("pt", "BR")).format(date);
                            } catch (Exception ignored) {
                                when = day;
                            }
                        }
                        if (!allDay && start.length() >= 16) when += " · " + start.substring(11, 16);
                        else when += " · dia todo";
                    }
                    lines.add(when + "   " + title);
                }
            }
        } catch (Exception ignored) {
            // Keep the launcher usable when Wi-Fi or the calendar service is unavailable.
        } finally {
            if (connection != null) connection.disconnect();
        }
        return lines;
    }
}
