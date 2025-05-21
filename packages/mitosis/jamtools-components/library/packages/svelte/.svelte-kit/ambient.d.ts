
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const GITPOD_WORKSPACE_CLASS_INFO: string;
	export const GITHUB_TOKEN: string;
	export const LESSOPEN: string;
	export const GITPOD_WORKSPACE_CONTEXT_URL: string;
	export const GITPOD_CONFIGCAT_ENABLED: string;
	export const PYENV_FAKEROOT: string;
	export const GITPOD_REPO_ROOTS: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const GITPOD_PREVENT_METADATA_ACCESS: string;
	export const GITPOD_CODE_HOST: string;
	export const GITPOD_DISABLE_JETBRAINS_LOCAL_PORT_FORWARDING: string;
	export const JAVA_TOOL_OPTIONS: string;
	export const GITPOD_DEFAULT_WORKSPACE_IMAGE: string;
	export const GIT_EDITOR: string;
	export const NODE_VERSION: string;
	export const HOSTNAME: string;
	export const GIT_ASKPASS: string;
	export const PIP_CACHE_DIR: string;
	export const npm_node_execpath: string;
	export const THEIA_WEBVIEW_EXTERNAL_ENDPOINT: string;
	export const SHLVL: string;
	export const BROWSER: string;
	export const npm_config_noproxy: string;
	export const HOME: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM_VERSION: string;
	export const MM_DEBUG: string;
	export const VSCODE_IPC_HOOK_CLI: string;
	export const npm_package_json: string;
	export const PYENV_SHELL: string;
	export const VSX_REGISTRY_URL: string;
	export const WORKSPACEKIT_WRAP_NETNS: string;
	export const GRADLE_HOME: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const GITPOD_TASKS: string;
	export const NIX_PROFILES: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const MAVEN_HOME: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const GOROOT: string;
	export const VISUAL: string;
	export const COLORTERM: string;
	export const SUPERVISOR_ADDR: string;
	export const GITPOD_THEIA_PORT: string;
	export const APACHE_DOCROOT_IN_REPO: string;
	export const COLOR: string;
	export const GITPOD_ANALYTICS_WRITER: string;
	export const THEIA_MINI_BROWSER_HOST_PATTERN: string;
	export const NVM_DIR: string;
	export const GITPOD_IDE_ALIAS: string;
	export const INFOPATH: string;
	export const GITPOD_WORKSPACE_CONTEXT: string;
	export const GITPOD_MEMORY: string;
	export const GITPOD_GIT_USER_EMAIL: string;
	export const GP_OPEN_EDITOR: string;
	export const GITPOD_HOST: string;
	export const GITPOD_OWNER_ID: string;
	export const rvm_bin_path: string;
	export const MM_SERVICESETTINGS_COLLAPSEDTHREADS: string;
	export const SDKMAN_CANDIDATES_API: string;
	export const PYCHARM_PYTHON_PATH: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const RUBY_VERSION: string;
	export const IRBRC: string;
	export const GITPOD_SSH_CA_PUBLIC_KEY: string;
	export const TERM: string;
	export const npm_config_cache: string;
	export const RUSTUP_HOME: string;
	export const PYENV_INIT_LOCK: string;
	export const POETRY_CACHE_DIR: string;
	export const GITPOD_IS_SET_JAVA_XMX: string;
	export const GITPOD_WORKSPACE_URL: string;
	export const GO_VERSION: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const PYENV_HOOK_PATH: string;
	export const SDKMAN_CANDIDATES_DIR: string;
	export const GITPOD_GIT_USER_NAME: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const THEIA_WORKSPACE_ROOT: string;
	export const MY_RUBY_HOME: string;
	export const GP_EXTERNAL_BROWSER: string;
	export const GITPOD_INSTANCE_ID: string;
	export const GITPOD_IS_SET_JAVA_PROCESSOR_COUNT: string;
	export const LANG: string;
	export const PYTHONUSERBASE: string;
	export const LS_COLORS: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const SDKMAN_DIR: string;
	export const SDKMAN_PLATFORM: string;
	export const TERM_PROGRAM: string;
	export const npm_lifecycle_script: string;
	export const NIX_VERSION: string;
	export const GITPOD_CPU_COUNT: string;
	export const GOPATH: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const rvm_prefix: string;
	export const PROMPT_COMMAND: string;
	export const CARGO_INSTALL_ROOT: string;
	export const GEM_HOME: string;
	export const LESSCLOSE: string;
	export const PYENV_MIRROR: string;
	export const RUST_VERSION: string;
	export const SUPERVISOR_DOTFILE_REPO: string;
	export const NIX_SSL_CERT_FILE: string;
	export const GITPOD_ANALYTICS_SEGMENT_ENDPOINT: string;
	export const rvm_version: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const PIPENV_VENV_IN_PROJECT: string;
	export const JAVA_HOME: string;
	export const TRIGGER_REBUILD: string;
	export const PWD: string;
	export const GRADLE_USER_HOME: string;
	export const GEM_PATH: string;
	export const npm_execpath: string;
	export const CARGO_HOME: string;
	export const GITPOD_WORKSPACE_CLASS: string;
	export const NGINX_DOCROOT_IN_REPO: string;
	export const HOMEBREW_NO_AUTO_UPDATE: string;
	export const GITPOD_WORKSPACE_CLUSTER_HOST: string;
	export const PYENV_ROOT: string;
	export const XDG_DATA_DIRS: string;
	export const npm_config_global_prefix: string;
	export const GITPOD_WORKSPACE_ID: string;
	export const npm_command: string;
	export const GP_PREVIEW_BROWSER: string;
	export const GITPOD_REPO_ROOT: string;
	export const HISTFILE: string;
	export const THEIA_RATELIMIT_LOG: string;
	export const MANPATH: string;
	export const PNPM_HOME: string;
	export const GITPOD_INTERVAL: string;
	export const rvm_path: string;
	export const EDITOR: string;
	export const PYTHONUSERBASE_VERSION_FILE: string;
	export const GITPOD_COMMIT_ANNOTATION_ENABLED: string;
	export const INIT_CWD: string;
}

/**
 * Similar to [`$env/static/private`](https://kit.svelte.dev/docs/modules#$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) (or running [`vite preview`](https://kit.svelte.dev/docs/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://kit.svelte.dev/docs/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		GITPOD_WORKSPACE_CLASS_INFO: string;
		GITHUB_TOKEN: string;
		LESSOPEN: string;
		GITPOD_WORKSPACE_CONTEXT_URL: string;
		GITPOD_CONFIGCAT_ENABLED: string;
		PYENV_FAKEROOT: string;
		GITPOD_REPO_ROOTS: string;
		USER: string;
		npm_config_user_agent: string;
		GITPOD_PREVENT_METADATA_ACCESS: string;
		GITPOD_CODE_HOST: string;
		GITPOD_DISABLE_JETBRAINS_LOCAL_PORT_FORWARDING: string;
		JAVA_TOOL_OPTIONS: string;
		GITPOD_DEFAULT_WORKSPACE_IMAGE: string;
		GIT_EDITOR: string;
		NODE_VERSION: string;
		HOSTNAME: string;
		GIT_ASKPASS: string;
		PIP_CACHE_DIR: string;
		npm_node_execpath: string;
		THEIA_WEBVIEW_EXTERNAL_ENDPOINT: string;
		SHLVL: string;
		BROWSER: string;
		npm_config_noproxy: string;
		HOME: string;
		OLDPWD: string;
		TERM_PROGRAM_VERSION: string;
		MM_DEBUG: string;
		VSCODE_IPC_HOOK_CLI: string;
		npm_package_json: string;
		PYENV_SHELL: string;
		VSX_REGISTRY_URL: string;
		WORKSPACEKIT_WRAP_NETNS: string;
		GRADLE_HOME: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		GITPOD_TASKS: string;
		NIX_PROFILES: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		MAVEN_HOME: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		GOROOT: string;
		VISUAL: string;
		COLORTERM: string;
		SUPERVISOR_ADDR: string;
		GITPOD_THEIA_PORT: string;
		APACHE_DOCROOT_IN_REPO: string;
		COLOR: string;
		GITPOD_ANALYTICS_WRITER: string;
		THEIA_MINI_BROWSER_HOST_PATTERN: string;
		NVM_DIR: string;
		GITPOD_IDE_ALIAS: string;
		INFOPATH: string;
		GITPOD_WORKSPACE_CONTEXT: string;
		GITPOD_MEMORY: string;
		GITPOD_GIT_USER_EMAIL: string;
		GP_OPEN_EDITOR: string;
		GITPOD_HOST: string;
		GITPOD_OWNER_ID: string;
		rvm_bin_path: string;
		MM_SERVICESETTINGS_COLLAPSEDTHREADS: string;
		SDKMAN_CANDIDATES_API: string;
		PYCHARM_PYTHON_PATH: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		RUBY_VERSION: string;
		IRBRC: string;
		GITPOD_SSH_CA_PUBLIC_KEY: string;
		TERM: string;
		npm_config_cache: string;
		RUSTUP_HOME: string;
		PYENV_INIT_LOCK: string;
		POETRY_CACHE_DIR: string;
		GITPOD_IS_SET_JAVA_XMX: string;
		GITPOD_WORKSPACE_URL: string;
		GO_VERSION: string;
		npm_config_node_gyp: string;
		PATH: string;
		PYENV_HOOK_PATH: string;
		SDKMAN_CANDIDATES_DIR: string;
		GITPOD_GIT_USER_NAME: string;
		NODE: string;
		npm_package_name: string;
		THEIA_WORKSPACE_ROOT: string;
		MY_RUBY_HOME: string;
		GP_EXTERNAL_BROWSER: string;
		GITPOD_INSTANCE_ID: string;
		GITPOD_IS_SET_JAVA_PROCESSOR_COUNT: string;
		LANG: string;
		PYTHONUSERBASE: string;
		LS_COLORS: string;
		VSCODE_GIT_IPC_HANDLE: string;
		SDKMAN_DIR: string;
		SDKMAN_PLATFORM: string;
		TERM_PROGRAM: string;
		npm_lifecycle_script: string;
		NIX_VERSION: string;
		GITPOD_CPU_COUNT: string;
		GOPATH: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		rvm_prefix: string;
		PROMPT_COMMAND: string;
		CARGO_INSTALL_ROOT: string;
		GEM_HOME: string;
		LESSCLOSE: string;
		PYENV_MIRROR: string;
		RUST_VERSION: string;
		SUPERVISOR_DOTFILE_REPO: string;
		NIX_SSL_CERT_FILE: string;
		GITPOD_ANALYTICS_SEGMENT_ENDPOINT: string;
		rvm_version: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		PIPENV_VENV_IN_PROJECT: string;
		JAVA_HOME: string;
		TRIGGER_REBUILD: string;
		PWD: string;
		GRADLE_USER_HOME: string;
		GEM_PATH: string;
		npm_execpath: string;
		CARGO_HOME: string;
		GITPOD_WORKSPACE_CLASS: string;
		NGINX_DOCROOT_IN_REPO: string;
		HOMEBREW_NO_AUTO_UPDATE: string;
		GITPOD_WORKSPACE_CLUSTER_HOST: string;
		PYENV_ROOT: string;
		XDG_DATA_DIRS: string;
		npm_config_global_prefix: string;
		GITPOD_WORKSPACE_ID: string;
		npm_command: string;
		GP_PREVIEW_BROWSER: string;
		GITPOD_REPO_ROOT: string;
		HISTFILE: string;
		THEIA_RATELIMIT_LOG: string;
		MANPATH: string;
		PNPM_HOME: string;
		GITPOD_INTERVAL: string;
		rvm_path: string;
		EDITOR: string;
		PYTHONUSERBASE_VERSION_FILE: string;
		GITPOD_COMMIT_ANNOTATION_ENABLED: string;
		INIT_CWD: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
