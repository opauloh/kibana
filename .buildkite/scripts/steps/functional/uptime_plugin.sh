#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh
.buildkite/scripts/download_build_artifacts.sh
.buildkite/scripts/setup_es_snapshot_cache.sh

export JOB=kibana-uptime-plugin

echo "--- Uptime plugin @elastic/synthetics Tests"

cd "$XPACK_DIR"

node solutions/observability/plugins/uptime/scripts/uptime_e2e.js --kibana-install-dir "$KIBANA_BUILD_LOCATION" ${GREP:+--grep \"${GREP}\"}
