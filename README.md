# starlink-monitor

[![CI to Docker Hub](https://github.com/dbjohnson/starlink-monitor/workflows/CI%20to%20Docker%20hub/badge.svg)](https://hub.docker.com/repository/docker/dbryanjohnson/starlink-monitor)

Basic [monitoring webapp](http://localhost:3000) for [Starlink](https://starlink.com)

Inspired by [ChuckTSI's work](https://github.com/ChuckTSI/BetterThanNothingWebInterface)

Background image credit: [u/johnkphotos](https://www.reddit.com/r/space/comments/4i3t6t/long_exposure_photograph_i_took_of_this_mornings/)

## Quickstart

```
docker run -d -p 3000:80 \
	-e STARLINK_URI=192.168.100.1:9200 \
	-e STARLINK_REFRESH_SECS=1 \
	-e STARLINK_HISTORY_REFRESH_SECS=30 \
	-e BROADCAST_RATE_SECS=3 \
	-e SPEEDTEST_REFRESH_MINS=30 \
	-e BUFFER_SIZE_HOURS=72 \
	dbryanjohnson/starlink-monitor:latest
```

View at [http://localhost:3000](http://localhost:3000)


## Installation

```
docker-compose build && docker-compose up -d
```


## Environment variables

| env                             | description                              | default              |
| ------------------------------- | ---------------------------------------- | -------------------- |
| `STARLINK_URI`                  | URI for starlink router                  | `192.168.100.1:9200` |
| `STARLINK_REFRESH_SECS`         | seconds between dishy status checks      | `1`                  |
| `STARLINK_HISTORY_REFRESH_SECS` | seconds between dishy 12hr history pulls | `30`                 |
| `BROADCAST_RATE_SECS`           | seconds between page refreshes           | `3`                  |
| `SPEEDTEST_REFRESH_MINS`        | minutes between speedtests               | `30`                 |
| `BUFFER_SIZE_HOURS`             | number of hours of history (in memory!)  | `72`                 |


## Screenshot
![](https://github.com/dbjohnson/starlink-monitor/blob/main/resources/screenshot.png?raw=true)
