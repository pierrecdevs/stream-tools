/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_OBS_WEBSOCKET_HOST: string;
  readonly VITE_OBS_WEBSOCKET_PORT: number;
  readonly VITE_OBS_WEBSOCKET_PASSWORD: string;
  readonly VITE_TWITCH_SCERET: string;
  readonly VITE_TWITCH_USERNAME: string;
  readonly VITE_TWITCH_CLIENT_ID: string;
  readonly VITE_TWITCH_OAUTH_TOKEN: string;
  readonly VITE_TWITCH_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
