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

const layout = (title, showlegend = false, ymax = null) => {
  return {
    font: {
      color: 'white',
      size: singleColumnView() ? 24 : 12
    },
    paper_bgcolor: '#fff0',
    plot_bgcolor: '#fff0',
    xaxis: {
      nticks: 4,
      showline: false,
      showgrid: false,
      tickformat: '%-I:%M%p',
      fixedrange: true
    },
    yaxis: {
      nticks: 3,
      showline: false,
      gridcolor: '#ffffff30',
      hoverformat: '.1f',
      fixedrange: true,
      range: [0, ymax]
    },
    showlegend: showlegend,
    legend: {
      x: 1,
      xanchor: 'left',
      y: 0.9,
      bgcolor: '#fff0',
    },
    autoscale: true,
    margin: { pad: 0, l: 50, r: 10, t: 40, b: 40, autoexpand: true },
    barmode: 'grouped',
    title: {
      text: title,
      x: 0.02,
      xanchor: 'left',
      position: 'left',
      font: {
        size: singleColumnView() ? 24 : 18
      }
    }
  }
}

if (document.documentURI.indexOf('github.io') >= 0) {
  // load data from s3 for github pages
  fetch(
    document.documentURI.replace('app/static/', 'resources/sampledata.json')
  )
    .then(response => response.json())
    .then(data => {
      render(data)
    })

  // hide history selector - doesn't work
  document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('historyselect').style.visibility = 'hidden'
  })
}

const socket = io.connect()

socket.on('connect', function () {
  startBroadcast()
})

socket.on('message', function (data) {
  render(data)
})

const startBroadcast = () => {
  const history = document.getElementById('history')
  const secs = history ? parseInt(history.value) : 600
  socket.emit('start_broadcast', { secs_history: secs })
}


const render = (data) => {
  if (data.status) {
    const idx = data.status.deviceInfo.length - 1
    document.getElementById('lastupdate').innerHTML = 'Updated: ' + (new Date()).toLocaleTimeString()
    document.getElementById('uptime').innerHTML = 'Uptime: ' + (data.status.deviceState[idx].uptimeS / 3600).toFixed(1) + ' hours'
    document.getElementById('firmware').innerHTML = 'Firmware: ' + data.status.deviceInfo[idx].softwareVersion
  }

  // different layout for single vs 2 column views
  if (singleColumnView()) {
    renderThroughput(data, 'g1')
    renderPing(data, 'g2')
    renderPingDrop(data, 'g3')
    renderSpeedTest(data, 'g4')
  } else {
    renderPing(data, 'g1')
    renderThroughput(data, 'g2')
    renderPingDrop(data, 'g3')
    renderSpeedTest(data, 'g4')
  }
  renderObstructionMap(data)
}


const renderPing = (data, element) => {
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
  Plotly.newPlot(
    element,
    pdata,
    layout(
      'Ping (ms)',
      false,
      updateYmax('ping', data.starlink.popPingLatencyMs)
    ),
    config
  );
}


const renderPingDrop = (data, element) => {
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

  Plotly.newPlot(
    element,
    pdata,
    layout(
      'Ping drop (%)',
      false,
      updateYmax('pingdrop', y)
    ),
    config
  )
}


const renderThroughput = (data, element) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const y1 = data.starlink.downlinkThroughputBps.map(v => v / 1e6)
  const y2 = data.starlink.uplinkThroughputBps.map(v => v / 1e6)
  const pdata = [{
    x: x,
    y: y1,
    type: 'scatter',
    fill: 'tozeroy',
    name: 'download',
    hovertemplate: '%{y:.1f} Mbps',
    marker: {
      color: d3colors[0],
    }
  }, {
    x: x,
    y: y2,
    type: 'scatter',
    fill: 'tozeroy',
    name: 'upload',
    hovertemplate: '%{y:.1f} Mbps',
    marker: {
      color: d3colors[1],
    }
  }]

  Plotly.newPlot(
    element,
    pdata,
    layout(
      'Throughput (Mbps)',
      false,
      updateYmax('throughput', y1.concat(y2)),
    ),
    config
  )
}


const renderDowntime = (data, element) => {
  const x = data.starlink.timestamp.map(ts => new Date(ts * 1000))
  const planned = data.starlink.scheduled
    // fill missing data assuming service was planned
    .map(planned => planned === null ? true : planned)
    // raise flag when service is not planned (beta downtime)
    .map(planned => planned == 1 ? 0 : 1)
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
  const lout = layout('Downtime')
  lout.yaxis = {
    range: [0, 1],
    showline: false,
    showgrid: false,
    fixedrange: true,
    tickvals: []
  }
  Plotly.newPlot(element, pdata, lout, config);
}


const renderSpeedTest = (data, element) => {
  if (data.speedtest.timestamp) {
    const hover = data.speedtest.timestamp.map((s, i) => [
      `date: ${(new Date(s * 1000)).toLocaleString()}`,
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
      hoverlabel: {
        align: 'left',
        bgcolor: '#000',
        bordercolor: '#000',
        font: { color: 'white' }
      },
      type: 'scatter',
      fill: 'tozeroy',
      name: 'download',
      marker: {
        color: d3colors[0]
      }
    }, {
      x: x,
      y: data.speedtest.upload.map(d => d / 1e6),
      hoverinfo: 'skip',
      type: 'scatter',
      fill: 'tozeroy',
      name: 'upload',
      marker: {
        color: d3colors[1],
      }
    }]
    const lout = layout(
      'Speedtests (Mbps)',
      false,
      updateYmax('speedtests', pdata[0].y.concat(pdata[1].y))
    )
    lout.hovermode = 'text'
    Plotly.newPlot(element, pdata, lout, config);
  } else {
    // gracefully handle startup before first result is ready
    const lout = layout('Speedtests (Mbps)', false)
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
    Plotly.newPlot(element, [], lout, config);
  }

  // put the run speed test button under whichever element the speedtest
  // chart was drawn in
  document.getElementById(element).appendChild(
    document.getElementById('runspeedtest')
  )
}

const renderObstructionMap = (data) => {
  const colorscale = [
    [0, '#00000000'],  // Transparent for the value -1
    [0.5, '#c94842'],
    [1, '#5883a6']
  ];

  const obst = data.obstruction;
  const info = data.status.obstructionStats[0];

  const pdata = [{
    type: 'heatmap',
    x: Array.from({ length: obst.numCols }, (_, i) => i),
    y: Array.from({ length: obst.numRows }, (_, i) => i),
    z: Array.from({ length: obst.numRows }, (_, i) => obst.snr.slice(i * obst.numCols, (i + 1) * (obst.numCols))),
    zmin: -1,
    zmax: 1,
    colorscale: colorscale,
    showscale: false
  }]

  const lout = {
    xaxis: { autorange: 'reversed', mirror: true, linecolor: "#5883a690", tickvals: [] },
    yaxis: { mirror: true, linecolor: "#5883a690", tickvals: []},
    title: {
      text: 'Obstructions',
      // try to center title over the chart - the legend shifts the fig size
      xanchor: 'middle',
      x: 0.5,
      font: {
        size: 18,
        color: 'white'
      }
    },
    font: {
      color: 'white',
      size: singleColumnView() ? 18 : 12
    },
    paper_bgcolor: '#FFF0',
    plot_bgcolor: '#FFF0',
    autoscale: true,
    margin: { pad: 0, l: 20, r: 20, t: 30, b: 20, autoexpand: false },
    annotations: [
      {
        x: obst.numCols / 2,
        y: obst.numRows - 5,
        xref: 'x',
        yref: 'y',
        color: 'white',
        align: 'left',
        text: (info.avgProlongedObstructionDurationS > 0) ? `${(info.fractionObstructed * 100).toFixed(1)}% obstructed<br>Expect ${info.avgProlongedObstructionDurationS.toFixed(1)}s interruptions every ${(info.avgProlongedObstructionIntervalS / 60).toFixed(0)} minutes` : '',
        showarrow: false,
      }
    ]
  }

Plotly.newPlot('obstructions', pdata, lout, config);
}

const triggerSpeedtest = () => {
  fetch('/api/trigger_speedtest')

  if (singleColumnView()) {
    window.alert('Speedtest initiated')
  } else {
    // show alert, then fade out
    const modal = document.getElementById('speedtestmodal')
    modal.style.opacity = 1
    const fade = () => {
      modal.style.opacity *= 0.9
      if (modal.style.opacity < 0.2) {
        modal.style.opacity = 0
      } else {
        setTimeout(fade, 30)
      }
    }
    setTimeout(fade, 5000)
  }
}


const singleColumnView = () => {
  return document.body.clientWidth < 1000
}


// keep track of y max values for charts with dynamic ranges so that we
// don't bump the y axis limits with every refresh - use the max value observed
// in the last 100 refreshes
const yMaxHistLength = 10
const yMaxHist = {
  ping: [],
  pingdrop: [],
  throughput: [],
  speedtests: []
}

const updateYmax = (chart, yVals) => {
  yMaxHist[chart].unshift(Math.max(...yVals))
  yMaxHist[chart] = yMaxHist[chart].slice(0, yMaxHistLength)
  return Math.max(...yMaxHist[chart])
}
