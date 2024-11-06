#!/bin/bash

full_version="0.6.7"  # Set the target version here or make it a script argument

root_dir=$(pwd)  # Assuming this script is run from the project root

# Function to bump version
bump_version() {
  local target_dir=$1
  local version=$full_version

  cd "$target_dir" || exit 1
  echo "Bumping version in $target_dir"
  # npm version "$full_version" --no-git-tag-version
  jq --arg version "$version" '.version = $version' "$target_dir/package.json" > "$target_dir/tmp.json" && mv "$target_dir/tmp.json" "$target_dir/package.json"
}

# Function to update peer dependency
bump_peer_dep() {
  local target_dir=$1
  local dependency_name=$2
  local version="$full_version"
  echo "Updating peer dependency $package_name in $target_dir to $version"
  # npm install "$package_name@$full_version" --save-peer --registry http://localhost:4873
  jq --arg dep "$dependency_name" --arg version "$version" '.peerDependencies[$dep] = $version' "$target_dir/package.json" > "$target_dir/tmp.json" && mv "$target_dir/tmp.json" "$target_dir/package.json"
}

# Function to publish package
publish_package() {
  local target_dir=$1
  cd "$target_dir" || exit 1
  echo "Publishing package in $target_dir"
  npm publish --registry http://localhost:4873
}

# Bump, update dependencies, and publish each package

bump_version "$root_dir/packages/jamtools/core"
publish_package "$root_dir/packages/jamtools/core"

bump_version "$root_dir/packages/jamtools/platforms/webapp"
bump_peer_dep "$root_dir/packages/jamtools/platforms/webapp" "jamtools-core"
publish_package "$root_dir/packages/jamtools/platforms/webapp"

bump_version "$root_dir/packages/jamtools/platforms/node"
bump_peer_dep "$root_dir/packages/jamtools/platforms/node" "jamtools-core"
publish_package "$root_dir/packages/jamtools/platforms/node"

bump_version "$root_dir/apps/jamtools/webapp"
bump_peer_dep "$root_dir/apps/jamtools/webapp" "jamtools-core"
bump_peer_dep "$root_dir/apps/jamtools/webapp" "jamtools-platforms-webapp"
publish_package "$root_dir/apps/jamtools/webapp"

bump_version "$root_dir/apps/jamtools/node"
bump_peer_dep "$root_dir/apps/jamtools/node" "jamtools-core"
bump_peer_dep "$root_dir/apps/jamtools/node" "jamtools-platforms-node"
publish_package "$root_dir/apps/jamtools/node"

bump_version "$root_dir/packages/data_storage"
publish_package "$root_dir/packages/data_storage"

bump_version "$root_dir/apps/jamtools/server"
bump_peer_dep "$root_dir/apps/jamtools/server" "jamtools-core"
bump_peer_dep "$root_dir/apps/jamtools/server" "springboard-data-storage"
publish_package "$root_dir/apps/jamtools/server"

bump_version "$root_dir/packages/springboard/mantine"
bump_peer_dep "$root_dir/packages/springboard/mantine" "jamtools-core"
publish_package "$root_dir/packages/springboard/mantine"

bump_version "$root_dir/packages/springboard/cli"
bump_peer_dep "$root_dir/packages/springboard/cli" "jamtools-core"
bump_peer_dep "$root_dir/packages/springboard/cli" "jamtools-platforms-node"
bump_peer_dep "$root_dir/packages/springboard/cli" "jamtools-platforms-webapp"
publish_package "$root_dir/packages/springboard/cli"

# # npm i
