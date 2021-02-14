from flask import Flask
from flask import jsonify

from . import data

app = Flask(__name__)


@app.route('/api/data')
def _data():
    return jsonify(data.DATA)


@app.route('/')
def _root():
    return app.send_static_file('index.html')


@app.route('/<string:path>')
def _static(path):
    return app.send_static_file(path)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80, threaded=True)
