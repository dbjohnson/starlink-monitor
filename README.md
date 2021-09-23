# starlink-monitor

[![Docker pulls](https://img.shields.io/docker/pulls/dbryanjohnson/starlink-monitor)](https://hub.docker.com/repository/docker/dbryanjohnson/starlink-monitor)
[![push to dockerhub](https://github.com/dbjohnson/starlink-monitor/workflows/push%20to%20dockerhub/badge.svg)](https://hub.docker.com/repository/docker/dbryanjohnson/starlink-monitor)

Basic monitoring web app for [Starlink](https://starlink.com)

Inspired by [ChuckTSI's work](https://github.com/ChuckTSI/BetterThanNothingWebInterface)

Background image credit: [u/johnkphotos](https://www.reddit.com/r/space/comments/4i3t6t/long_exposure_photograph_i_took_of_this_mornings/)

## Quickstart

```bash
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

#### For raspberry pi, try the `armhf` tag, and use `--platform arm`
You'll likely also want to dial down some of the rates, particularly if you're
using a pi zero

```bash
docker run -d -p 3000:80 \
    -e STARLINK_URI=192.168.100.1:9200 \
    -e STARLINK_REFRESH_SECS=30 \
    -e STARLINK_HISTORY_REFRESH_SECS=30 \
    -e BROADCAST_RATE_SECS=30 \
    -e SPEEDTEST_REFRESH_MINS=30 \
    -e BUFFER_SIZE_HOURS=72 \
    --platform arm \
    dbryanjohnson/starlink-monitor:armhf
```


## Build for development

```bash
docker-compose build && docker-compose up -d
```

## Deploy on bare-metal Raspberry pi (without Docker)

```bash
# Install OS dependencies
sudo apt-get update && sudo apt-get install -y curl python3 python-pip git golang
curl -sL https://deb.nodesource.com/setup_12.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g speed-cloudflare-cli
go get github.com/fullstorydev/grpcurl/... && go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
sudo cp -a ~/go/bin/grpcurl /usr/local/bin

# Install starlink monitoring as a service
cd /opt
git clone https://github.com/xsellier/starlink-monitor.git
cd starlink-monitor
sudo pip3 install -r requirements.txt
sudo cp starlink.service /lib/systemd/system
sudo systemctl daemon-reload
sudo systemctl enable starlink.service
sudo systemctl start starlink.service
```


## Environment variables

| env                             | description                              | default            |
| ------------------------------- | ---------------------------------------- | ------------------ |
| `SERVER_HTTP_PORT`              | starlink monitoring server port          | 80               |
| `STARLINK_URI`                  | URI for starlink router                  | 192.168.100.1:9200 |
| `STARLINK_REFRESH_SECS`         | seconds between dishy status checks      | 1                  |
| `STARLINK_HISTORY_REFRESH_SECS` | seconds between dishy 12hr history pulls | 30                 |
| `BROADCAST_RATE_SECS`           | seconds between page refreshes           | 3                  |
| `SPEEDTEST_REFRESH_MINS`        | minutes between speedtests               | 30                 |
| `BUFFER_SIZE_HOURS`             | number of hours of history (in memory!)  | 72                 |

## Github pages
[static page with example data](https://dbjohnson.github.io/starlink-monitor/app/static/)

## Screenshot
![](https://github.com/dbjohnson/starlink-monitor/blob/main/resources/screenshot.png?raw=true)
