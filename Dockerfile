FROM python:3.9.1-slim-buster

ENV PYTHONPATH=.
ENV STARLINK_URI=192.168.100.1:9200
ENV STARLINK_REFRESH_SECS=1
ENV STARLINK_HISTORY_REFRESH_SECS=30
ENV BROADCAST_RATE_SECS=3
ENV SPEEDTEST_REFRESH_MINS=30
ENV BUFFER_SIZE_HOURS=72

# install grpcurl
WORKDIR /usr/local/bin
RUN apt-get update && apt-get install -y curl
RUN cd /usr/local/bin && curl -L https://github.com/fullstorydev/grpcurl/releases/download/v1.8.0/grpcurl_1.8.0_linux_x86_64.tar.gz | tar xzv

# install npm & speed-cloudflare-cli
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt install -y nodejs
RUN npm install -g speed-cloudflare-cli

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# install requirements, copy over the app
COPY requirements.txt /usr/src/app/requirements.txt
RUN pip install -r /usr/src/app/requirements.txt
COPY . /usr/src/app/

CMD python3 -m app.app 
