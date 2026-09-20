#!/bin/bash

if [ "$DEBUG" == "true" ]; then
	set -x
	EDIFICE_CLI_DEBUG_OPTION="--debug"
else
	EDIFICE_CLI_DEBUG_OPTION=""
fi

init() {
  me=`id -u`:`id -g`
  echo "DEFAULT_DOCKER_USER=$me" > .env

  if [ -z "$CLI_VERSION" ]; then
    CLI_VERSION="latest"
  fi
  cat <<EOF > build.compose.yaml
services:
  edifice-cli:
    image: opendigitaleducation/edifice-cli:$CLI_VERSION
    user: "$DEFAULT_DOCKER_USER"
EOF
  docker compose -f build.compose.yaml create edifice-cli
  docker compose -f build.compose.yaml cp edifice-cli:/root/edifice ./edifice
  docker compose -f build.compose.yaml rm -fsv edifice-cli
  rm -f build.compose.yaml
  chmod +x edifice
  ./edifice version $EDIFICE_CLI_DEBUG_OPTION
}

if [ "$#" -eq 0 ]; then
  cd frontend
  ./build.sh --no-docker clean init build
  cd ..

  cd backend
  # NOTE: unlike collaborative-wall, the React dist is copied into a
  # dedicated subfolder (public/react/) instead of being merged into
  # public/ directly. The old AngularJS frontend still lives under
  # src/main/resources/public/{ts,sass,template,img} and must not be
  # touched or deleted by this script while the migration is in progress.
  mkdir -p ./src/main/resources/public/react
  rm -rf ./src/main/resources/public/react/*
  cp -R ../frontend/dist/* ./src/main/resources/public/react/

  ./build.sh init clean install
  cd ..

  rm -rf frontend/dist
  exit 0
fi

if [ ! -e .env ]; then
  init
fi

for param in "$@"
do
  case $param in
    init)
      init
      ;;
    *)
      echo "Invalid argument : $param"
  esac
  if [ ! $? -eq 0 ]; then
    exit 1
  fi
done
