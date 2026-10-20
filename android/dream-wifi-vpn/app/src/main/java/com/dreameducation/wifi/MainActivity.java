package com.dreameducation.wifi;
import android.app.Activity;
import android.content.Intent;
import android.net.VpnService;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
  private TextView status;
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    LinearLayout box = new LinearLayout(this); box.setOrientation(1); box.setGravity(Gravity.CENTER_HORIZONTAL); box.setPadding(28,40,28,28);
    TextView title = new TextView(this); title.setText("Dream Wi-Fi"); title.setTextSize(28); box.addView(title);
    TextView note = new TextView(this); note.setText("The Dream Tunnel owner SOCKS5 proxy must already be running in Termux on 127.0.0.1:1080. This prototype routes compatible web traffic; arbitrary UDP and non-web TCP destinations are not yet supported by the relay."); note.setTextSize(16); note.setPadding(0,24,0,24); box.addView(note);
    status = new TextView(this); status.setText("Disconnected. Start and verify the owner proxy first."); box.addView(status);
    Button on = new Button(this); on.setText("Connect Dream VPN"); on.setOnClickListener(v->{ Intent p=VpnService.prepare(this); if(p!=null) startActivityForResult(p,1001); else startVpn(); }); box.addView(on);
    Button off = new Button(this); off.setText("Disconnect"); off.setOnClickListener(v->{ Intent i=new Intent(this,DreamVpnService.class); i.setAction(DreamVpnService.ACTION_STOP); startService(i); status.setText("Disconnect requested."); }); box.addView(off);
    setContentView(box);
  }
  @Override protected void onActivityResult(int r,int c,Intent d){ super.onActivityResult(r,c,d); if(r==1001&&c==RESULT_OK) startVpn(); else if(r==1001) status.setText("VPN permission was not granted."); }
  private void startVpn(){ Intent i=new Intent(this,DreamVpnService.class); i.setAction(DreamVpnService.ACTION_START); if(android.os.Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i); status.setText("Starting VPN; verify the local relay remains connected."); }
}
