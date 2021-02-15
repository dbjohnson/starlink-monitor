"""
This module will automatically poll starlink for status every 3 seconds, run
speedtests every 15 minutes, and keep a history buffer for each

Polling frequencies can be set via env, see below.
"""
import os
import time
import datetime
from collections import defaultdict
from math import ceil

from . import speedtest
from . import starlink

from tinysched import scheduler


print('data.py automatically runs status update checks in the background')


SUBSCRIBERS = []
STARLINK_REFRESH_SECS = int(os.getenv('STARLINK_REFRESH_SECS', 1))
STARLINK_HISTORY_REFRESH_SECS = int(os.getenv('STARLINK_HISTORY_REFRESH_SECS', 30))
SPEEDTEST_REFRESH_MINS = int(os.getenv('SPEEDTEST_REFRESH_MINS', 15))
BUFFER_SIZE_HOURS = int(os.getenv('BUFFER_SIZE_HOURS', 72))
BUFFER_SIZE_SECS = BUFFER_SIZE_HOURS * 3600
DATA = {
    'starlink_status': defaultdict(list),
    'starlink_history': defaultdict(list),
    'speedtest': defaultdict(list)
}


def latest(history_secs=600, max_data_points=1000):
    """
    Retrieve latest data, with sampling to indicated
    number of data points
    """
    return {
        k: _sample_buffer(
            _trim_buffer(v, history_secs),
            max_data_points
        )
        for k, v in {
            'starlink': _starlink_history_merged(),
            'speedtest': DATA['speedtest'],
            'status': DATA['starlink_status']
        }.items()
    }


def _starlink_history_merged():
    """
    Unfortunately, the history and status data structures from starlink
    contain some different data:
    - status does not contain ping drop rate
    - history does not include obstruction details

    So, we fetch both. The full history is expensive to fetch, so we'll
    only do that once a minute or so, and will fill in the gaps with
    the once-per-sec status
    """
    if DATA['starlink_history']['timestamp']:
        ts = DATA['starlink_history']['timestamp'][-1]
        for i, ts2 in enumerate(DATA['starlink_status']['timestamp']):
            if ts2 > ts:
                return {
                    k: v + DATA['starlink_status'].get(
                        k,
                        [None] * len(DATA['starlink_status']['timestamp'])
                    )[i:]
                    for k, v in DATA['starlink_history'].items()
                }

    # no status history available more recent than the full history
    return DATA['starlink_history']


def _update_starlink_history():
    latest = starlink.history()
    if len(DATA['starlink_history']):
        # merge data
        maxidx = DATA['starlink_history']['index'][-1]
        for i, idx in enumerate(latest['index']):
            if idx > maxidx:
                for k, v in DATA['starlink_history'].items():
                    v.extend(latest[k][i:])
                break
        else:
            DATA['starlink_history'] = latest
    else:
        DATA['starlink_history'] = latest

    DATA['starlink_history'] = _trim_buffer(DATA['starlink_history'])


def _update_starlink_status():
    for k, v in starlink.status().items():
        DATA['starlink_status'][k].append(v)

    DATA['starlink_status'] = _trim_buffer(DATA['starlink_status'])


def _update_speedtest():
    for k, v in speedtest.test().items():
        DATA['speedtest'][k].append(v)

    DATA['speedtest'] = _trim_buffer(DATA['speedtest'])


def _trim_buffer(b, secs_history=BUFFER_SIZE_SECS):
    """
    Limit buffer to indicated length
    """
    for i, ts in enumerate(b['timestamp']):
        if ts >= time.time() - secs_history:
            return defaultdict(list, {
                k: v[i:]
                for k, v in b.items()
            })
    else:
        return defaultdict(list)


def _sample_buffer(b, max_data_points):
    def smooth(k, vals):
        stride = ceil(len(vals) / max_data_points)
        if stride <= 1:
            return vals
        else:
            try:
                return [
                    sum(sample) / (len(sample)) if sample else None
                    for i in range(0, len(vals), stride)
                    for sample in [[
                        v
                        for v in [vals[i - stride: i + stride]]
                        if v is not None
                    ]]
                ]
            except TypeError:
                # non-numeric type
                return [
                    vals[i]
                    for i in range(0, len(vals), stride)
                ]

    return {
        k: smooth(k, v)
        for k, v in b.items()
    }


scheduler.repeat(
    _update_starlink_status,
    interval=datetime.timedelta(seconds=STARLINK_REFRESH_SECS)
)

scheduler.repeat(
    _update_starlink_history,
    interval=datetime.timedelta(seconds=STARLINK_HISTORY_REFRESH_SECS)
)

scheduler.repeat(
    _update_speedtest,
    interval=datetime.timedelta(minutes=SPEEDTEST_REFRESH_MINS)
)
