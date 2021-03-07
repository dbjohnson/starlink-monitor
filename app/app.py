from flask import Flask
from flask import request
from flask import jsonify
from flask import redirect
from flask_socketio import SocketIO

from . import data


app = Flask(__name__)
socketio = SocketIO(app, async_mode='threading')


@app.route('/api/data')
def _data():
    return jsonify(data.latest(
        int(request.args.get('secs', data.BUFFER_SIZE_SECS)),
        int(request.args.get('datapoints', data.BUFFER_SIZE_SECS))
    ))


@app.route('/api/trigger_speedtest')
def _speedtest():
    data._update_speedtest()


@app.route('/')
def _root():
    return redirect('/index.html')


@app.route('/<string:path>')
def _static(path):
    return app.send_static_file(path)


@socketio.on('start_broadcast')
def _set_timespan(d):
    data.broadcast(socketio, d['secs_history'])


if __name__ == '__main__':
    data.start_polling()
    socketio.run(app, debug=True, host='0.0.0.0', port=80)
