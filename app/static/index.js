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
      nticks: 6,
      tickformat: '%-I:%M%p',
      fixedrange: true
    },
    yaxis: {
      showline: false,
      showgrid: false,
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
        size: 24
      }
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
  const x = mostRecent(data.starlink12.timestamp).map(ts => new Date(ts * 1000))
  renderPing(data, x)
  renderPingDrop(data, x)
  renderSNR(data, x)
  renderThroughput(data, x)
  renderDowntime(data, x)
  renderSpeedTest(data)
  renderObstructionMap(data)
}


const renderPing = (data, x) => {
  const y = mostRecent(data.starlink12.popPingLatencyMs)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'ping',
    marker: {
      color: y,
      colorscale: 'Portland',
      cmin: 30,
      cmax: 120,
    }
  }]
  Plotly.newPlot('ping', pdata, layout('Ping (ms)'), config);
}


const renderSNR = (data, x) => {
  // offset (9.2 vs 9) is just to give the sparkline some thickness at 0
  const y = mostRecent(data.starlink12.snr).map(y => y - 9.2)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'SNR',
    marker: {
      color: y.map(y => -y),
      colorscale: 'Portland',
      cmin: 0,
      cmax: 10,
    },
  }]

  const lout = layout('SNR')
  lout.yaxis.range = [-10, 0]
  lout.yaxis.tickmode = 'array'
  lout.yaxis.tickvals = [0, -3, -6, -9]

  Plotly.newPlot('snr', pdata, lout, config);
}


const renderPingDrop = (data, x) => {
  const y = mostRecent(data.starlink12.popPingDropRate).map(v => v * 100)
  const pdata = [{
    x: x,
    y: y,
    type: 'bar',
    name: 'ping drop rate',
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


const renderThroughput = (data, x) => {
  const y1 = mostRecent(data.starlink12.downlinkThroughputBps).map(v => v / 1e6)
  const y2 = mostRecent(data.starlink12.uplinkThroughputBps).map(v => v / 1e6)
  const pdata = [{
    x: x,
    y: y1,
    type: 'bar',
    name: 'download',
    marker: {
      color: d3colors[0],
    }
  }, {
    x: x,
    y: y2,
    type: 'bar',
    name: 'upload',
    marker: {
      color: d3colors[1],
    }
  }]

  Plotly.newPlot('throughput', pdata, layout('Throughput (Mbps)', true), config);
}


const renderDowntime = (data, x) => {
  const planned = mostRecent(data.starlink12.scheduled.map(v => v === true ? 0 : 1), 'max')
  const obstructed = mostRecent(data.starlink12.obstructed.map(v => v === true ? 1 : 0), 'max')

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
  const pdata = [{
    x: data.speedtest.map(s => new Date(s.timestamp)),
    y: data.speedtest.map(s => s.download / 1e6),
    type: 'bar',
    name: 'download',
    marker: {
      color: d3colors[0]
    }
  }, {
    x: data.speedtest.map(s => new Date(s.timestamp)),
    y: data.speedtest.map(s => s.upload / 1e6),
    type: 'bar',
    name: 'upload',
    marker: {
      color: d3colors[1],
    }
  }]
  Plotly.newPlot('speedtests', pdata, layout('Speedtests (Mbps)', true), config);
}

const renderObstructionMap = (data) => {
  const obst = data.starlink[data.starlink.length - 1].obstructionStats
  const max24 = obst.wedgeFractionObstructed.map((w, i) => {
    const vals = data.starlink.map(r => r.obstructionStats.wedgeFractionObstructed[i])
    return vals.reduce((l, r) => Math.max(l, r), 0)
  })

  const pdata = [{
    type: 'scatterpolar',
    mode: 'lines',
    name: '24hr max',
    r: max24.map(w => [w, w]).reduce((l, r) => l.concat(r), []),
    theta: max24.map((w, i) => [i * 30 - 15, i * 30 + 15]).reduce((l, r) => l.concat(r), []),
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
        size: 24
      }
    },
    font: {
      color: 'white',
      size: document.body.clientWidth < 1000 ? 18 : 12
    },
    legend: {
      x: 0.9,
      xanchor: 'right',
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
        range: [0, max24.reduce((l, r) => Math.max(l, r), 0.03)],
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


const mostRecent = (array, smoothMethod = 'mean', targetLength = 1000) => {
  const records = parseInt(document.getElementById('history').value)
  return smooth(array.slice(-records), smoothMethod, targetLength)
}


const smooth = (array, method = 'mean', targetLength = 1000) => {
  // reduce array to indicated maximum length, using indicated aggregation method
  const rad = Math.round(array.length / targetLength)
  if (rad <= 1) {
    return array
  }

  return array.filter((v, i) => i % rad === 0).map((v, i) => {
    const vals = array.slice(Math.max(0, (i - 1) * rad), (i + 1) * rad + 1)
    if (vals.length > 0) {
      if (method === 'mean') {
        return vals.reduce((l, r) => l + r, 0) / vals.length
      } else if (method === 'median') {
        return vals.sort((a, b) => a < b ? 1 : -1)[Math.floor(vals.length / 2)]
      } else if (method === 'max') {
        return Math.max(...vals)
      } else if (method === 'min') {
        return Math.min(...vals)
      }
    }
    return undefined
  })
}

refresh()