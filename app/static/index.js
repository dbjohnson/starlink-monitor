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
}

const layout = (title, showlegend=false) => {
  return {
    font: {color: 'white'},
    paper_bgcolor: '#fff0',
    plot_bgcolor: '#fff0',
    xaxis: {
      tickformat: '%-I:%M%p'
    },
    yaxis: {
      showline: false,
      showgrid: false,
    },
    showlegend: showlegend,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.9,
      bgcolor: '#fff3',
    },
    autoscale: true,
    margin: {pad: 0, l: 30, r: 0, t: 40, b: 20, autoexpand: true},
    barmode: 'grouped',
    title: {
      text: title,
      x: 0.02,
      xanchor: 'left',
      position: 'left'
    }
  }
}


const refresh = () => {
  fetch('/api/data')
  .then(response => response.json())
  .then(data => {
    render(data)
    setTimeout(refresh, 3000)
  })
}


const render = (data) => {
  renderPing(data)
  renderPingDrop(data)
  renderSNR(data)
  renderThroughput(data)
  renderOutages(data)
  renderSpeedTest(data)
  renderObstructionMap(data)
}


const renderPing = (data) => {
  const x = mostRecent(data.starlink24.timestamp).map(ts => new Date(ts * 1000))
  const y = mostRecent(data.starlink24.popPingLatencyMs)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'ping',
    marker: {
      'color': y,
      'colorscale': 'Portland',
      'cmin': 30,
      'cmax': 120,
    }
  }]
  Plotly.newPlot('ping', pdata, layout('Ping'), config);
}

const renderSNR = (data) => {
  const x = mostRecent(data.starlink24.timestamp).map(ts => new Date(ts * 1000))
  const y = mostRecent(data.starlink24.snr)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'SNR',
    marker: {
      'color': y.map(y => 9 - y),
      'colorscale': 'Portland',
      'cmin': 0,
      'cmax': 9,
    }
  }]

  Plotly.newPlot('snr', pdata, layout('SNR'), config);
}


const renderPingDrop = (data) => {
  const x = mostRecent(data.starlink24.timestamp).map(ts => new Date(ts * 1000))
  const y = mostRecent(data.starlink24.popPingDropRate)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'ping drop rate',
    marker: {
      'color': y,
      'colorscale': 'Portland',
      'cmin': 0,
      'cmax': 1,
    }
  }]
  Plotly.newPlot('pingdrop', pdata, layout('Ping Drop'), config);
}


const renderThroughput = (data) => {
  const x = mostRecent(data.starlink24.timestamp).map(ts => new Date(ts * 1000))
  const y1 = mostRecent(data.starlink24.downlinkThroughputBps).map(v => v / 1e6)
  const y2 = mostRecent(data.starlink24.uplinkThroughputBps).map(v => v / 1e6)
  const pdata = [{
    x: x,
    y: y1,
    type: 'bar',
    name: 'download',
    marker: {
      'color': d3colors[0],
    }
  }, {
    x: x,
    y: y2,
    type: 'bar',
    name: 'upload',
    marker: {
      'color': d3colors[1],
    }
  }]

  Plotly.newPlot('throughput', pdata, layout('Throughput', true), config);
}


const renderOutages = (data) => {
  const x = mostRecent(data.starlink24.timestamp).map(ts => new Date(ts * 1000))
  const planned = mostRecent(data.starlink24.scheduled).map(v => v === true ? 0: 1)
  const obstructed = mostRecent(data.starlink24.obstructed).map(v => v === true ? 1: 0)
  const pdata = [{
    x: x,
    y: planned,
    type: 'bar',
    name: 'beta',
    marker: {
      'color': 'purple',
    }
  }, {
    x: x,
    y: obstructed,
    type: 'bar',
    name: 'obstructed',
    marker: {
      'color': 'red',
    }
  }]
  const lout = layout('Outages', true)
  lout.yaxis = {
    range:  [0, 1],
    showline: false,
    showgrid: false,
    tickvals: []
  }
  Plotly.newPlot('outages', pdata, lout, config);
}


const renderSpeedTest = (data) => {
  const pdata = [{
    x: data.speedtest.map(s => new Date(s.timestamp)),
    y: data.speedtest.map(s => s.download / 1e6),
    type: 'bar',
    name: 'download',
    marker: {
      'color': d3colors[0]
    }
  }, {
    x: data.speedtest.map(s => new Date(s.timestamp)),
    y: data.speedtest.map(s => s.upload / 1e6),
    type: 'bar',
    name: 'upload',
    marker: {
      'color': d3colors[1],
    }
  }]
  Plotly.newPlot('speedtests', pdata, layout('Speedtests', true), config);
}

const renderObstructionMap = (data) => {
  const obst = data.starlink[data.starlink.length - 1].obstructionStats
  const avg24 = obst.wedgeFractionObstructed.map((w, i) => {
    const vals = data.starlink.map(r => r.obstructionStats.wedgeFractionObstructed[i])
    return vals.reduce((l, r) => l + r, 0) / vals.length
  })

  const pdata = [{
    type: 'scatterpolar',
    mode: 'lines',
    name: '24hr avg',
    r: avg24.map(w => [w, w]).reduce((l, r) => l.concat(r), []),
    theta: avg24.map((w, i) => [i * 30 - 15, i * 30 + 15]).reduce((l, r) => l.concat(r), []),
    fill: 'toself',
    fillcolor: '#FF9B8888',
    line: {
      color: '#FF9B8888'
    }
  }, {
    type: 'scatterpolar',
    mode: 'lines',
    name: 'latest',
    r: obst.wedgeFractionObstructed.map(w => [w, w]).reduce((l, r) => l.concat(r), []),
    theta: obst.wedgeFractionObstructed.map((w, i) => [i * 30 - 15, i * 30 + 15]).reduce((l, r) => l.concat(r), []),
    fill: 'toself',
    fillcolor: '#709BFF88',
    line: {
      color: '#709BFF88'
    }
  }]

  const lout = {
    title: 'Obstructions',
    font: {color: 'white'},
    legend: {
      x: 0.9,
      xanchor: 'right',
      y: 0.9,
      bgcolor: '#fff3',
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
        range: [0, 0.1],
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
      }
    },
    autoscale: true,
    margin: {pad: 0, l: 0, r: 0, t: 50, b: 20, autoexpand: true},
    showlegend: true
  }

  Plotly.newPlot('obstructions', pdata, lout, config)
}


const mostRecent = (array) => {
  const records = parseInt(document.getElementById('history').value)
  return array.slice(-records)
}


const smooth = (array, rad, method='mean') => {
  if (rad <= 1) {
    return array
  }
  return array.map((v, i) => {
    const vals = array.slice(Math.max(0, i - rad), i + rad + 1).filter(v => v !== '')
    if (vals.length > 0) {
      if (method === 'mean') {
        // TODO: optimize calculation using one-pass cumulative sum, when performance
        // warrants the complexity
        return vals.reduce((l, r) => l + r) / vals.length
      } else if (method === 'median') {
        return vals.sort((a, b) => a < b ? 1 : -1)[Math.floor(vals.length / 2)]
      }
    }
    return undefined
  })
}

refresh()
