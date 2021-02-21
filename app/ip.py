import socket
from urllib import request


def local():
    return socket.gethostbyname_ex(socket.gethostname())[-1][0]


def public():
    return request.urlopen('http://ip.42.pl/raw').read().decode()
