FROM arm32v6/node:15.12.0-alpine3.12

# cheat code:  copy golang executable from sibling container, 
# rather than building from source
COPY --from=arm32v6/golang:alpine3.12 /usr/local/go/ /usr/local/go/

ENV PATH="/usr/local/go/bin:$PATH"
ENV PYTHONPATH=.
ENV STARLINK_URI=192.168.100.1:9200
ENV STARLINK_REFRESH_SECS=1
ENV STARLINK_HISTORY_REFRESH_SECS=30
ENV BROADCAST_RATE_SECS=3
ENV SPEEDTEST_REFRESH_MINS=30
ENV BUFFER_SIZE_HOURS=72

# install speed-cloudflare-cli
RUN npm install -g speed-cloudflare-cli

# install grpcurl from source (no pre-compiled binaries available for arm)
WORKDIR /usr/local/bin
RUN go get github.com/fullstorydev/grpcurl/... && go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
RUN mv /root/go/bin/grpcurl /usr/bin/
# cleanup after install - dozens of MBs in here
RUN rm -rf /root/go

# install python, copy over app
RUN apk update && apk add python3 py3-pip py3-setuptools
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# install requirements
COPY requirements.txt /usr/src/app/requirements.txt
RUN pip3 install -r /usr/src/app/requirements.txt
COPY . /usr/src/app/

CMD python3 -m app.app
