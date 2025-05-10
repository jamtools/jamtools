#!/bin/bash

if [ -n "$1" ]; then
  version="$1"
  full_version="${version#v}"
else
  full_version="0.15.0-rc9"
fi

set -e
root_dir=$(pwd)

bump_version() {
  local target_dir=$1
  local version=$full_version

  cd "$target_dir" || exit 1
  echo "Bumping version in $target_dir"
  jq --arg version "$version" '.version = $version' "$target_dir/package.json" > "$target_dir/tmp.json" && mv "$target_dir/tmp.json" "$target_dir/package.json"
}

bump_peer_dep() {
  local target_dir=$1
  local dependency_name=$2
  local version="$full_version"
  echo "Updating peer dependency $package_name in $target_dir to $version"
  jq --arg dep "$dependency_name" --arg version "$version" '.peerDependencies[$dep] = $version' "$target_dir/package.json" > "$target_dir/tmp.json" && mv "$target_dir/tmp.json" "$target_dir/package.json"
}

publish_package() {
  local target_dir=$1
  cd "$target_dir" || exit 1
  echo "Publishing package in $target_dir"

  # Determine if we're in CI environment
  local is_ci="${CI:-false}"
  local registry=""
  local environment="local Verdaccio"

  # Set registry based on environment
  if [ "$is_ci" = "true" ]; then
    registry=""
    environment="npm"
  else
    registry="--registry http://localhost:4873"
    environment="local Verdaccio"
  fi

  # Determine tag based on version format
  local tag="latest"
  if [[ "$full_version" == *"-"* ]]; then
    if [[ "$full_version" == *"-rc"* ]]; then
      tag="rc"
    elif [[ "$full_version" == *"-dev"* ]]; then
      tag="dev"
    else
      tag="dev"
    fi
    echo "Publishing pre-release version to $environment with tag: $tag"
  else
    echo "Publishing production version to $environment"
  fi

  npm publish --access public $registry --tag "$tag"
}

bump_version "$root_dir/packages/springboard/core"
publish_package "$root_dir/packages/springboard/core"

sleep 1

bump_version "$root_dir/packages/springboard/platforms/webapp"
bump_peer_dep "$root_dir/packages/springboard/platforms/webapp" "springboard"
publish_package "$root_dir/packages/springboard/platforms/webapp"

sleep 1

bump_version "$root_dir/packages/springboard/platforms/node"
bump_peer_dep "$root_dir/packages/springboard/platforms/node" "springboard"
publish_package "$root_dir/packages/springboard/platforms/node"

sleep 1

bump_version "$root_dir/packages/springboard/platforms/react-native"
bump_peer_dep "$root_dir/packages/springboard/platforms/react-native" "springboard"
publish_package "$root_dir/packages/springboard/platforms/react-native"

sleep 1

bump_version "$root_dir/packages/springboard/platforms/partykit"
bump_peer_dep "$root_dir/packages/springboard/platforms/partykit" "springboard"
publish_package "$root_dir/packages/springboard/platforms/partykit"

sleep 1

bump_version "$root_dir/packages/springboard/data_storage"
publish_package "$root_dir/packages/springboard/data_storage"

sleep 1

bump_version "$root_dir/packages/springboard/server"
bump_peer_dep "$root_dir/packages/springboard/server" "springboard"
bump_peer_dep "$root_dir/packages/springboard/server" "@springboardjs/data-storage"
publish_package "$root_dir/packages/springboard/server"

sleep 1

bump_version "$root_dir/packages/springboard/external/mantine"
bump_peer_dep "$root_dir/packages/springboard/external/mantine" "springboard"
publish_package "$root_dir/packages/springboard/external/mantine"

sleep 1

bump_version "$root_dir/packages/springboard/external/shoelace"
bump_peer_dep "$root_dir/packages/springboard/external/shoelace" "springboard"
publish_package "$root_dir/packages/springboard/external/shoelace"

sleep 1

bump_version "$root_dir/packages/jamtools/core"
bump_peer_dep "$root_dir/packages/jamtools/core" "springboard"
publish_package "$root_dir/packages/jamtools/core"

sleep 1

bump_version "$root_dir/packages/jamtools/features"
bump_peer_dep "$root_dir/packages/jamtools/features" "@jamtools/core"
bump_peer_dep "$root_dir/packages/jamtools/features" "@springboardjs/shoelace"
publish_package "$root_dir/packages/jamtools/features"

sleep 1

bump_version "$root_dir/packages/springboard/cli"
bump_peer_dep "$root_dir/packages/springboard/cli" "springboard"
bump_peer_dep "$root_dir/packages/springboard/cli" "@springboardjs/platforms-node"
bump_peer_dep "$root_dir/packages/springboard/cli" "@springboardjs/platforms-browser"
bump_peer_dep "$root_dir/packages/springboard/cli" "springboard-server"
publish_package "$root_dir/packages/springboard/cli"

sleep 1

bump_version "$root_dir/packages/springboard/create-springboard-app"
publish_package "$root_dir/packages/springboard/create-springboard-app"

# # npm i
