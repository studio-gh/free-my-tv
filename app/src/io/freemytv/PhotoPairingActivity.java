package io.freemytv;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PhotoPairingActivity extends Activity {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextView codeView, statusView;
    private Button pairButton, syncButton;
    private volatile boolean closed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setBackgroundColor(Color.rgb(44,44,44));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(56,36,56,36);
        root.setBackgroundColor(Color.rgb(44,44,44));
        TextView title = text("Biblioteca de fotos", 30, true, 0xFFFFFCF4);
        root.addView(title);
        TextView intro = text("No celular, abra o Painel Casa > Fotos da TV e autorize a conexão usando o código abaixo.", 18, false, 0xFFFFFCF4);
        intro.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(-1,-2); ip.setMargins(0,20,0,24); root.addView(intro,ip);
        codeView = text("------", 54, true, 0xFFFF961A);
        codeView.setGravity(Gravity.CENTER);
        root.addView(codeView);
        statusView = text("Preparando conexão…", 17, false, 0xFFFFFCF4);
        statusView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1,-2); sp.setMargins(0,18,0,24); root.addView(statusView,sp);
        pairButton = new Button(this); pairButton.setText("Gerar novo código"); pairButton.setOnClickListener(v -> beginPairing()); root.addView(pairButton);
        syncButton = new Button(this); syncButton.setText("Sincronizar fotos agora"); syncButton.setOnClickListener(v -> syncNow()); root.addView(syncButton);
        Button close = new Button(this); close.setText("Voltar"); close.setOnClickListener(v -> finish()); root.addView(close);
        setContentView(root);
        if (!PhotoSync.token(this).isEmpty()) {
            codeView.setText("✓");
            statusView.setText("Esta TV já está conectada à biblioteca.");
            syncNow();
        } else {
            beginPairing();
        }
    }

    private TextView text(String value, int size, boolean bold, int color) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private void beginPairing() {
        pairButton.setEnabled(false);
        statusView.setText("Gerando código seguro…");
        worker.execute(() -> {
            try {
                JSONObject result = PhotoSync.startPairing();
                String id = result.getString("id");
                String code = result.getString("code");
                main.post(() -> { if (!closed) { codeView.setText(code); statusView.setText("Aguardando autorização no Painel Casa. O código expira em 10 minutos."); pairButton.setEnabled(true); } });
                long end = System.currentTimeMillis() + 10 * 60 * 1000L;
                while (!closed && System.currentTimeMillis() < end) {
                    Thread.sleep(2500);
                    JSONObject state = PhotoSync.request("/api/tv-photos/pair/status?id=" + id, "GET", null, null);
                    if ("approved".equals(state.optString("status"))) {
                        String token = state.optString("token", "");
                        if (token.length() == 64) {
                            PhotoSync.saveToken(this, token);
                            main.post(() -> { if (!closed) statusView.setText("TV autorizada! Iniciando sincronização…"); });
                            syncNow();
                            return;
                        }
                    }
                    if ("expired".equals(state.optString("status"))) break;
                }
                main.post(() -> { if (!closed) { statusView.setText("Código expirado. Gere um novo código."); pairButton.setEnabled(true); } });
            } catch (Exception e) {
                main.post(() -> { if (!closed) { statusView.setText("Não foi possível conectar: " + e.getMessage()); pairButton.setEnabled(true); } });
            }
        });
    }

    private void syncNow() {
        syncButton.setEnabled(false);
        statusView.setText("Sincronizando fotos…");
        worker.execute(() -> {
            try {
                int count = PhotoSync.sync(this);
                main.post(() -> { if (!closed) { statusView.setText(count == 0 ? "Biblioteca atualizada. Nenhuma foto nova." : count + " foto(s) baixada(s). O TV Studio está preparando as imagens."); syncButton.setEnabled(true); } });
            } catch (Exception e) {
                main.post(() -> { if (!closed) { statusView.setText("Sincronização não concluída: " + e.getMessage()); syncButton.setEnabled(true); } });
            }
        });
    }

    @Override protected void onDestroy() {
        closed = true;
        worker.shutdownNow();
        super.onDestroy();
    }
}
