#!/usr/bin/env bash
[ -z "$1" ] && INTERACTIVE_FLAG="-i"
docker run --user ${UID}:${GROUPS} --init --rm --cap-add=SYS_ADMIN -v ${PWD}:${PWD} -w=${PWD} ${INTERACTIVE_FLAG} -t morticebuildenv "$@"
