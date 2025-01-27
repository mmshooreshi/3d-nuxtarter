// workers/slicerWorker.js
self.onmessage = (e) => {
    const { type, config, models } = e.data
    if (type === 'start') {
      // Fake a slicing process
      let progress = 0
      const totalLayers = 200
      const interval = setInterval(() => {
        progress += 10
        if (progress >= 100) {
          clearInterval(interval)
          self.postMessage({ 
            type: 'done', 
            data: {
              totalLayers,
              printTime: '2h 30m',
              resinUsage: 35
            }
          })
        } else {
          self.postMessage({ 
            type: 'progress', 
            data: { progress } 
          })
        }
      }, 500)
    }
  }
  