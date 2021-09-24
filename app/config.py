import configparser, os

CONFIG_FILENAME = 'config.ini'

config = configparser.ConfigParser()

def write_file():
  global config, CONFIG_FILENAME

  with open(CONFIG_FILENAME, 'w') as configfile:
    config.write(configfile)

def toggle_speedtest():
  global config

  config['settings']['speedtest_enabled'] = str(config.getboolean('settings', 'speedtest_enabled') ^ True)
  write_file()

def get_max_data_point():
  global config

  return config.getint('settings', 'max_data_points')

def get_history_secs():
  global config

  return config.getint('settings', 'history_secs')

def is_speedtest_enabled():
  global config

  return config.getboolean('settings', 'speedtest_enabled')

if not os.path.exists(CONFIG_FILENAME):
  config['settings'] = {
    'speedtest_enabled': True,
    'max_data_points': 200,
    'history_secs': 600
  }

  write_file()
else:
  # Read File
  config.read(CONFIG_FILENAME)
