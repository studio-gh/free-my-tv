package io.freemytv;

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
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/** Read-only title-and-time feed for the explicitly shared Guiga e Rê calendar. */
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
            connection.setUseCaches(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-cache");
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
                    lines.add("Nenhum compromisso próximo");
                    return lines;
                }

                SimpleDateFormat dateKey = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                dateKey.setTimeZone(TimeZone.getDefault());
                String today = dateKey.format(new Date());
                Calendar tomorrowCal = Calendar.getInstance();
                tomorrowCal.add(Calendar.DAY_OF_YEAR, 1);
                String tomorrow = dateKey.format(tomorrowCal.getTime());

                for (int i = 0; i < events.length() && lines.size() < 6; i++) {
                    JSONObject event = events.optJSONObject(i);
                    if (event == null) continue;
                    String title = event.optString("summary", "Compromisso").trim();
                    String start = event.optString("start", "");
                    boolean allDay = event.optBoolean("allDay", false);
                    String when = "Em breve";

                    if (start.length() >= 10) {
                        String day = start.substring(0, 10);
                        if (day.equals(today)) {
                            when = "Hoje";
                        } else if (day.equals(tomorrow)) {
                            when = "Amanhã";
                        } else {
                            try {
                                Date parsed = dateKey.parse(day);
                                when = new SimpleDateFormat("EEE, dd/MM", new Locale("pt", "BR")).format(parsed);
                            } catch (Exception ignored) {
                                when = day;
                            }
                        }
                        if (!allDay && start.length() >= 16) {
                            when += " · " + start.substring(11, 16);
                        } else if (allDay) {
                            when += " · dia todo";
                        }
                    }
                    if (!title.isEmpty()) lines.add(when + "   " + title);
                }
            }
        } catch (Exception ignored) {
            // Keep the launcher usable when the network or agenda service is unavailable.
        } finally {
            if (connection != null) connection.disconnect();
        }
        return lines;
    }
}