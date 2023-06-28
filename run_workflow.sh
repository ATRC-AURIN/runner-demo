#!/bin/bash

docker stop workflow-runner || true && docker rm workflow-runner || true && docker rmi workflow-runner || true

docker build -t workflow-runner ./src/

docker run \
  --name workflow-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  -v "$(pwd)"/$1:/usr/src/app/$1 \
  -v "$(pwd)"/runner_outputs:/runner_outputs \
  workflow-runner npm run workflow $1

exit $?