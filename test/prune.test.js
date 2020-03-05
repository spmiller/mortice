import test from 'ava'

const mortice = require('../')

test('should prune references when it is idle', async (t) => {
  const name = 'aLock'
  const originalMutex = mortice(name)

  t.true(originalMutex === mortice(name))

  mortice.prune()

  t.true(originalMutex !== mortice(name))
})

test('should not prune references when it has pending read lock', async (t) => {
  const name = 'bLock'
  const firstMutex = mortice(name)

  const release = await firstMutex.readLock()

  mortice.prune()

  t.true(firstMutex === mortice(name))
  release()
})
