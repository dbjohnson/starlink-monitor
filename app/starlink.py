"""
Use grpcurl to pull stats from the starlink router

grpcurl -plaintext 192.168.100.1:9200 describe SpaceX.API.Device.Request
"""

import os
import re
import subprocess
import json
import time


STARLINK_URI = os.getenv("STARLINK_URI", "192.168.100.1:9200")


def status():
    return {
        "timestamp": time.time(),
        **_fetch("get_status")["dishGetStatus"],
    }


def obstruction_map():
    return _fetch("dish_get_obstruction_map")["dishGetObstructionMap"]


def history():
    h = _fetch("get_history")["dishGetHistory"]
    now = time.time()

    # unroll ring buffers
    bufferlen = len(h["popPingDropRate"])
    current = int(h["current"])
    datapoints = min(current, bufferlen)
    start = current - datapoints
    unroll_idx = [(start + i) % bufferlen for i in range(datapoints)]

    return {
        "index": list(range(current - datapoints + 1, current + 1)),
        "timestamp": [now + offs + 1 for offs in range(-datapoints, 0)],
        **{
            k: [v[idx] for idx in unroll_idx]
            for k, v in h.items()
            if len(v) == bufferlen
        },
    }


def _fetch(cmd):
    return json.loads(
        subprocess.check_output(
            f"grpcurl -plaintext -d '{{\"{cmd}\": {{}}}}' {STARLINK_URI} SpaceX.API.Device.Device/Handle",
            shell=True,
        )
    )


def list_grpc_methods(root=""):
    """
    Ad-hoc grpc introspection - I'm just fumbling around here, if you want to
    dig deeper follow something like this:
    https://github.com/ewilken/starlink-rs/tree/main/proto/spacex/api/device
    """
    try:
        return [
            child
            for s in subprocess.check_output(
                f"grpcurl -plaintext {STARLINK_URI} list {root}",
                shell=True,
                text=True,
                stderr=subprocess.DEVNULL,
            )
            .strip()
            .split("\n")
            for child in list_grpc_methods(s)
        ]
    except subprocess.CalledProcessError:
        return [root]


def describe_grpc_method(method):
    description = subprocess.check_output(
        f"grpcurl -plaintext {STARLINK_URI} describe {method}",
        shell=True,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
    req, resp = re.search(
        rf"rpc {method.split('.')[-1]} \( (?:\w+\s)?\.(.*?) \) returns \( (?:\w+\s)?\.(.*?) \);",
        description,
    ).groups()

    for obj in (req, resp):
        description = subprocess.check_output(
            f"grpcurl -plaintext {STARLINK_URI} describe {obj}",
            shell=True,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        print(description)
        print()
