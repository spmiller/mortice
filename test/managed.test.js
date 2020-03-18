import test from 'ava'
import delay from 'delay'

const mortice = require('../')

test('should manage returned read mutexes', async (t) => {
  const name = 'aLock'

  const readLockRelease = await mortice.managed.readLock(name)
  const mutexAtFirstAccess = mortice(name);

  await readLockRelease();

  await mortice.managed.readLock(name)
  const mutexAtSecondAccess = mortice(name);

  t.true(mutexAtFirstAccess !== mutexAtSecondAccess)
})

test('should manage returned write mutexes', async (t) => {
  const name = 'bLock'

  const readLockRelease = await mortice.managed.writeLock(name)
  const mutexAtFirstAccess = mortice(name);

  await readLockRelease();

  await mortice.managed.readLock(name)
  const mutexAtSecondAccess = mortice(name);

  t.true(mutexAtFirstAccess !== mutexAtSecondAccess)
})

test('should manage multiple mutexes of same name', async (t) => {
  const name = "some lock"

  const indexes = Array.from({length: 100000})

  const mutexes = await Promise.all(indexes.map(() => new Promise(async resolve => {
    await delay(2000 + Math.random())
    const release = await mortice.managed.writeLock(name);
    const mutex = mortice(name);
    await release();
    resolve(mutex)
  })))

  const mutextDict = mutexes.map(m => m.id).reduce((dict, id) => {
    dict[id] = (dict[id] || 0) + 1;
    return dict;
  }, {})

  t.true(Object.keys(mutextDict).length > 1)
})

test('should manage multiple mutexes of different names', async (t) => {
  const indexes = Array.from({length: 100}, (v, i) => i).map(i => "lock" + i)

  await Promise.all(indexes.map(async name => {
    const release = await mortice.managed.readLock(name);
    await release();
  }))

  t.pass("No deadlocks occurred")
})

