# Test Rota on iPhone (Expo Go)

Apple Simulator needs a Mac. On Windows, use **Expo Go** on a real iPhone.

## 1. On the Windows laptop (same Wi‑Fi as the phone)

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
cd $HOME
git clone https://github.com/Anwarito-lbd/rota.git
cd rota
npm.cmd install
npm.cmd run seed
```

Terminal A — API (reachable on LAN):

```powershell
cd $HOME\rota
$env:EXPO_PUBLIC_API_URL = "http://192.168.2.93:8787"
npm.cmd run api
```

Terminal B — Expo (tunnel is most reliable):

```powershell
cd $HOME\rota\apps\mobile
$env:EXPO_PUBLIC_API_URL = "http://192.168.2.93:8787"
npx.cmd expo start --tunnel
```

Allow Node through Windows Firewall if prompted (ports **8787** and Metro).

## 2. On the iPhone

1. Install **Expo Go** from the App Store
2. Join the **same Wi‑Fi** as the laptop
3. Open Expo Go → scan the QR from Terminal B
4. Login: `demo@rota.app` / `rota1234`

If the QR fails, use Expo Go → “Enter URL” with the `exp://` link printed in the terminal.

## Notes

- If your laptop LAN IP changes, update `EXPO_PUBLIC_API_URL`
- `--tunnel` needs an Expo account the first time (`npx expo login`)
- Native video plays in Expo Go; web was only a fallback
