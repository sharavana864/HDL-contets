# Minimal, locked-down image for compiling/running participant Verilog.
# No network access is granted at runtime (see HostConfig.NetworkMode=none
# in compilerService.js) and the container is removed immediately after use.
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends iverilog verilator ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 10001 -s /usr/sbin/nologin runner

COPY run_testbench.sh /harness/run_testbench.sh
RUN chmod +x /harness/run_testbench.sh && chown -R runner:runner /harness

USER runner
WORKDIR /work
ENTRYPOINT []
