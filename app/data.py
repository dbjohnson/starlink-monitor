"""
This module will automatically poll starlink for status every 3 seconds, run
speedtests every 15 minutes, and keep a history buffer for each
"""
import time
import datetime

from . import speedtest
from . import starlink

from tinysched import scheduler


print('data.py automatically runs status update checks in the background')


BUFFER_SIZE_HOURS = 72
DATA = {
    'starlink': [],
    'speedtest': [],
    'starlink12': None
}


def _update_starlink_12():
    DATA['starlink12'] = starlink.history()
    now = time.time()
    nrecords = len(DATA['starlink12']['snr'])
    DATA['starlink12']['timestamp'] = [
        now - (nrecords - i - 1)
        for i in range(nrecords)
    ]


def _update_starlink():
    DATA['starlink'].append({
        **starlink.status(),
        'timestamp': datetime.datetime.utcnow()
    })
    DATA['starlink'] = _trim_buffer(DATA['starlink'])


def _update_speedtest():
    DATA['speedtest'].append({
        **speedtest.test(),
        'timestamp': datetime.datetime.utcnow()
    })
    DATA['speedtest'] = _trim_buffer(DATA['speedtest'])


def _trim_buffer(b):
    return [
        r for r in b
        if (datetime.datetime.now() - r['timestamp']).total_seconds() <= BUFFER_SIZE_HOURS * 2600
    ]


scheduler.repeat(
    _update_starlink,
    interval=datetime.timedelta(seconds=3)
)

scheduler.repeat(
    _update_starlink_12,
    interval=datetime.timedelta(seconds=3)
)

scheduler.repeat(
    _update_speedtest,
    interval=datetime.timedelta(minutes=15)
)
