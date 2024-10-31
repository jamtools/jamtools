#!/bin/bash

# # Define the folders to include in the search
# include_folders=("apps" "packages")

# # Loop over each folder and find package.json files
# for folder in "${include_folders[@]}"; do
#   find "./$folder" -name "package.json" -print
# done







# ./packages/jamtools/core/package.json

# ./packages/jamtools/platforms/webapp/package.json
# ./packages/jamtools/platforms/node/package.json

# ./apps/jamtools/webapp/package.json
# ./apps/jamtools/node/package.json


# ./apps/jamtools/server/package.json
# ./packages/jamtools/features/package.json


# root_dir=$PWD

# rc_version=10

# full_version=0.1.0-rc$rc_version

# cd $root_dir/packages/jamtools/core
# bump_version $full_version
# publish

# cd $root_dir/packages/jamtools/platforms/webapp
# bump_version $full_version
# bump_peer_dep jamtools-core $full_version
# publish

# cd $root_dir/packages/jamtools/platforms/node
# bump_version $full_version
# bump_peer_dep jamtools-core $full_version
# publish

# cd $root_dir/apps/jamtools/webapp
# bump_version $full_version
# bump_peer_dep jamtools-core $full_version
# bump_peer_dep jamtools-platforms-webapp $full_version
# publish

# cd $root_dir/apps/jamtools/node
# bump_version $full_version
# bump_peer_dep jamtools-core $full_version
# bump_peer_dep jamtools-platforms-node $full_version
# publish




#!/bin/bash

# Set root directory and full version


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

root_dir=$(pwd)  # Assuming this script is run from the project root
full_version="0.3.0"  # Set the target version here or make it a script argument

# Bump, update dependencies, and publish each package

bump_version "$root_dir/packages/jamtools/core"
# publish_package "$root_dir/packages/jamtools/core"

bump_version "$root_dir/packages/jamtools/platforms/webapp"
bump_peer_dep "$root_dir/packages/jamtools/platforms/webapp" "jamtools-core"
# publish_package "$root_dir/packages/jamtools/platforms/webapp"

bump_version "$root_dir/packages/jamtools/platforms/node"
bump_peer_dep "$root_dir/packages/jamtools/platforms/node" "jamtools-core"
# publish_package "$root_dir/packages/jamtools/platforms/node"

bump_version "$root_dir/apps/jamtools/webapp"
bump_peer_dep "$root_dir/apps/jamtools/webapp" "jamtools-core"
bump_peer_dep "$root_dir/apps/jamtools/webapp" "jamtools-platforms-webapp"
# publish_package "$root_dir/apps/jamtools/webapp"

bump_version "$root_dir/apps/jamtools/node"
bump_peer_dep "$root_dir/apps/jamtools/node" "jamtools-core"
bump_peer_dep "$root_dir/apps/jamtools/node" "jamtools-platforms-node"
# publish_package "$root_dir/apps/jamtools/node"

# npm i
