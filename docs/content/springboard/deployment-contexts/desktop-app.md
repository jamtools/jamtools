Springboard's desktop app deployment uses [Tauri](https://v2.tauri.app) as the application shell, and packages the app with:

- A Hono server sidecar to host the application
- A separate Maestro node script to make it so IO operations (like MIDI events) can happen with minimal latency
