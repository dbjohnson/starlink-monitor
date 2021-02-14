FROM python:3.9.1-buster

# install grpcurl
WORKDIR /usr/local/bin
RUN cd /usr/local/bin && curl -L https://github.com/fullstorydev/grpcurl/releases/download/v1.8.0/grpcurl_1.8.0_linux_x86_64.tar.gz | tar xzv

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# install requirements, copy over the app
COPY requirements.txt /usr/src/app/requirements.txt
RUN pip install -r /usr/src/app/requirements.txt
COPY . /usr/src/app/
