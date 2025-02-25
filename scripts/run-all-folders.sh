#!/bin/bash

if [ -n "$1" ]; then
  full_version="$1"
else
  full_version="0.15.0-rc5"
fi

set e
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

  # RC publish to npm
  npm publish --access public --tag rc

  # Production publish to npm
  # npm publish --access public --tag latest

  # RC publish to verdaccio
  # npm publish --registry http://localhost:4873 --access public --tag rc

  # Production publish to verdaccio
  # npm publish --registry http://localhost:4873 --access public --tag latest
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

# # npm i
