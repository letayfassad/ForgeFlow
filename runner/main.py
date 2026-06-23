"""ForgeFlow runner entry point."""

import argparse
import asyncio
import logging
import sys

from forgeflow_runner.server import DEFAULT_HOST, DEFAULT_PORT, RunnerServer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def main() -> None:
    parser = argparse.ArgumentParser(description="ForgeFlow Desktop Automation Runner")
    parser.add_argument("--host", default=DEFAULT_HOST, help="WebSocket host")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="WebSocket port")
    args = parser.parse_args()

    server = RunnerServer(host=args.host, port=args.port)
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\nForgeFlow runner stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()