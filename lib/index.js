const node = require('./node')
const browser = require('./browser')
const { default: Queue } = require('p-queue')
const { timeout } = require('promise-timeout')
const observe = require('observable-webworkers')

const masterQueues = {}
const readQueues = {}
let implementation

function createReleaseable (queue, options) {
  let res

  const p = new Promise((resolve) => {
    res = resolve
  })

  queue.add(() => timeout((() => {
    return new Promise((resolve) => {
      res(() => {
        resolve()
      })
    })
  })(), options.timeout))

  return p
}

const getMasterQueue = (name) => {
  if (!masterQueues[name]) {
    masterQueues[name] = new Queue({ concurrency: 1, autoStart: false })
  }
  return masterQueues[name]
}

const tryStartMasterQueue = (name) => {
  const masterQueue = masterQueues[name]
  if (masterQueue && masterQueue.isPaused) {
    masterQueue.onIdle()
      .then(() => {
        delete masterQueues[name]
      })
    masterQueue.start()
  }
}

const createMutex = (name, options) => {
  if (implementation.isWorker) {
    return {
      readLock: implementation.readLock(name, options),
      writeLock: implementation.writeLock(name, options)
    }
  }
  return {
    readLock: () => {
      // If there's already a read queue, just add the task to it
      if (readQueues[name]) {
        return createReleaseable(readQueues[name], options)
      }

      // Create a new read queue
      const localReadQueue = readQueues[name] = new Queue({
        concurrency: options.concurrency,
        autoStart: false
      })

      // Add the task to the read queue
      const readPromise = createReleaseable(readQueues[name], options)

      const masterQueue = getMasterQueue(name)
      masterQueue.add(() => {
        // Start the task only once the master queue has completed processing
        // any previous tasks
        localReadQueue.start()

        // Once all the tasks in the read queue have completed, remove it so
        // that the next read lock will occur after any write locks that were
        // started in the interim
        return localReadQueue.onIdle()
          .then(() => {
            if (readQueues[name] === localReadQueue) {
              delete readQueues[name]
            }
          })
      })
      tryStartMasterQueue(name)

      return readPromise
    },
    writeLock: () => {
      // Remove the read queue reference, so that any later read locks will be
      // added to a new queue that starts after this write lock has been
      // released
      delete readQueues[name]
      const masterQueue = getMasterQueue(name)
      const writePromise = createReleaseable(masterQueue, options)
      tryStartMasterQueue(name)
      return writePromise
    }
  }
}

const defaultOptions = {
  concurrency: Infinity,
  timeout: 84600000,
  global: global,
  singleProcess: false
}

module.exports = (name, options) => {
  if (!options) {
    options = {}
  }

  if (typeof name === 'object') {
    options = name
    name = 'lock'
  }

  if (!name) {
    name = 'lock'
  }

  options = Object.assign({}, defaultOptions, options)

  if (!implementation) {
    implementation = node(options) || browser(options)

    if (!implementation.isWorker) {
      // we are master, set up worker requests
      implementation.on('requestReadLock', (name, fn) => {
        createMutex(name, options)
          .readLock()
          .then(release => fn().finally(() => release()))
      })

      implementation.on('requestWriteLock', async (name, fn) => {
        createMutex(name, options)
          .writeLock()
          .then(release => fn().finally(() => release()))
      })
    }
  }

  return createMutex(name, options)
}

module.exports.Worker = function (script, Impl) {
  Impl = Impl || global.Worker
  let worker

  try {
    worker = new Impl(script)
  } catch (error) {
    if (error.message.includes('not a constructor')) {
      worker = Impl(script)
    }
  }

  if (!worker) {
    throw new Error('Could not create Worker from', Impl)
  }

  observe(worker)

  return worker
}
