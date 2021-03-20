import time
import re
import subprocess


def test():
    """
    Use speed-cloudflare-cli to test connection speed.
    This tests various different download sizes, and in my experience
    gives a more consistent assessment of performance than speedtest-cli,
    which is limited to downloads < 5MB (from what I can tell)
    """
    def parse_line(line):
        key, val = [s.strip() for s in line.split(':')]
        try:
            return key, float(val.split(' ')[0])
        except ValueError:
            return key, val

    test_results = re.sub(
        # regex for stripping ansi color escape codes.
        r'(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]',
        '',
        subprocess.getoutput(
            'npx speed-cloudflare-cli',
        )
    )

    return {**{
        key: val
        for line in
        test_results.split('\n')
        if ':' in line
        for key, val in [parse_line(line)]
    },
        'timestamp': time.time()
    }
