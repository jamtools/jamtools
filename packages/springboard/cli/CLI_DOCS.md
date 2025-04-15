# sb

```shell
Commands:
  dev <entrypoint>                Run the Springboard development server
  build [options] <entrypoint>    Build the application bundles
  start                           Start the application server
  upgrade [options] <newVersion>  Upgrade package versions with a specified prefix in package.json files.
  help [command]                  display help for command
```

----------

## sb dev

```shell
Usage: sb dev src/index.tsx

Run the Springboard development server

Options:
  -h, --help  display help for command
```


----------

## sb build

```shell
Usage: sb build src/index.tsx

Build the application bundles

Options:
  -w, --watch                            Watch for file changes
  -p, --platforms <PLATFORM>,<PLATFORM>  Platforms to build for
  -h, --help                             display help for command
```


----------

## sb start

```shell
Usage: sb start [options]

Start the application server

Options:
  -h, --help  display help for command
```


----------

## sb upgrade

```shell
Usage: sb upgrade [options] <newVersion>

Upgrade package versions with a specified prefix in package.json files.

Arguments:
  newVersion                The new version number to set for matching packages.

Options:
  --packages <files...>     package.json files to update (default: ["package.json"])
  --prefixes <prefixes...>  Package name prefixes to match (can be comma-separated or repeated) (default: ["springboard","jamtools"])
  -h, --help                display help for command
```
