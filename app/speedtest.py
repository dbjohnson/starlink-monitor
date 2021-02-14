import speedtest


def test():
    s = speedtest.Speedtest()
    s.get_servers([])
    s.get_best_server()
    s.download(threads=None)
    s.upload(threads=None)
    return s.results.dict()
