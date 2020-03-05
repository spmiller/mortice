#!/usr/bin/env bash
[ -z "$1" ] && INTERACTIVE_FLAG="-i"
NPMRC_FILE=${HOME}/.npmrc
[[ -f "${NPMRC_FILE}" ]] && NPMRC_MOUNT="--mount type=bind,source="${NPMRC_FILE}",target=/tmp/.npmrc"
docker run --user ${UID}:${GROUPS} --init --rm --cap-add=SYS_ADMIN ${NPMRC_MOUNT} -v "${PWD}:${PWD}" -w="${PWD}" ${INTERACTIVE_FLAG} -t morticebuildenv "$@"
