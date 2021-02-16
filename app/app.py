import os
import datetime

from flask import Flask
from flask import request
from flask import jsonify
from flask_socketio import SocketIO
from flask_socketio import emit
from tinysched import scheduler

from . import data

app = Flask(__name__)
socketio = SocketIO(app, async_mode='threading')


@app.route('/api/data')
def _data():
    secs = int(request.args.get('secs', data.BUFFER_SIZE_SECS))
    return jsonify(data.latest(secs))


@app.route('/')
def _root():
    return app.send_static_file('index.html')


@app.route('/<string:path>')
def _static(path):
    return app.send_static_file(path)


@socketio.on('start_broadcast')
def _set_timespan(d):
    data.broadcast(socketio, d['secs_history'])


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=80)
