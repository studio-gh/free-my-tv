package io.freemytv;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;

final class PhotoSync {
    private PhotoSync() {}

    static JSONObject request(String path, String method, String token, JSONObject body) throws Exception {
        URL url = new URL(Config.PHOTOS_API_URL + path);
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(12000);
        c.setReadTimeout(25000);
        c.setUseCaches(false);
        if (token != null && !token.isEmpty()) c.setRequestProperty("X-TV-Token", token);
        if (body != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            try (OutputStream out = c.getOutputStream()) { out.write(body.toString().getBytes("UTF-8")); }
        }
        int status = c.getResponseCode();
        InputStream in = status >= 200 && status < 300 ? c.getInputStream() : c.getErrorStream();
        byte[] bytes;
        try (InputStream stream = in; java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            byte[] buf = new byte[8192]; int n;
            while ((n = stream.read(buf)) > 0) out.write(buf, 0, n);
            bytes = out.toByteArray();
        } finally { c.disconnect(); }
        JSONObject result = new JSONObject(new String(bytes, "UTF-8"));
        if (status < 200 || status >= 300) throw new Exception(result.optString("error", "HTTP " + status));
        return result;
    }

    static JSONObject startPairing() throws Exception {
        return request("/api/tv-photos/pair/start", "POST", null, new JSONObject());
    }

    static void saveToken(Context context, String token) {
        context.getSharedPreferences("tv_photo_sync", Context.MODE_PRIVATE).edit().putString("token", token).apply();
    }

    static String token(Context context) {
        return context.getSharedPreferences("tv_photo_sync", Context.MODE_PRIVATE).getString("token", "");
    }

    static int sync(Context context) throws Exception {
        String token = token(context);
        if (token.isEmpty()) throw new Exception("Conecte esta TV pelo código de pareamento.");
        JSONObject manifest = request("/api/tv-photos/manifest", "GET", token, null);
        JSONArray photos = manifest.optJSONArray("photos");
        if (photos == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences("tv_photo_sync", Context.MODE_PRIVATE);
        Set<String> downloaded = new HashSet<>(prefs.getStringSet("downloaded", new HashSet<>()));
        File inbox = Photos.privateInbox(context);
        if (!inbox.exists() && !inbox.mkdirs()) throw new Exception("Não foi possível preparar a pasta de fotos.");
        int count = 0;
        for (int i = 0; i < photos.length(); i++) {
            JSONObject photo = photos.getJSONObject(i);
            String id = photo.optString("id", "");
            String collection = photo.optString("collection", "");
            if (id.isEmpty() || downloaded.contains(id)) continue;
            String path = photo.optString("url", "");
            if (!path.startsWith("/api/tv-photos/photo/")) continue;
            HttpURLConnection c = (HttpURLConnection) new URL(Config.PHOTOS_API_URL + path).openConnection();
            c.setConnectTimeout(12000);
            c.setReadTimeout(30000);
            c.setRequestProperty("X-TV-Token", token);
            int status = c.getResponseCode();
            if (status < 200 || status >= 300) { c.disconnect(); throw new Exception("Falha ao baixar uma foto (HTTP " + status + ")."); }
            String ext = photo.optString("name", "").toLowerCase().endsWith(".png") ? ".png" : ".jpg";
            File target = new File(inbox, collection + "__" + id + ext);
            try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(target)) {
                byte[] buf = new byte[16384]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            } finally { c.disconnect(); }
            downloaded.add(id);
            count++;
        }
        prefs.edit().putStringSet("downloaded", downloaded).apply();
        if (count > 0) Photos.importInbox(context, null);
        return count;
    }
}
