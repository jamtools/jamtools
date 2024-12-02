Springboard's mobile app deployment uses [React Native](https://reactnative.dev) as the application shell, and runs the frontend Springboard app in a webview.

In the offline mode, the webview communicates to the React Native process for file and data management. In the online mode, the webview loads the UI from the server so the frontend code is guaranteed to be in line with the server code version, and communicates to a remote server directly.
