if [ -n "$DYNO" ]; then
  echo "Running on Heroku, installing any missing production dependencies that may have been pruned"
  npm install --omit=dev --no-save
fi
