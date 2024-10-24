# This file is meant to be used by other projects to compile their application
# At the moment, it assumes `jamtools` is checked out locally

export MODULES_INDEX_FILE=../../src/modules/index.tsx

export BUILD_TOOL_DIR=./jamtools/apps/jamtools

export ESBUILD_OUT_DIR=$PWD/dist

rm -r webapp && mkdir webapp
cp $BUILD_TOOL_DIR/webapp/index.html webapp/index.html

cd $BUILD_TOOL_DIR/webapp
export BUILD_TOOL_DIR=../../$BUILD_TOOL_DIR

ESBUILD_OUT_DIR=$ESBUILD_OUT_DIR/webapp npm run build
rm $ESBUILD_OUT_DIR/webapp/dynamic-entry.js
cp -r $ESBUILD_OUT_DIR/webapp $ESBUILD_OUT_DIR/../webapp/dist

cd ../node
ESBUILD_OUT_DIR=$ESBUILD_OUT_DIR/node npm run build
rm $ESBUILD_OUT_DIR/node/dynamic-entry.js

cd ../server
ESBUILD_OUT_DIR=$ESBUILD_OUT_DIR/ws-server npm run build
