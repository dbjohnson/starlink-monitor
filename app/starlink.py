"""
Use grpcurl to pull stats from the starlink router

grpcurl -plaintext 192.168.100.1:9200 describe SpaceX.API.Device.Request
"""
import os
import subprocess
import json
import time


STARLINK_URI = os.getenv('STARLINK_URI', '192.168.100.1:9200')


def status():
    return {
        'timestamp': time.time(),
        **_fetch('get_status')['dishGetStatus']
    }


def history():
    h = _fetch('get_history')['dishGetHistory']
    now = time.time()

    # unroll ring buffers
    bufferlen = len(h['snr'])
    current = int(h['current'])
    datapoints = min(current, bufferlen)
    start = current - datapoints
    unroll_idx = [
        (start + i) % bufferlen
        for i in range(datapoints)
    ]

    return {
        'index': list(range(current - datapoints + 1, current + 1)),
        'timestamp': [
            now + offs + 1
            for offs in range(-datapoints, 0)
        ],
        **{
            k: [v[idx] for idx in unroll_idx]
            for k, v in h.items()
            if k != 'current'
        }
    }


def _fetch(cmd):
    return json.loads(
        subprocess.check_output(
            f'grpcurl -plaintext -d \'{{"{cmd}": {{}}}}\' {STARLINK_URI}  SpaceX.API.Device.Device/Handle',
            shell=True
        )
    )
