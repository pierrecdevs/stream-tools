/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_OBS_WEBSOCKET_HOST: string
  readonly VITE_OBS_WEBSOCKET_PORT: number
  readonly VITE_OBS_WEBSOCKET_PASSWORD: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
