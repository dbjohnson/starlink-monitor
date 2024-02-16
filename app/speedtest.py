import time

import speedtest


def test(threads=None):
    s = speedtest.Speedtest(secure=True)
    # run for longer than the default (10 seconds);
    # speeds seem to ramp over time
    s.config["length"]["download"] = 20
    s.get_best_server()
    s.download(threads=threads)
    s.upload(threads=threads)
    return {**s.results.dict(), "timestamp": time.time()}
