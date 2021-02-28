import time

import speedtest


def test(threads=None):
    s = speedtest.Speedtest()
    s.get_best_server()
    s.download(threads=threads)
    s.upload(threads=threads)
    return {
        **s.results.dict(),
        'timestamp': time.time()
    }
