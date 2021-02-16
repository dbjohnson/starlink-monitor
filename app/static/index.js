const d3colors = [

  '#1F77B4',
  '#FF7F0E',
  '#2CA02C',
  '#D62728',
  '#9575D2',
  '#8C564B',
  '#E377C0',
  '#7F7F7F',
  '#BCBD22',
  '#17BECF'
]

const config = {
  displayModeBar: false,
  dragmode: false
}

const layout = (title, showlegend = false) => {
  return {
    font: {
      color: 'white',
      size: document.body.clientWidth < 1000 ? 18 : 12
    },
    paper_bgcolor: '#fff0',
    plot_bgcolor: '#fff0',
    xaxis: {
      showline: false,
      showgrid: false,
      nticks: 5,
      tickformat: '%-I:%M%p',
      fixedrange: true
    },
    yaxis: {
      showline: false,
      gridcolor: '#ffffff30',
      hoverformat: '.1f',
      fixedrange: true
    },
    showlegend: showlegend,
    legend: {
      x: 1,
      xanchor: 'left',
      y: 0.9,
      bgcolor: '#fff0',
    },
    autoscale: true,
    margin: { pad: 10, l: 50, r: 10, t: 40, b: 40, autoexpand: true },
    barmode: 'grouped',
    title: {
      text: title,
      x: 0.02,
      xanchor: 'left',
      position: 'left',
      font: {
        size: 18
      }
    }
  }
}

const socket = io.connect()

socket.on('connect', function() {
  startBroadcast()
})

socket.on('message', function(data) {
  render(data)
})

const startBroadcast = () => {
  const history = document.getElementById('history')
  const secs = history ? parseInt(history.value) : 600
  socket.emit('start_broadcast', { secs_history: secs })
}


const render = (data) => {
  document.getElementById('lastupdate').innerHTML = "Updated: " + (new Date()).toLocaleTimeString()
  renderPing(data)
  renderPingDrop(data)
  renderSNR(data)
  renderThroughput(data)
  renderDowntime(data)
  renderObstructionMap(data)
  renderSpeedTest(data)
}


const renderPing = (data) => {
  const pdata = [{
    x: data.starlink.timestamp.map(ts => new Date(ts * 1000)),
    y: data.starlink.popPingLatencyMs,
    type: 'bar',
    name: 'ping',
    hovertemplate: '%{y:.1f}ms',
    marker: {
      color: data.starlink.popPingLatencyMs,
      colorscale: 'Portland',
      cmin: 30,
      cmax: 120,
    }
  }]
  Plotly.newPlot('ping', pdata, layout('Ping (ms)'), config);
}


const renderSNR = (data) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const y = data.starlink.snr
  const pdata = [{
    x: x,
    y: y,
    x: x,
    // invert the data so we can plot the bars as coming down from the top of
    // the graph - i.e., SNR 9 => y = 0 (short bar)
    // 0.5 just is to give the line some thickness at SNR = 9
    y: y.map(y => (9 - y) || 0.5),
    text: y.map(y => y.toFixed(1)),
    type: 'bar',
    name: 'SNR',
    hovertemplate: '%{text}',
    marker: {
      // invert for colormap: 9 = blue, 0 = red
      color: y.map(y => -y),
      colorscale: 'Portland',
      cmin: -9,
      cmax: 0,
    },
  }]

  const lout = layout('SNR')
  // invert the range so 0 is at the top of the chart
  lout.yaxis.range = [9, 0]
  // reverse tick labels to match inverted range
  lout.yaxis.tickmode = 'array'
  lout.yaxis.tickvals = [0, 3, 6, 9]
  lout.yaxis.ticktext = [9, 6, 3, 0]

  Plotly.newPlot('snr', pdata, lout, config);
}


const renderPingDrop = (data) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const y = data.starlink.popPingDropRate.map(v => v * 100)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'ping drop rate',
    hovertemplate: '%{y:.1f}%',
    marker: {
      color: y,
      colorscale: 'Portland',
      cmin: 1,
      cmax: 0,
    }
  }]
  const lout = layout('Ping drop (%)')

  Plotly.newPlot('pingdrop', pdata, lout, config);
}


const renderThroughput = (data) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const y1 = data.starlink.downlinkThroughputBps.map(v => v / 1e6)
  const y2 = data.starlink.uplinkThroughputBps.map(v => v / 1e6)
  const pdata = [{
    x: x,
    y: y1,
    type: 'bar',
    name: 'download',
    hovertemplate: '%{y:.1f} Mbps',
    marker: {
      color: d3colors[0],
    }
  }, {
    x: x,
    y: y2,
    type: 'bar',
    name: 'upload',
    hovertemplate: '%{y:.1f} Mbps',
    marker: {
      color: d3colors[1],
    }
  }]

  Plotly.newPlot('throughput', pdata, layout('Throughput (Mbps)', true), config);
}


const renderDowntime = (data) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const planned = data.starlink.scheduled.map(v => v === null ? true : v).map(v => v ? 0 : 1)
  const obstructed = data.starlink.obstructed.map(v => v ? 1 : 0)

  const pdata = [{
    x: x,
    y: planned,
    type: 'bar',
    name: 'beta',
    marker: {
      color: d3colors[0]
    }
  }, {
    x: x,
    y: obstructed,
    type: 'bar',
    name: 'obstructed',
    marker: {
      color: d3colors[1]
    }
  }]
  const lout = layout('Downtime', true)
  lout.yaxis = {
    range: [0, 1],
    showline: false,
    showgrid: false,
    fixedrange: true,
    tickvals: []
  }
  Plotly.newPlot('downtime', pdata, lout, config);
}


const renderSpeedTest = (data) => {
  if (data.speedtest.timestamp) {
    const hover = data.speedtest.timestamp.map((s, i) => [
      `ISP: ${data.speedtest.client[i].isp}`,
      `host: ${data.speedtest.server[i].sponsor} (${data.speedtest.server[i].name})`,
      `ping: ${data.speedtest.ping[i].toFixed(1)} ms`,
      `download: ${(data.speedtest.download[i] / 1e6).toFixed(0)} Mbps (rec: ${(data.speedtest.bytes_received[i] / 1e6).toFixed(0)} MB)`,
      `upload: ${(data.speedtest.upload[i] / 1e6).toFixed(0)} Mbps (sent: ${(data.speedtest.bytes_sent[i] / 1e6).toFixed(0)} MB)`
    ].join('<br>'))

    const x = data.speedtest.timestamp.map(ts => new Date(ts * 1000))
    const pdata = [{
      x: x,
      y: data.speedtest.download.map(d => d / 1e6),
      text: hover,
      hoverinfo: 'text',
      type: 'bar',
      name: 'download',
      marker: {
        color: d3colors[0]
      }
    }, {
      x: x,
      y: data.speedtest.upload.map(u => u / 1e6),
      hoverinfo: 'skip',
      type: 'bar',
      name: 'upload',
      marker: {
        color: d3colors[1],
      }
    }]
    const lout = layout('Speedtests (Mbps)', true)
    lout.hovermode = 'text'
    Plotly.newPlot('speedtests', pdata, lout, config);
  } else {
    // gracefully handle startup before first result is ready
    const lout = layout('Speedtests (Mbps)', true)
    lout.xaxis.zeroline = false
    lout.xaxis.tickmode = 'array'
    lout.xaxis.tickvals = []
    lout.xaxis.range = [0, 1]
    lout.yaxis.zeroline = false
    lout.yaxis.tickmode = 'array'
    lout.yaxis.tickvals = []
    lout.yaxis.range = [0, 1]
    lout.annotations = [{
      x: 0.1,
      y: 0.5,
      showarrow: false,
      text: 'Waiting...',
    }]
    Plotly.newPlot('speedtests', [], lout, config);
  }
}

const renderObstructionMap = (data) => {
  const obst = data.status.obstructionStats[data.status.obstructionStats.length - 1]
  const maxseen = obst.wedgeFractionObstructed.map((w, i) => {
    const vals = data.status.obstructionStats.map(r => r.wedgeFractionObstructed[i])
    return Math.max(...vals)
  })

  const pdata = [{
    type: 'scatterpolar',
    mode: 'lines',
    name: 'max',
    r: maxseen.map(w => [w, w]).reduce((l, r) => l.concat(r), []),
    theta: maxseen.map((w, i) => [i * 30 - 15, i * 30 + 15]).reduce((l, r) => l.concat(r), []),
    fill: 'toself',
    fillcolor: d3colors[0] + '88',
    line: {
      color: d3colors[0] + '88'
    }
  }, {
    type: 'scatterpolar',
    mode: 'lines',
    name: 'latest',
    r: obst.wedgeFractionObstructed.map(w => [w, w]).reduce((l, r) => l.concat(r), []),
    theta: obst.wedgeFractionObstructed.map((w, i) => [i * 30 - 15, i * 30 + 15]).reduce((l, r) => l.concat(r), []),
    fill: 'toself',
    fillcolor: d3colors[1] + '88',
    line: {
      color: d3colors[1] + '88'
    }
  }]

  const lout = {
    title: {
      text: 'Obstructions',
      font: {
        size: 18
      }
    },
    font: {
      color: 'white',
      size: document.body.clientWidth < 1000 ? 18 : 12
    },
    legend: {
      x: 1,
      xanchor: 'left',
      y: 0.9,
      bgcolor: '#fff0',
    },
    paper_bgcolor: '#fff0',
    polar: {
      bgcolor: '#fff0',
      radialaxis: {
        tickfont: {
          size: 12
        },
        angle: 45,
        visible: true,
        nticks: 7,
        range: [0, maxseen.reduce((l, r) => Math.max(l, r), 0.03)],
        fixedrange: true,
      },
      angularaxis: {
        tickfont: {
          size: 12
        },
        dtick: 45,
        tickmode: 'array',
        tickvals: [
          0, 45, 90, 135, 180, 225, 270, 315
        ],
        ticktext: [
          'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
        ],
        rotation: 90,
        direction: 'clockwise',
        fixedrange: true,
      }
    },
    autoscale: true,
    margin: { pad: 0, l: 0, r: 0, t: 50, b: 20, autoexpand: true },
    showlegend: true
  }

  Plotly.newPlot('obstructions', pdata, lout, config)
}

const triggerSpeedtest = () => {
  fetch('/api/trigger_speedtest')
  window.alert('Speedtest initiated')
}
