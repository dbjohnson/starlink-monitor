"""
Use grpcurl to pull stats from the starlink router
"""
import os
import subprocess
import json


STARLINK_URI = os.getenv('STARLINK_URI', '192.168.100.1:9200')


def status():
    return _fetch('get_status')['dishGetStatus']


def history():
    h = _fetch('get_history')['dishGetHistory']
    # unroll ring buffers
    bufferlen = len(h['snr'])
    # use uptime (seconds) as proxy to see how much of the buffer we expect to
    # be filled with meaningful data - data is sampled at 1Hz, so seconds
    # of uptime ~= number of datapoints
    uptime = int(status()['deviceState']['uptimeS'])
    datapoints = min(uptime, bufferlen)
    start = int(h['current']) - datapoints
    unroll_idx = [
        (start + i) % bufferlen
        for i in range(datapoints)
    ]

    return {
        k: [v[idx] for idx in unroll_idx]
        for k, v in h.items()
        if k != 'current'
    }


def _fetch(cmd):
    return json.loads(
        subprocess.check_output(
            f'grpcurl -plaintext -d \'{{"{cmd}": {{}}}}\' {STARLINK_URI}  SpaceX.API.Device.Device/Handle',
            shell=True
        )
    )
