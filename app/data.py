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
from . import ip

from tinysched import scheduler


print('data.py automatically runs status update checks in the background')


BROADCAST_RATE_SECS = int(os.getenv('BROADCAST_RATE_SECS', 3))
STARLINK_REFRESH_SECS = int(os.getenv('STARLINK_REFRESH_SECS', 1))
STARLINK_HISTORY_REFRESH_SECS = int(os.getenv('STARLINK_HISTORY_REFRESH_SECS', 30))
SPEEDTEST_REFRESH_MINS = int(os.getenv('SPEEDTEST_REFRESH_MINS', 30))
BUFFER_SIZE_HOURS = int(os.getenv('BUFFER_SIZE_HOURS', 72))
BUFFER_SIZE_SECS = BUFFER_SIZE_HOURS * 3600
BROADCAST_LOOPS = []
DATA = {
  'starlink_status': defaultdict(list),
  'starlink_history': defaultdict(list),
  'speedtest': defaultdict(list)
}


def latest(history_secs=600, max_data_points=200):
  """
  Retrieve latest data, with sampling to indicated
  number of data points

  NOTE: all speedtests are always returned
  """
  return {
    'ip_local': ip.local(),
    'speedtest': DATA['speedtest'],
    ** {
      k: _sample_buffer(
        _trim_buffer(v, history_secs),
        max_data_points
      )
      for k, v in {
        'starlink': _starlink_history_merged(),
        'status': DATA['starlink_status'],
      }.items()
    }
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

  # if there is a timestamp
  if len(DATA['starlink_history'].get('timestamp', [])):
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
  status = starlink.status()
  # keep integer index, similar to that provide in starlink_history -
  # this will allow us to sample with consistent offsets and avoid
  # aliasing problems when downsampling
  DATA['starlink_status']['index'].append(
    (DATA['starlink_status']['index'] or [0])[-1] + 1
  )
  for k, v in status.items():
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
      # start at an index value that's an integer multiple of the stride
      # to avoid aliasing issues
      start = stride - divmod(b['index'][0], stride)[1]
      try:
        return [
          sum(sample) / len(sample) if sample else None
          for i in range(start, len(vals), stride)
          for sample in [[
            v
            for v in vals[max(0, i - stride): i + stride]
            if v is not None
          ]]
        ]
      except Exception:
        # non-numeric type
        return [
          vals[i]
          for i in range(start, len(vals), stride)
        ]

  return {
    k: smooth(k, v)
    for k, v in b.items()
  }


def broadcast(socketio, secs_history, update_rate=BROADCAST_RATE_SECS):
  """
  Broadcast updates via socketui
  """
  # cancel existing schedulers
  for cancel_fn in BROADCAST_LOOPS:
    cancel_fn()

  BROADCAST_LOOPS.clear()

  # start new scheduler
  def broadcast():
    socketio.send(latest(secs_history))

  BROADCAST_LOOPS.append(
    scheduler.repeat(
      broadcast,
      interval=datetime.timedelta(seconds=update_rate)
    )
  )


def start_polling():
  """
  Start polling starlink for data, and performing perioic speedtests
  """
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
