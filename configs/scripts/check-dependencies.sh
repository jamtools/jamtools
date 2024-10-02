check_and_install() {
  if [ -d "node_modules/$1" ]; then
    echo "$1 is installed"
  else
    echo "$1 is not installed, installing..."
    npm install "$1" --omit=dev --no-save
  fi
}

check_and_install "jsdom"
